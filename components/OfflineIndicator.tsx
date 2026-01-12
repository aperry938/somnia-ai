import React, { useEffect, useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getQueueLength, onQueueUpdate } from '../services/offlineQueueService';

export const OfflineIndicator: React.FC = () => {
    const isOnline = useOnlineStatus();
    const [show, setShow] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(() => getQueueLength());

    // Subscribe to queue updates
    useEffect(() => {
        setPendingSyncCount(getQueueLength());
        const unsubscribe = onQueueUpdate((count) => {
            setPendingSyncCount(count);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!isOnline) {
            setShow(true);
        } else {
            // Hide after 3 seconds when back online (and no pending items)
            const timer = setTimeout(() => {
                if (pendingSyncCount === 0) {
                    setShow(false);
                }
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, pendingSyncCount]);

    // Also show indicator when there are pending sync items (even if online)
    const shouldShow = show || pendingSyncCount > 0;

    if (!shouldShow) return null;

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-transform duration-500 transform ${shouldShow ? 'translate-y-0' : '-translate-y-full'}`}
            role="alert"
            aria-live="assertive"
        >
            <div className={`px-4 py-1.5 rounded-b-lg shadow-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isOnline ? (pendingSyncCount > 0 ? 'bg-amber-500 text-white' : 'bg-green-500 text-white') : 'bg-gray-800 text-white'}`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? (pendingSyncCount > 0 ? 'bg-white animate-pulse' : 'bg-white') : 'bg-red-500 animate-pulse'}`} aria-hidden="true" />
                {isOnline ? (
                    pendingSyncCount > 0 ? (
                        `${pendingSyncCount} dream${pendingSyncCount > 1 ? 's' : ''} syncing...`
                    ) : (
                        'Back Online'
                    )
                ) : (
                    pendingSyncCount > 0 ? (
                        `Offline • ${pendingSyncCount} dream${pendingSyncCount > 1 ? 's' : ''} pending sync`
                    ) : (
                        'Offline Mode'
                    )
                )}
            </div>
        </div>
    );
};
