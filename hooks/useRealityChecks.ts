
import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Hook to manage Reality Check notifications.
 * Primes the user to question reality (Lucid Dreaming technique).
 * Notifications fire every 2-4 hours if permission is granted.
 */
export const useRealityChecks = () => {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (typeof Notification !== 'undefined') {
            setPermission(Notification.permission);
        }
    }, []);

    const scheduleNextCheck = useCallback(() => {
        // Clear any existing timeout to prevent duplicates
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Random interval between 2 and 4 hours
        const minHours = 2;
        const maxHours = 4;
        const delayMs = (Math.random() * (maxHours - minHours) + minHours) * 60 * 60 * 1000;

        timeoutRef.current = setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification("Somnia Reality Check", {
                    body: "Are you dreaming? Look at your hands. Count your fingers.",
                    icon: "/pwa-192x192.png"
                });
                scheduleNextCheck(); // Reschedule
            }
        }, delayMs);
    }, []);

    const requestPermission = useCallback(async () => {
        if (typeof Notification !== 'undefined') {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === 'granted') {
                scheduleNextCheck();
            }
        }
    }, [scheduleNextCheck]);

    // Start scheduling if already granted on mount, cleanup on unmount
    useEffect(() => {
        if (permission === 'granted') {
            scheduleNextCheck();
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [permission, scheduleNextCheck]);

    return {
        permission,
        requestPermission
    };
};
