import { SyncAction, SyncActionType } from '../types';

const SYNC_QUEUE_KEY = 'somnia_sync_queue';

export const getSyncQueue = (): SyncAction[] => {
    try {
        const item = localStorage.getItem(SYNC_QUEUE_KEY);
        return item ? JSON.parse(item) : [];
    } catch (e) {
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

export const enqueueAction = (type: SyncActionType, payload: any) => {
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
    console.log(`[SyncService] Enqueued action: ${type}`, newAction);
};

export const processSyncQueue = async (): Promise<{ success: number; failed: number }> => {
    const queue = getSyncQueue();
    const pending = queue.filter(a => a.status === 'PENDING');

    if (pending.length === 0) return { success: 0, failed: 0 };

    console.log(`[SyncService] Processing ${pending.length} pending actions...`);

    let successCount = 0;
    let failCount = 0;

    const updatedQueue = await Promise.all(queue.map(async (action) => {
        if (action.status !== 'PENDING') return action;

        try {
            // MOCK: Simulate network call to cloud backend
            await new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Random random failure simulation (10% chance)
                    if (Math.random() < 0.1) reject(new Error("Network glitch"));
                    else resolve(true);
                }, 500);
            });

            successCount++;
            return { ...action, status: 'SYNCED' as const };
        } catch (e) {
            console.error(`[SyncService] Failed to sync action ${action.id}:`, e);
            failCount++;
            return { ...action, retryCount: action.retryCount + 1 };
        }
    }));

    // Cleanup: Remove synced items? Or keep for log? Let's keep last 50 synced.
    // For now, save all updated states.
    saveSyncQueue(updatedQueue);

    return { success: successCount, failed: failCount };
};

export const getPendingCount = (): number => {
    return getSyncQueue().filter(a => a.status === 'PENDING').length;
};
