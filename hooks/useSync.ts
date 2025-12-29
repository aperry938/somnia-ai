import { useState, useEffect } from 'react';
import { processSyncQueue, getPendingCount } from '../services/syncService';
import { useOnlineStatus } from './useOnlineStatus';

export const useSync = () => {
    const isOnline = useOnlineStatus();
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    // Initial load
    useEffect(() => {
        setPendingCount(getPendingCount());
    }, []);

    // Effect: When coming online, try to sync
    useEffect(() => {
        if (isOnline) {
            triggerSync();
        }
    }, [isOnline]);

    const triggerSync = async () => {
        if (isSyncing) return;

        const count = getPendingCount();
        if (count === 0) return;

        setIsSyncing(true);
        try {
            const { success, failed } = await processSyncQueue();
            console.log(`[useSync] Sync complete. Success: ${success}, Failed: ${failed}`);
        } catch (e) {
            console.error("[useSync] Sync failed globally", e);
        } finally {
            setIsSyncing(false);
            setPendingCount(getPendingCount());
        }
    };

    // Poll for pending changes (e.g. if added while offline)
    useEffect(() => {
        const interval = setInterval(() => {
            setPendingCount(getPendingCount());
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return {
        isSyncing,
        pendingCount,
        triggerSync
    };
};
