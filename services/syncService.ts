import { SyncAction, SyncActionType, Dream } from '../types';
import { logger } from './logger';

const SYNC_QUEUE_KEY = 'somnia_sync_queue';
const DREAMS_KEY = 'somnia_dreams';
const MAX_RETRIES = 5;
const FETCH_TIMEOUT_MS = 10000; // 10 second timeout to prevent hanging
const MAX_PENDING_ACTIONS = 100; // Prevent unbounded queue growth
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Exponential backoff configuration
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60000; // Cap at 1 minute
const BACKOFF_MULTIPLIER = 2;

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 30;
let requestTimestamps: number[] = [];

// Background sync configuration
let backgroundSyncEnabled = true;
let visibilityChangeHandler: (() => void) | null = null;

/**
 * Calculate exponential backoff delay with jitter
 */
const calculateBackoffDelay = (retryCount: number): number => {
    const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount);
    const cappedDelay = Math.min(exponentialDelay, MAX_RETRY_DELAY_MS);
    // Add random jitter (0-25% of delay) to prevent thundering herd
    const jitter = cappedDelay * Math.random() * 0.25;
    return Math.floor(cappedDelay + jitter);
};

/**
 * Check if we can make a request (rate limiting)
 */
const canMakeRequest = (): boolean => {
    const now = Date.now();
    // Remove timestamps outside the window
    requestTimestamps = requestTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    return requestTimestamps.length < MAX_REQUESTS_PER_WINDOW;
};

/**
 * Record a request for rate limiting
 */
const recordRequest = (): void => {
    requestTimestamps.push(Date.now());
};

/**
 * Get time until rate limit resets
 */
const getTimeUntilRateLimitReset = (): number => {
    if (requestTimestamps.length === 0) return 0;
    const oldestRequest = Math.min(...requestTimestamps);
    return Math.max(0, RATE_LIMIT_WINDOW_MS - (Date.now() - oldestRequest));
};

// Lock to prevent concurrent queue processing
let isProcessingQueue = false;

// Abort controller for canceling in-flight sync operations on logout
let syncAbortController: AbortController | null = null;

/**
 * Abort all in-flight sync operations.
 * Call this on logout to prevent cross-user data syncing.
 */
export const abortSync = (): void => {
    if (syncAbortController) {
        logger.log('[SyncService] Aborting all in-flight sync operations');
        syncAbortController.abort();
        syncAbortController = null;
    }
    isProcessingQueue = false;
};

/**
 * Validate sync action payload before sending
 */
const validateSyncPayload = (action: SyncAction): { valid: boolean; error?: string } => {
    if (!action.id || typeof action.id !== 'string') {
        return { valid: false, error: 'Invalid action ID' };
    }
    if (!action.type) {
        return { valid: false, error: 'Missing action type' };
    }
    if (action.payload === undefined || action.payload === null) {
        return { valid: false, error: 'Missing payload' };
    }
    if (!action.timestamp || typeof action.timestamp !== 'number') {
        return { valid: false, error: 'Invalid timestamp' };
    }

    // Type-specific validation
    const payload = action.payload as Record<string, unknown>;
    switch (action.type) {
        case 'ADD_DREAM':
        case 'UPDATE_DREAM':
            if (!payload.dreamText && !payload.dream_text) {
                return { valid: false, error: 'Dream must have text content' };
            }
            break;
        case 'DELETE_DREAM':
            if (!payload.id && !payload.dreamId) {
                return { valid: false, error: 'Delete action must have dream ID' };
            }
            break;
    }

    return { valid: true };
};

/**
 * Initialize background sync on page visibility changes
 */
export const initializeBackgroundSync = (): (() => void) => {
    if (typeof document === 'undefined') {
        return () => {};
    }

    visibilityChangeHandler = () => {
        if (document.visibilityState === 'visible' && backgroundSyncEnabled && navigator.onLine) {
            logger.log('[SyncService] App foregrounded, checking for pending syncs');
            // Small delay to let app stabilize
            setTimeout(() => {
                processSyncQueue().catch((err) => {
                    logger.error('[SyncService] Background sync failed:', err);
                });
            }, 1000);
        }
    };

    document.addEventListener('visibilitychange', visibilityChangeHandler);

    // Return cleanup function
    return () => {
        if (visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', visibilityChangeHandler);
            visibilityChangeHandler = null;
        }
    };
};

