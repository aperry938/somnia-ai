import { SyncAction, SyncActionType } from '../types';
import { logger } from './logger';

const SYNC_QUEUE_KEY = 'somnia_sync_queue';
const MAX_RETRIES = 3;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
        processSyncQueue().catch(() => {});
    }
};

/**
 * Sync a single action to the backend
 */
const syncActionToBackend = async (action: SyncAction): Promise<boolean> => {
    // Check if Supabase is configured
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        // No backend configured - mark as synced (local-only mode)
        return true;
    }

    // Get auth token if available
    const token = localStorage.getItem('somnia_auth_token');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
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
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Sync failed: ${response.status} - ${error}`);
    }

    return true;
};

export const processSyncQueue = async (): Promise<{ success: number; failed: number }> => {
    const queue = getSyncQueue();
    const pending = queue.filter(a => a.status === 'PENDING' && a.retryCount < MAX_RETRIES);

    if (pending.length === 0) return { success: 0, failed: 0 };

    let successCount = 0;
    let failCount = 0;

    const updatedQueue = await Promise.all(queue.map(async (action) => {
        if (action.status !== 'PENDING' || action.retryCount >= MAX_RETRIES) {
            // Mark as failed if max retries exceeded
            if (action.retryCount >= MAX_RETRIES && action.status === 'PENDING') {
                return { ...action, status: 'FAILED' as const };
            }
            return action;
        }

        try {
            await syncActionToBackend(action);
            successCount++;
            return { ...action, status: 'SYNCED' as const };
        } catch (e) {
            logger.error(`[SyncService] Failed to sync action ${action.id}:`, e);
            failCount++;
            return { ...action, retryCount: action.retryCount + 1 };
        }
    }));

    // Cleanup: Keep last 100 synced items, remove older ones
    const synced = updatedQueue.filter(a => a.status === 'SYNCED');
    const nonSynced = updatedQueue.filter(a => a.status !== 'SYNCED');
    const recentSynced = synced.slice(-100);

    saveSyncQueue([...nonSynced, ...recentSynced]);

    return { success: successCount, failed: failCount };
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
    processSyncQueue().catch(() => {});
};

// Listen for online/offline events
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        processSyncQueue().catch(() => {});
    });
}
