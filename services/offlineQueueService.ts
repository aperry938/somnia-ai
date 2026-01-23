/**
 * Offline Queue Service for Somnia.ai
 *
 * Queues AI analysis requests when the device is offline.
 * Automatically processes the queue when connectivity is restored.
 *
 * Features:
 * - Exponential backoff with jitter for retries
 * - Batch processing for memory efficiency
 * - Queue persistence across app restarts
 * - Rate limiting to prevent API overload
 * - Background processing when app is foregrounded
 *
 * Use case: User logs a dream in airplane mode, analysis runs when back online.
 */

import { logger } from './logger';

// Types
export interface QueuedAnalysis {
    dreamId: number;
    dreamText: string;
    queuedAt: number;
    retries: number;
    lastRetryAt?: number;
    priority?: 'high' | 'normal' | 'low';
}

export interface QueueProcessingResult {
    processed: number;
    succeeded: number;
    failed: number;
    rateLimited: number;
    remaining: number;
}

// Storage key
const QUEUE_STORAGE_KEY = 'somnia_offline_analysis_queue';
const MAX_RETRIES = 5;
const MAX_QUEUE_SIZE = 50; // Prevent unbounded queue growth
const BATCH_SIZE = 5; // Process in batches to prevent memory issues

// Exponential backoff configuration
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 300000; // 5 minutes max
const BACKOFF_MULTIPLIER = 2;

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
let requestTimestamps: number[] = [];

// Event for queue updates
const QUEUE_UPDATED_EVENT = 'offlineQueueUpdated';

// Processing state
let isProcessing = false;
let shouldAbortProcessing = false;
let processingCallback: ((dreamId: number, dreamText: string) => Promise<void>) | null = null;
let visibilityHandler: (() => void) | null = null;

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

/**
 * Check if an item is ready for retry based on backoff
 */
const isReadyForRetry = (item: QueuedAnalysis): boolean => {
    if (!item.lastRetryAt) return true;
    const backoffDelay = calculateBackoffDelay(item.retries);
    return Date.now() - item.lastRetryAt >= backoffDelay;
};

/**
 * Abort any in-progress queue processing.
 * Call this on logout to prevent cross-user data processing (ISS-007).
 */
export function abortOfflineQueueProcessing(): void {
    if (isProcessing) {
        logger.log('[OfflineQueue] Aborting queue processing due to logout');
        shouldAbortProcessing = true;
    }
}

/**
 * Get the current queue from localStorage
 */
function getQueue(): QueuedAnalysis[] {
    try {
        const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored) as QueuedAnalysis[];
    } catch {
        return [];
    }
}

/**
 * Save the queue to localStorage
 */
function saveQueue(queue: QueuedAnalysis[]): void {
    try {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
        window.dispatchEvent(new CustomEvent(QUEUE_UPDATED_EVENT, { detail: { count: queue.length } }));
    } catch (error) {
        logger.error('[OfflineQueue] Failed to save queue:', error);
    }
}

/**
 * Add a dream to the offline analysis queue
 */
export function queueForAnalysis(
    dreamId: number,
    dreamText: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
): void {
    const queue = getQueue();

    // Check if already queued
    if (queue.some(item => item.dreamId === dreamId)) {
        logger.info('[OfflineQueue] Dream already queued:', dreamId);
        return;
    }

    // Validate input
    if (!dreamId || typeof dreamId !== 'number') {
        logger.error('[OfflineQueue] Invalid dreamId:', dreamId);
        return;
    }

    if (!dreamText || typeof dreamText !== 'string' || dreamText.trim().length === 0) {
        logger.error('[OfflineQueue] Invalid dreamText for dream:', dreamId);
        return;
    }

    // Prevent unbounded queue growth
    if (queue.length >= MAX_QUEUE_SIZE) {
        // Remove lowest priority items first, then oldest
        const sortedByPriority = [...queue].sort((a, b) => {
            const priorityOrder = { high: 0, normal: 1, low: 2 };
            const aPriority = priorityOrder[a.priority || 'normal'];
            const bPriority = priorityOrder[b.priority || 'normal'];
            if (aPriority !== bPriority) return bPriority - aPriority;
            return a.queuedAt - b.queuedAt; // Oldest first if same priority
        });
        const removed = sortedByPriority.pop();
        if (removed) {
            logger.warn('[OfflineQueue] Queue full, removed dream:', removed.dreamId);
            const filteredQueue = queue.filter(item => item.dreamId !== removed.dreamId);
            saveQueue(filteredQueue);
        }
    }

    const updatedQueue = getQueue(); // Re-read after potential removal
    updatedQueue.push({
        dreamId,
        dreamText: dreamText.trim(),
        queuedAt: Date.now(),
        retries: 0,
        priority,
    });

    // Sort by priority (high first) then by queue time
    updatedQueue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const aPriority = priorityOrder[a.priority || 'normal'];
        const bPriority = priorityOrder[b.priority || 'normal'];
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.queuedAt - b.queuedAt;
    });

    saveQueue(updatedQueue);
    logger.info('[OfflineQueue] Queued dream for analysis:', dreamId, 'priority:', priority);
}

