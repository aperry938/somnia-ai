
import { useEffect, useState } from 'react';

/**
 * Hook to manage Reality Check notifications.
 * Primes the user to question reality (Lucid Dreaming technique).
 * Notifications fire every 2-4 hours if permission is granted.
 */
export const useRealityChecks = () => {
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if (typeof Notification !== 'undefined') {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (typeof Notification !== 'undefined') {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === 'granted') {
                scheduleNextCheck();
            }
        }
    };

    const scheduleNextCheck = () => {
        // Random interval between 2 and 4 hours
        const minHours = 2;
        const maxHours = 4;
        const delayMs = (Math.random() * (maxHours - minHours) + minHours) * 60 * 60 * 1000;

        setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification("Somnia Reality Check", {
                    body: "Are you dreaming? Look at your hands. Count your fingers.",
                    icon: "/pwa-192x192.png" // Ensure this exists or use a default
                });
                scheduleNextCheck(); // Reschedule
            }
        }, delayMs);
    };

    // Start scheduling if already granted on mount
    useEffect(() => {
        if (permission === 'granted') {
            scheduleNextCheck();
        }
    }, [permission]);

    return {
        permission,
        requestPermission
    };
};