/**
 * Enable or disable background sync
 */
export const setBackgroundSyncEnabled = (enabled: boolean): void => {
    backgroundSyncEnabled = enabled;
    logger.log(`[SyncService] Background sync ${enabled ? 'enabled' : 'disabled'}`);
};

// Conflict response from server
interface ConflictResponse {
    conflict: true;
    serverVersion: {
        id: number;
        updated_at: string;
        dream_text: string;
        title: string;
        sleep_quality: number | null;
        tags: string[];
        mood: string | null;
    };
    message: string;
}

// Event for notifying UI about sync conflicts
export const emitSyncConflictResolved = (dreamId: number, resolution: 'server' | 'client') => {
    window.dispatchEvent(new CustomEvent('syncConflictResolved', {
        detail: { dreamId, resolution }
    }));
};

/**
 * Ensure we have a valid auth token before syncing.
 * Tokens can expire during 8+ hour sleep sessions, causing data loss.
 * This function refreshes the token if needed.
 *
 * SECURITY NOTE: We rely on Supabase's built-in session management which
 * stores tokens securely. We don't store tokens separately in localStorage
 * to avoid duplicate storage and potential security issues.
 */
async function ensureValidToken(): Promise<string | null> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return null; // No Supabase configured
    }

    // Dynamic import to avoid circular dependencies, reuse singleton from authService
    const { supabase } = await import('./authService');

    if (!supabase) {
        return null; // Supabase not configured
    }

    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            // Try to refresh the session
            logger.log('[SyncService] Session expired or missing, attempting refresh...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError || !refreshData.session) {
                logger.warn('[SyncService] Token refresh failed, will retry later');
                return null;
            }

            // SECURITY: Let Supabase manage token storage internally
            // Don't duplicate tokens in localStorage
            logger.log('[SyncService] Token refreshed successfully');
            return refreshData.session.access_token;
        }

        // SECURITY: Return token directly from session, don't store in localStorage
        return session.access_token;
    } catch (e) {
        logger.error('[SyncService] Error checking/refreshing token:', e);
        return null;
    }
}

export const getSyncQueue = (): SyncAction[] => {
    try {
        const item = localStorage.getItem(SYNC_QUEUE_KEY);
        return item ? JSON.parse(item) : [];
    } catch {
        return [];
    }
};

