import { SyncAction, SyncActionType, Dream } from '../types';
import { logger } from './logger';

const SYNC_QUEUE_KEY = 'somnia_sync_queue';
const DREAMS_KEY = 'somnia_dreams';
const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 10000; // 10 second timeout to prevent hanging
const MAX_PENDING_ACTIONS = 100; // Prevent unbounded queue growth
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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

            // Store the new token
            localStorage.setItem('somnia_auth_token', refreshData.session.access_token);
            logger.log('[SyncService] Token refreshed successfully');
            return refreshData.session.access_token;
        }

        // Update stored token in case it was refreshed by Supabase
        localStorage.setItem('somnia_auth_token', session.access_token);
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

export const enqueueAction = (type: SyncActionType, payload: unknown) => {
    const queue = getSyncQueue();

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
 * Returns: 'success' | 'conflict_resolved' | 'error'
 */
const syncActionToBackend = async (action: SyncAction, token: string | null): Promise<'success' | 'conflict_resolved' | 'error'> => {
    // Check if Supabase is configured
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        // No backend configured - mark as synced (local-only mode)
        return 'success';
    }

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

export const processSyncQueue = async (): Promise<{ success: number; failed: number; conflictsResolved: number }> => {
    // Prevent concurrent queue processing which can cause UI blocking
    if (isProcessingQueue) {
        return { success: 0, failed: 0, conflictsResolved: 0 };
    }

    const queue = getSyncQueue();
    const pending = queue.filter(a => a.status === 'PENDING' && a.retryCount < MAX_RETRIES);

    if (pending.length === 0) return { success: 0, failed: 0, conflictsResolved: 0 };

    // Ensure we have a valid token before syncing (handles 8+ hour sleep expiry)
    const token = await ensureValidToken();
    if (!token && SUPABASE_URL && SUPABASE_ANON_KEY) {
        // Token refresh failed but Supabase is configured - defer sync
        logger.warn('[SyncService] No valid token for sync, will retry later');
        return { success: 0, failed: 0, conflictsResolved: 0 };
    }

    // Create abort controller for this sync session
    syncAbortController = new AbortController();
    isProcessingQueue = true;

    try {
        let successCount = 0;
        let failCount = 0;
        let conflictsResolved = 0;

        const updatedQueue = await Promise.all(queue.map(async (action) => {
            // Check if sync was aborted (user logged out)
            if (syncAbortController?.signal.aborted) {
                return action; // Return unchanged - don't process
            }

            if (action.status !== 'PENDING' || action.retryCount >= MAX_RETRIES) {
                // Mark as failed if max retries exceeded
                if (action.retryCount >= MAX_RETRIES && action.status === 'PENDING') {
                    return { ...action, status: 'FAILED' as const };
                }
                return action;
            }

            try {
                const result = await syncActionToBackend(action, token);
                if (result === 'conflict_resolved') {
                    // Server had newer version, local was updated
                    conflictsResolved++;
                    return { ...action, status: 'SYNCED' as const };
                }
                successCount++;
                return { ...action, status: 'SYNCED' as const };
            } catch (e) {
                // If aborted due to logout, don't retry or log as error
                if (e instanceof Error && (e.message.includes('aborted') || e.message.includes('Sync aborted'))) {
                    logger.log(`[SyncService] Sync aborted for action ${action.id}`);
                    return action; // Return unchanged
                }
                logger.error(`[SyncService] Failed to sync action ${action.id}:`, e);
                failCount++;
                return { ...action, retryCount: action.retryCount + 1 };
            }
        }));

        // Don't save queue if sync was aborted (user logged out - queue cleared by signOut)
        if (syncAbortController?.signal.aborted) {
            logger.log('[SyncService] Sync aborted, skipping queue save');
            return { success: successCount, failed: failCount, conflictsResolved };
        }

        // Cleanup: Keep last 100 synced items, remove older ones
        const synced = updatedQueue.filter(a => a.status === 'SYNCED');
        const nonSynced = updatedQueue.filter(a => a.status !== 'SYNCED');
        const recentSynced = synced.slice(-100);

        saveSyncQueue([...nonSynced, ...recentSynced]);

        return { success: successCount, failed: failCount, conflictsResolved };
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
