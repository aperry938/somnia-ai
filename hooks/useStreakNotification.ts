/**
 * Hook to manage Streak Reminder notifications.
 * Reminds users to log their dreams to maintain their streak.
 * Uses Capacitor Local Notifications for native mobile support.
 */

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { Dream } from '../types';
import { logger } from '../services/logger';

const isNative = Capacitor.isNativePlatform();
const LAST_NOTIFICATION_KEY = 'somnia_streak_notification_date';
const STREAK_NOTIFICATION_ID = 998;

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

/**
 * Show streak reminder notification using Capacitor Local Notifications
 */
const showStreakNotification = async (currentStreak: number): Promise<void> => {
    if (!isNative) return;

    try {
        const message = currentStreak >= 7
            ? `You're on a ${currentStreak}-day streak! Don't break it—log your dream today.`
            : `Keep your ${currentStreak}-day streak alive! Log your dream before midnight.`;

        await LocalNotifications.schedule({
            notifications: [{
                id: STREAK_NOTIFICATION_ID,
                title: 'Somnia Dream Reminder',
                body: message,
                smallIcon: 'ic_stat_notification',
                largeIcon: 'ic_launcher',
            }]
        });

        markNotificationShown();
        logger.log('[StreakNotification] Reminder sent');
    } catch (e) {
        logger.warn('[StreakNotification] Failed to show notification:', e);
    }
};

export const useStreakNotification = (dreams: Dream[], currentStreak: number) => {
    const [permission, setPermission] = useState<'granted' | 'denied' | 'default'>('default');

    // Check permission on mount
    useEffect(() => {
        const checkPermission = async () => {
            if (!isNative) return;

            try {
                const status: PermissionStatus = await LocalNotifications.checkPermissions();
                setPermission(status.display === 'granted' ? 'granted' : status.display === 'denied' ? 'denied' : 'default');
            } catch {
                setPermission('denied');
            }
        };
        checkPermission();
    }, []);

    const requestPermission = async (): Promise<boolean> => {
        if (!isNative) return false;

        try {
            const result = await LocalNotifications.requestPermissions();
            const granted = result.display === 'granted';
            setPermission(granted ? 'granted' : 'denied');
            return granted;
        } catch {
            setPermission('denied');
            return false;
        }
    };

    // Check and send streak reminder on mount (once per session)
    useEffect(() => {
        if (!isNative) return;
        if (permission !== 'granted') return;
        if (!shouldShowNotification()) return;
        if (hasLoggedDreamToday(dreams)) return;

        // Only remind if user has an active streak worth protecting
        if (currentStreak > 0) {
            // Delay to avoid notification on immediate app launch
            const timer = setTimeout(() => {
                showStreakNotification(currentStreak);
            }, 3000); // 3 second delay

            return () => clearTimeout(timer);
        }
    }, [dreams, currentStreak, permission]);

    return {
        permission,
        requestPermission,
        hasLoggedToday: hasLoggedDreamToday(dreams),
    };
};