export const saveSyncQueue = (queue: SyncAction[]) => {
    try {
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch {
        // Silently fail if storage unavailable or quota exceeded
    }
};

/**
 * Clear the sync queue completely.
 * SECURITY: Call this on logout to prevent cross-user data exposure (ISS-006).
 */
export const clearSyncQueue = (): void => {
    try {
        localStorage.removeItem(SYNC_QUEUE_KEY);
    } catch {
        // Silently fail
    }
};

/**
 * Check if a similar action already exists in the queue (deduplication)
 */
const isDuplicateAction = (queue: SyncAction[], type: SyncActionType, payload: unknown): boolean => {
    const payloadObj = payload as Record<string, unknown>;
    const entityId = payloadObj?.id ?? payloadObj?.dreamId ?? payloadObj?.alarmId;

    if (!entityId) return false;

    // Check for pending actions with same type and entity ID
    return queue.some(action => {
        if (action.status !== 'PENDING') return false;
        if (action.type !== type) return false;

        const existingPayload = action.payload as Record<string, unknown>;
        const existingId = existingPayload?.id ?? existingPayload?.dreamId ?? existingPayload?.alarmId;

        // For ADD actions, never dedupe - each add should be synced
        if (type.startsWith('ADD_')) return false;

        // For UPDATE/DELETE, check if same entity ID
        return entityId === existingId;
    });
};

export const enqueueAction = (type: SyncActionType, payload: unknown) => {
    const queue = getSyncQueue();

    // Deduplication: Skip if similar action already pending
    // This prevents duplicate syncs from rapid UI interactions
    if (isDuplicateAction(queue, type, payload)) {
        logger.log(`[SyncService] Skipping duplicate ${type} action`);

        // For UPDATE actions, replace the old payload with the new one
        // This ensures the latest state is synced
        const payloadObj = payload as Record<string, unknown>;
        const entityId = payloadObj?.id ?? payloadObj?.dreamId ?? payloadObj?.alarmId;

        if (type.includes('UPDATE') && entityId) {
            const existingIndex = queue.findIndex(action => {
                if (action.status !== 'PENDING' || action.type !== type) return false;
                const existingPayload = action.payload as Record<string, unknown>;
                const existingId = existingPayload?.id ?? existingPayload?.dreamId ?? existingPayload?.alarmId;
                return existingId === entityId;
            });

            if (existingIndex !== -1) {
                queue[existingIndex] = {
                    ...queue[existingIndex]!,
                    payload,
                    timestamp: Date.now(),
                };
                saveSyncQueue(queue);
            }
        }
        return;
    }

    // Prevent unbounded queue growth - remove oldest pending actions if at limit
    const pendingCount = queue.filter(a => a.status === 'PENDING').length;
    if (pendingCount >= MAX_PENDING_ACTIONS) {
        logger.warn('[SyncService] Queue full, removing oldest pending action');
        const oldestPendingIndex = queue.findIndex(a => a.status === 'PENDING');
        if (oldestPendingIndex !== -1) {
            queue.splice(oldestPendingIndex, 1);
        }
    }

    const newAction: SyncAction = {
        id: crypto.randomUUID(),
        type,
        payload,
        timestamp: Date.now(),
        status: 'PENDING',
        retryCount: 0
    };
    queue.push(newAction);
    saveSyncQueue(queue);

    // Trigger sync if online
    if (navigator.onLine) {
        processSyncQueue().catch((err) => {
            logger.error('[SyncService] Failed to process sync queue:', err);
        });
    }
};

/**
 * Fetch with timeout to prevent hanging on CORS/network errors.
 * Also respects the global sync abort controller for logout handling.
 */
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
    // Check if sync was aborted before starting
    if (syncAbortController?.signal.aborted) {
        throw new Error('Sync aborted');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Also abort if global sync abort is triggered
    const abortHandler = () => controller.abort();
    syncAbortController?.signal.addEventListener('abort', abortHandler);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
        syncAbortController?.signal.removeEventListener('abort', abortHandler);
    }
};

/**
 * Handle sync conflict by updating local dream with server version
 */
const handleSyncConflict = (conflictData: ConflictResponse, _action: SyncAction): void => {
    const { serverVersion } = conflictData;
    const dreamId = serverVersion.id;

    logger.log(`[SyncService] Conflict detected for dream ${dreamId}, server version is newer`);

    try {
        // Load current dreams from localStorage
        const dreamsJson = localStorage.getItem(DREAMS_KEY);
        if (!dreamsJson) return;

        const dreams: Dream[] = JSON.parse(dreamsJson);
        const dreamIndex = dreams.findIndex(d => d.id === dreamId);

        if (dreamIndex === -1) {
            logger.warn(`[SyncService] Dream ${dreamId} not found in local storage during conflict resolution`);
            return;
        }

        const existingDream = dreams[dreamIndex];
        if (!existingDream) {
            logger.warn(`[SyncService] Dream at index ${dreamIndex} is undefined`);
            return;
        }

        // Update local dream with server version
        // Note: server returns mood as string | null, but Dream.mood is DreamMood | undefined
        const updatedDream: Dream = {
            ...existingDream,
            dreamText: serverVersion.dream_text,
            title: serverVersion.title,
            sleepQuality: serverVersion.sleep_quality,
            tags: serverVersion.tags,
            mood: serverVersion.mood ? (serverVersion.mood as Dream['mood']) : undefined,
        };

        dreams[dreamIndex] = updatedDream;
        localStorage.setItem(DREAMS_KEY, JSON.stringify(dreams));

        // Notify UI that conflict was resolved with server version
        emitSyncConflictResolved(dreamId, 'server');

        logger.log(`[SyncService] Conflict resolved: updated local dream ${dreamId} with server version`);
    } catch (e) {
        logger.error('[SyncService] Error handling sync conflict:', e);
    }
};

