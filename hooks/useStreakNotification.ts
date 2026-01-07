/**
 * Hook to manage Streak Reminder notifications.
 * Reminds users to log their dreams to maintain their streak.
 * Checks once per session and sends reminder if no dream logged today.
 */

import { useEffect, useState } from 'react';
import { Dream } from '../types';

const LAST_NOTIFICATION_KEY = 'somnia_streak_notification_date';

/**
 * Check if user has logged a dream today
 */
const hasLoggedDreamToday = (dreams: Dream[]): boolean => {
    const today = new Date().toDateString();
    return dreams.some(d => new Date(d.timestamp).toDateString() === today);
};

/**
 * Check if we should show a notification (not already shown today)
 */
const shouldShowNotification = (): boolean => {
    try {
        const lastNotificationDate = localStorage.getItem(LAST_NOTIFICATION_KEY);
        const today = new Date().toDateString();
        return lastNotificationDate !== today;
    } catch {
        return false; // Don't show notification if storage unavailable
    }
};

/**
 * Mark that we've shown a notification today
 */
const markNotificationShown = (): void => {
    try {
        localStorage.setItem(LAST_NOTIFICATION_KEY, new Date().toDateString());
    } catch {
        // Silently fail if storage unavailable
    }
};

export const useStreakNotification = (dreams: Dream[], currentStreak: number) => {
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if (typeof Notification !== 'undefined') {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async (): Promise<boolean> => {
        if (typeof Notification !== 'undefined') {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result === 'granted';
        }
        return false;
    };

    // Check and send streak reminder on mount (once per session)
    useEffect(() => {
        if (typeof Notification === 'undefined') return;
        if (Notification.permission !== 'granted') return;
        if (!shouldShowNotification()) return;
        if (hasLoggedDreamToday(dreams)) return;

        // Only remind if user has an active streak worth protecting
        if (currentStreak > 0) {
            // Delay to avoid notification on immediate page load
            const timer = setTimeout(() => {
                const message = currentStreak >= 7
                    ? `You're on a ${currentStreak}-day streak! Don't break it—log your dream today.`
                    : `Keep your ${currentStreak}-day streak alive! Log your dream before midnight.`;

                new Notification("Somnia Dream Reminder", {
                    body: message,
                    icon: "/pwa-192x192.png",
                    tag: "streak-reminder" // Prevents duplicate notifications
                });

                markNotificationShown();
            }, 3000); // 3 second delay

            return () => clearTimeout(timer);
        }
    }, [dreams, currentStreak]);

    return {
        permission,
        requestPermission,
        hasLoggedToday: hasLoggedDreamToday(dreams),
    };
};
