import React, { useEffect, useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
    const isOnline = useOnlineStatus();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setShow(true);
        } else {
            // Hide after 3 seconds when back online
            const timer = setTimeout(() => setShow(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    if (!show) return null;

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-transform duration-500 transform ${show ? 'translate-y-0' : '-translate-y-full'}`}
            role="alert"
            aria-live="assertive"
        >
            <div className={`px-4 py-1.5 rounded-b-lg shadow-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isOnline ? 'bg-green-500 text-white' : 'bg-gray-800 text-white'}`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white' : 'bg-red-500 animate-pulse'}`} aria-hidden="true" />
                {isOnline ? 'Back Online' : 'Offline Mode'}
            </div>
        </div>
    );
};
