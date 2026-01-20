/**
 * Offline Queue Service for Somnia.ai
 *
 * Queues AI analysis requests when the device is offline.
 * Automatically processes the queue when connectivity is restored.
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
}

// Storage key
const QUEUE_STORAGE_KEY = 'somnia_offline_analysis_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const MAX_QUEUE_SIZE = 50; // Prevent unbounded queue growth

// Event for queue updates
const QUEUE_UPDATED_EVENT = 'offlineQueueUpdated';

// Processing state
let isProcessing = false;
let processingCallback: ((dreamId: number, dreamText: string) => Promise<void>) | null = null;

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
export function queueForAnalysis(dreamId: number, dreamText: string): void {
    const queue = getQueue();

    // Check if already queued
    if (queue.some(item => item.dreamId === dreamId)) {
        logger.info('[OfflineQueue] Dream already queued:', dreamId);
        return;
    }

    // Prevent unbounded queue growth
    if (queue.length >= MAX_QUEUE_SIZE) {
        logger.warn('[OfflineQueue] Queue full, removing oldest item to make room');
        queue.shift(); // Remove oldest item
    }

    queue.push({
        dreamId,
        dreamText,
        queuedAt: Date.now(),
        retries: 0,
    });

    saveQueue(queue);
    logger.info('[OfflineQueue] Queued dream for analysis:', dreamId);
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
 * Check if a dream is in the queue
 */
export function isQueued(dreamId: number): boolean {
    return getQueue().some(item => item.dreamId === dreamId);
}

/**
 * Process the offline queue
 * Calls the provided callback for each queued dream
 */
async function processQueue(): Promise<void> {
    if (isProcessing || !processingCallback) return;
    if (!navigator.onLine) return;

    const queue = getQueue();
    if (queue.length === 0) return;

    isProcessing = true;
    logger.info(`[OfflineQueue] Processing ${queue.length} queued analyses`);

    for (const item of queue) {
        // Double-check we're still online
        if (!navigator.onLine) {
            logger.info('[OfflineQueue] Lost connection, pausing queue processing');
            break;
        }

        try {
            await processingCallback(item.dreamId, item.dreamText);
            removeFromQueue(item.dreamId);
            logger.info('[OfflineQueue] Successfully processed dream:', item.dreamId);
        } catch (error) {
            logger.error('[OfflineQueue] Failed to process dream:', item.dreamId, error);

            // Update retry count
            const currentQueue = getQueue();
            const itemIndex = currentQueue.findIndex(q => q.dreamId === item.dreamId);
            const queuedItem = currentQueue[itemIndex];
            if (itemIndex !== -1 && queuedItem) {
                queuedItem.retries++;

                // Remove if max retries exceeded
                if (queuedItem.retries >= MAX_RETRIES) {
                    logger.warn('[OfflineQueue] Max retries exceeded, removing dream:', item.dreamId);
                    currentQueue.splice(itemIndex, 1);
                }

                saveQueue(currentQueue);
            }

            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }

    isProcessing = false;
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
        // Small delay to let network stabilize
        setTimeout(processQueue, 1000);
    };

    // Listen for online events
    window.addEventListener('online', handleOnline);

    // Process any existing queue on startup (if online)
    if (navigator.onLine) {
        setTimeout(processQueue, 2000);
    }

    // Return cleanup function
    return () => {
        window.removeEventListener('online', handleOnline);
        processingCallback = null;
    };
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