/**
 * Sync a single action to the backend
 * Returns: 'success' | 'conflict_resolved' | 'error' | 'rate_limited' | 'validation_failed'
 */
const syncActionToBackend = async (action: SyncAction, token: string | null): Promise<'success' | 'conflict_resolved' | 'error' | 'rate_limited' | 'validation_failed'> => {
    // Check if Supabase is configured
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        // No backend configured - mark as synced (local-only mode)
        return 'success';
    }

    // Validate payload before sending
    const validation = validateSyncPayload(action);
    if (!validation.valid) {
        logger.warn(`[SyncService] Validation failed for action ${action.id}: ${validation.error}`);
        return 'validation_failed';
    }

    // Check rate limiting
    if (!canMakeRequest()) {
        const waitTime = getTimeUntilRateLimitReset();
        logger.warn(`[SyncService] Rate limited, next request allowed in ${waitTime}ms`);
        return 'rate_limited';
    }

    // Record request for rate limiting
    recordRequest();

    try {
        const response = await fetchWithTimeout(
            `${SUPABASE_URL}/functions/v1/sync`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                    actionId: action.id,
                    actionType: action.type,
                    payload: action.payload,
                    timestamp: action.timestamp,
                }),
            },
            FETCH_TIMEOUT_MS
        );

        // Handle 409 Conflict - server has newer version
        if (response.status === 409) {
            try {
                const conflictData: ConflictResponse = await response.json();
                if (conflictData.conflict) {
                    handleSyncConflict(conflictData, action);
                    // Mark as resolved - don't retry, local was updated with server version
                    return 'conflict_resolved';
                }
            } catch (parseError) {
                logger.error('[SyncService] Failed to parse 409 conflict response:', parseError);
            }
            throw new Error('Sync conflict: server has newer version');
        }

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Sync failed: ${response.status} - ${error}`);
        }

        return 'success';
    } catch (error) {
        // Re-throw with more context for debugging
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                // Check if this was a logout abort vs. timeout
                if (syncAbortController?.signal.aborted) {
                    throw new Error('Sync aborted due to logout');
                }
                throw new Error(`Sync timed out after ${FETCH_TIMEOUT_MS}ms`);
            }
            if (error.message === 'Sync aborted') {
                throw error; // Re-throw abort errors as-is
            }
            // Network/CORS errors will be TypeErrors with "Failed to fetch"
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error (possibly CORS) - sync will retry later');
            }
        }
        throw error;
    }
};

export const processSyncQueue = async (): Promise<{ success: number; failed: number; conflictsResolved: number; rateLimited: number; validationFailed: number }> => {
    // Prevent concurrent queue processing which can cause UI blocking
    if (isProcessingQueue) {
        return { success: 0, failed: 0, conflictsResolved: 0, rateLimited: 0, validationFailed: 0 };
    }

    const queue = getSyncQueue();
    const pending = queue.filter(a => a.status === 'PENDING' && a.retryCount < MAX_RETRIES);

    if (pending.length === 0) return { success: 0, failed: 0, conflictsResolved: 0, rateLimited: 0, validationFailed: 0 };

    // Ensure we have a valid token before syncing (handles 8+ hour sleep expiry)
    const token = await ensureValidToken();
    if (!token && SUPABASE_URL && SUPABASE_ANON_KEY) {
        // Token refresh failed but Supabase is configured - defer sync
        logger.warn('[SyncService] No valid token for sync, will retry later');
        return { success: 0, failed: 0, conflictsResolved: 0, rateLimited: 0, validationFailed: 0 };
    }

    // Create abort controller for this sync session
    syncAbortController = new AbortController();
    isProcessingQueue = true;

    try {
        let successCount = 0;
        let failCount = 0;
        let conflictsResolved = 0;
        let rateLimitedCount = 0;
        let validationFailedCount = 0;

        // Process sequentially to respect rate limiting and implement proper backoff
        const updatedQueue: SyncAction[] = [];

        for (const action of queue) {
            // Check if sync was aborted (user logged out)
            if (syncAbortController?.signal.aborted) {
                updatedQueue.push(action);
                continue;
            }

            if (action.status !== 'PENDING' || action.retryCount >= MAX_RETRIES) {
                // Mark as failed if max retries exceeded
                if (action.retryCount >= MAX_RETRIES && action.status === 'PENDING') {
                    updatedQueue.push({ ...action, status: 'FAILED' as const });
                } else {
                    updatedQueue.push(action);
                }
                continue;
            }

            try {
                const result = await syncActionToBackend(action, token);

                if (result === 'conflict_resolved') {
                    conflictsResolved++;
                    updatedQueue.push({ ...action, status: 'SYNCED' as const });
                } else if (result === 'rate_limited') {
                    rateLimitedCount++;
                    // Don't increment retry count for rate limiting - just skip for now
                    updatedQueue.push(action);
                    // Wait for rate limit window to reset before continuing
                    const waitTime = getTimeUntilRateLimitReset();
                    if (waitTime > 0) {
                        logger.log(`[SyncService] Waiting ${waitTime}ms for rate limit reset`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                } else if (result === 'validation_failed') {
                    validationFailedCount++;
                    // Mark validation failures as failed immediately - don't retry
                    updatedQueue.push({ ...action, status: 'FAILED' as const });
                } else {
                    successCount++;
                    updatedQueue.push({ ...action, status: 'SYNCED' as const });
                }
            } catch (e) {
                // If aborted due to logout, don't retry or log as error
                if (e instanceof Error && (e.message.includes('aborted') || e.message.includes('Sync aborted'))) {
                    logger.log(`[SyncService] Sync aborted for action ${action.id}`);
                    updatedQueue.push(action);
                    continue;
                }

                logger.error(`[SyncService] Failed to sync action ${action.id}:`, e);
                failCount++;
                const newRetryCount = action.retryCount + 1;
                updatedQueue.push({ ...action, retryCount: newRetryCount });

                // Apply exponential backoff before next action
                if (newRetryCount < MAX_RETRIES) {
                    const backoffDelay = calculateBackoffDelay(newRetryCount);
                    logger.log(`[SyncService] Backoff delay: ${backoffDelay}ms before next action`);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                }
            }
        }

        // Don't save queue if sync was aborted (user logged out - queue cleared by signOut)
        if (syncAbortController?.signal.aborted) {
            logger.log('[SyncService] Sync aborted, skipping queue save');
            return { success: successCount, failed: failCount, conflictsResolved, rateLimited: rateLimitedCount, validationFailed: validationFailedCount };
        }

        // Cleanup: Keep last 100 synced items, remove older ones
        const synced = updatedQueue.filter(a => a.status === 'SYNCED');
        const nonSynced = updatedQueue.filter(a => a.status !== 'SYNCED');
        const recentSynced = synced.slice(-100);

        saveSyncQueue([...nonSynced, ...recentSynced]);

        return { success: successCount, failed: failCount, conflictsResolved, rateLimited: rateLimitedCount, validationFailed: validationFailedCount };
    } finally {
        syncAbortController = null;
        isProcessingQueue = false;
    }
};

export const getPendingCount = (): number => {
    return getSyncQueue().filter(a => a.status === 'PENDING').length;
};

export const getFailedCount = (): number => {
    return getSyncQueue().filter(a => a.status === 'FAILED').length;
};

export const retryFailedActions = (): void => {
    const queue = getSyncQueue();
    const updated = queue.map(a =>
        a.status === 'FAILED' ? { ...a, status: 'PENDING' as const, retryCount: 0 } : a
    );
    saveSyncQueue(updated);
    processSyncQueue().catch((err) => {
        logger.error('[SyncService] Failed to retry sync queue:', err);
    });
};

// Listen for online/offline events
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        // Retry failed actions first (resets FAILED → PENDING), then process all pending
        // This ensures users don't have permanently stuck syncs after network issues
        retryFailedActions();
    });
}