/**
 * Remove a dream from the queue (after successful analysis)
 */
export function removeFromQueue(dreamId: number): void {
    const queue = getQueue();
    const filtered = queue.filter(item => item.dreamId !== dreamId);
    saveQueue(filtered);
}

/**
 * Get the number of pending items in the queue
 */
export function getQueueLength(): number {
    return getQueue().length;
}

/**
 * Get queue statistics
 */
export function getQueueStats(): {
    total: number;
    readyForRetry: number;
    highPriority: number;
    failedItems: number;
} {
    const queue = getQueue();
    return {
        total: queue.length,
        readyForRetry: queue.filter(item => item.retries < MAX_RETRIES && isReadyForRetry(item)).length,
        highPriority: queue.filter(item => item.priority === 'high').length,
        failedItems: queue.filter(item => item.retries >= MAX_RETRIES).length,
    };
}

/**
 * Check if a dream is in the queue
 */
export function isQueued(dreamId: number): boolean {
    return getQueue().some(item => item.dreamId === dreamId);
}

/**
 * Process a single batch of items
 */
async function processBatch(items: QueuedAnalysis[]): Promise<{
    succeeded: number;
    failed: number;
    rateLimited: number;
}> {
    let succeeded = 0;
    let failed = 0;
    let rateLimited = 0;

    for (const item of items) {
        // Check abort flag
        if (shouldAbortProcessing) {
            break;
        }

        // Check if ready for retry
        if (!isReadyForRetry(item)) {
            continue;
        }

        // Check rate limiting
        if (!canMakeRequest()) {
            rateLimited++;
            const waitTime = getTimeUntilRateLimitReset();
            logger.info(`[OfflineQueue] Rate limited, waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
        }

        // Double-check we're still online
        if (!navigator.onLine) {
            logger.info('[OfflineQueue] Lost connection during batch processing');
            break;
        }

        try {
            recordRequest();

            if (!processingCallback) {
                throw new Error('No processing callback registered');
            }

            await processingCallback(item.dreamId, item.dreamText);

            // Check abort flag again after async operation
            if (shouldAbortProcessing) {
                break;
            }

            removeFromQueue(item.dreamId);
            succeeded++;
            logger.info('[OfflineQueue] Successfully processed dream:', item.dreamId);
        } catch (error) {
            // Don't update queue if aborted
            if (shouldAbortProcessing) {
                break;
            }

            logger.error('[OfflineQueue] Failed to process dream:', item.dreamId, error);
            failed++;

            // Update retry count and last retry time
            const currentQueue = getQueue();
            const itemIndex = currentQueue.findIndex(q => q.dreamId === item.dreamId);
            const queuedItem = currentQueue[itemIndex];

            if (itemIndex !== -1 && queuedItem) {
                queuedItem.retries++;
                queuedItem.lastRetryAt = Date.now();

                // Remove if max retries exceeded
                if (queuedItem.retries >= MAX_RETRIES) {
                    logger.warn('[OfflineQueue] Max retries exceeded, removing dream:', item.dreamId);
                    currentQueue.splice(itemIndex, 1);
                }

                saveQueue(currentQueue);
            }

            // Apply exponential backoff before next item
            const backoffDelay = calculateBackoffDelay(item.retries);
            logger.info(`[OfflineQueue] Backoff delay: ${backoffDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, Math.min(backoffDelay, 5000))); // Cap wait between items
        }
    }

    return { succeeded, failed, rateLimited };
}

/**
 * Process the offline queue in batches
 */
async function processQueue(): Promise<QueueProcessingResult> {
    if (isProcessing || !processingCallback) {
        return { processed: 0, succeeded: 0, failed: 0, rateLimited: 0, remaining: getQueueLength() };
    }

    if (!navigator.onLine) {
        return { processed: 0, succeeded: 0, failed: 0, rateLimited: 0, remaining: getQueueLength() };
    }

    const queue = getQueue();
    const eligibleItems = queue.filter(item => item.retries < MAX_RETRIES && isReadyForRetry(item));

    if (eligibleItems.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0, rateLimited: 0, remaining: queue.length };
    }

    isProcessing = true;
    shouldAbortProcessing = false;
    logger.info(`[OfflineQueue] Processing ${eligibleItems.length} eligible items in batches of ${BATCH_SIZE}`);

    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalRateLimited = 0;
    let totalProcessed = 0;

    // Process in batches
    for (let i = 0; i < eligibleItems.length; i += BATCH_SIZE) {
        if (shouldAbortProcessing || !navigator.onLine) {
            break;
        }

        const batch = eligibleItems.slice(i, i + BATCH_SIZE);
        const result = await processBatch(batch);

        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
        totalRateLimited += result.rateLimited;
        totalProcessed += batch.length;

        // Small pause between batches to prevent overwhelming the system
        if (i + BATCH_SIZE < eligibleItems.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    isProcessing = false;
    shouldAbortProcessing = false;

    const remaining = getQueueLength();
    logger.info(`[OfflineQueue] Processing complete: ${totalSucceeded} succeeded, ${totalFailed} failed, ${remaining} remaining`);

    return {
        processed: totalProcessed,
        succeeded: totalSucceeded,
        failed: totalFailed,
        rateLimited: totalRateLimited,
        remaining,
    };
}

/**
 * Initialize the offline queue service
 * Must be called at app startup with a callback to process queued dreams
 *
 * @param callback Function to call for each queued dream (should trigger analysis)
 */
export function initializeOfflineQueue(
    callback: (dreamId: number, dreamText: string) => Promise<void>
): () => void {
    processingCallback = callback;

    // Handle coming back online
    const handleOnline = () => {
        logger.info('[OfflineQueue] Device online, processing queue');
        // Delay to let network stabilize
        setTimeout(() => {
            processQueue().catch(err => {
                logger.error('[OfflineQueue] Error processing queue:', err);
            });
        }, 2000);
    };

    // Handle visibility change - process queue when app is foregrounded
    visibilityHandler = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
            logger.info('[OfflineQueue] App foregrounded, checking queue');
            setTimeout(() => {
                processQueue().catch(err => {
                    logger.error('[OfflineQueue] Error processing queue on foreground:', err);
                });
            }, 1000);
        }
    };

    // Listen for events
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', visibilityHandler);

    // Process any existing queue on startup (if online)
    if (navigator.onLine) {
        setTimeout(() => {
            processQueue().catch(err => {
                logger.error('[OfflineQueue] Error processing queue on init:', err);
            });
        }, 3000);
    }

    // Return cleanup function
    return () => {
        window.removeEventListener('online', handleOnline);
        if (visibilityHandler) {
            document.removeEventListener('visibilitychange', visibilityHandler);
        }
        processingCallback = null;
        visibilityHandler = null;
    };
}

/**
 * Force process the queue now (manual trigger)
 */
export async function forceProcessQueue(): Promise<QueueProcessingResult> {
    if (!navigator.onLine) {
        return { processed: 0, succeeded: 0, failed: 0, rateLimited: 0, remaining: getQueueLength() };
    }
    return processQueue();
}

/**
 * Subscribe to queue updates
 */
export function onQueueUpdate(callback: (count: number) => void): () => void {
    const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ count: number }>;
        callback(customEvent.detail.count);
    };

    window.addEventListener(QUEUE_UPDATED_EVENT, handler);
    return () => window.removeEventListener(QUEUE_UPDATED_EVENT, handler);
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Clear the entire queue (for debugging/testing)
 */
export function clearQueue(): void {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(QUEUE_UPDATED_EVENT, { detail: { count: 0 } }));
}

/**
 * Retry all failed items (reset their retry count)
 */
export function retryFailedItems(): void {
    const queue = getQueue();
    const updated = queue.map(item => {
        if (item.retries >= MAX_RETRIES) {
            return { ...item, retries: 0, lastRetryAt: undefined };
        }
        return item;
    });
    saveQueue(updated);
    logger.info('[OfflineQueue] Reset retry count for failed items');

    // Trigger processing if online
    if (navigator.onLine) {
        setTimeout(() => {
            processQueue().catch(err => {
                logger.error('[OfflineQueue] Error processing queue after retry reset:', err);
            });
        }, 1000);
    }
}

/**
 * Export queue data (for debugging)
 */
export function exportQueueData(): QueuedAnalysis[] {
    return getQueue();
}
