/**
 * Hook to manage Streak Reminder notifications.
 * Reminds users to log their dreams to maintain their streak.
 * Uses Capacitor Local Notifications for native mobile support.
 *
 * iOS/Android App Store Compliance:
 * - Proper permission request flow with denied state handling
 * - Android 8+ notification channels
 * - Foreground notification handling
 * - Badge management
 * - Scheduled notification support
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, PermissionStatus, ActionPerformed } from '@capacitor/local-notifications';
import { Dream } from '../types';
import { logger } from '../services/logger';
import { createNotificationChannels } from './useAlarmNotification';

const isNative = Capacitor.isNativePlatform();
const isAndroid = Capacitor.getPlatform() === 'android';
const isIOS = Capacitor.getPlatform() === 'ios';
const LAST_NOTIFICATION_KEY = 'somnia_streak_notification_date';
const STREAK_NOTIFICATION_ID = 998;
const EVENING_REMINDER_ID = 997;

/**
 * Action types for streak notifications
 */
const STREAK_ACTION_TYPE_ID = 'STREAK_ACTIONS';

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
 * Register streak notification action types
 */
export async function registerStreakActions(): Promise<void> {
    if (!isNative) return;

    try {
        await LocalNotifications.registerActionTypes({
            types: [
                {
                    id: STREAK_ACTION_TYPE_ID,
                    actions: [
                        {
                            id: 'log_dream',
                            title: 'Log Dream',
                            foreground: true, // Opens app
                        },
                        {
                            id: 'remind_later',
                            title: 'Remind Later',
                            foreground: false,
                        },
                    ],
                },
            ],
        });
        logger.log('[StreakNotification] Registered action types');
    } catch (error) {
        logger.error('[StreakNotification] Failed to register action types:', error);
    }
}

/**
 * Show streak reminder notification using Capacitor Local Notifications
 */
const showStreakNotification = async (currentStreak: number): Promise<void> => {
    if (!isNative) return;

    try {
        // Ensure channels exist (Android 8+)
        await createNotificationChannels();

        // Check permission before showing
        const permCheck = await LocalNotifications.checkPermissions();
        if (permCheck.display !== 'granted') {
            logger.warn('[StreakNotification] Permission not granted, skipping notification');
            return;
        }

        const message = currentStreak >= 7
            ? `You're on a ${currentStreak}-day streak! Don't break it - log your dream today.`
            : `Keep your ${currentStreak}-day streak alive! Log your dream before midnight.`;

        await LocalNotifications.schedule({
            notifications: [{
                id: STREAK_NOTIFICATION_ID,
                title: 'Somnia Dream Reminder',
                body: message,
                smallIcon: 'ic_stat_notification',
                largeIcon: 'ic_launcher',
                // Android 8+ channel
                channelId: isAndroid ? 'streak_reminders' : undefined,
                // Action buttons
                actionTypeId: STREAK_ACTION_TYPE_ID,
                // iOS specific
                ...(isIOS && {
                    threadIdentifier: 'streak-reminders',
                    summaryArgument: 'Dream Streak',
                    // Badge count shows streak
                    badge: currentStreak,
                }),
                // Extra data for handling actions
                extra: {
                    type: 'streak_reminder',
                    streak: currentStreak,
                },
            }]
        });

        markNotificationShown();
        logger.log('[StreakNotification] Reminder sent');
    } catch (e) {
        logger.warn('[StreakNotification] Failed to show notification:', e);
    }
};

/**
 * Schedule evening reminder notification
 * Fires at a specific time (e.g., 9 PM) if user hasn't logged a dream
 */
export async function scheduleEveningReminder(
    hour: number = 21, // 9 PM default
    minute: number = 0,
    currentStreak: number = 0
): Promise<boolean> {
    if (!isNative) return false;

    try {
        // Ensure channels exist
        await createNotificationChannels();

        // Check permission
        const permCheck = await LocalNotifications.checkPermissions();
        if (permCheck.display !== 'granted') {
            logger.warn('[StreakNotification] Permission not granted for scheduled reminder');
            return false;
        }

        // Cancel any existing evening reminder
        await LocalNotifications.cancel({ notifications: [{ id: EVENING_REMINDER_ID }] });

        // Calculate next occurrence
        const now = new Date();
        const scheduleDate = new Date();
        scheduleDate.setHours(hour, minute, 0, 0);

        // If time has passed today, schedule for tomorrow
        if (scheduleDate <= now) {
            scheduleDate.setDate(scheduleDate.getDate() + 1);
        }

        const message = currentStreak > 0
            ? `Don't forget to log today's dream! Your ${currentStreak}-day streak is counting on you.`
            : 'Time to log your dreams! Start building your dream journal streak.';

        await LocalNotifications.schedule({
            notifications: [{
                id: EVENING_REMINDER_ID,
                title: 'Dream Journal Reminder',
                body: message,
                schedule: { at: scheduleDate },
                smallIcon: 'ic_stat_notification',
                largeIcon: 'ic_launcher',
                channelId: isAndroid ? 'streak_reminders' : undefined,
                actionTypeId: STREAK_ACTION_TYPE_ID,
                ...(isIOS && {
                    threadIdentifier: 'streak-reminders',
                    // iOS: Allow notification when app is in foreground
                    presentAlert: true,
                    presentBadge: true,
                    presentSound: true,
                }),
                extra: {
                    type: 'evening_reminder',
                    streak: currentStreak,
                },
            }]
        });

        logger.log(`[StreakNotification] Evening reminder scheduled for ${scheduleDate.toISOString()}`);
        return true;
    } catch (e) {
        logger.error('[StreakNotification] Failed to schedule evening reminder:', e);
        return false;
    }
}

/**
 * Cancel scheduled evening reminder
 */
export async function cancelEveningReminder(): Promise<void> {
    if (!isNative) return;

    try {
        await LocalNotifications.cancel({ notifications: [{ id: EVENING_REMINDER_ID }] });
        logger.log('[StreakNotification] Evening reminder cancelled');
    } catch (e) {
        logger.error('[StreakNotification] Failed to cancel evening reminder:', e);
    }
}

/**
 * Detailed permission status for UI feedback
 */
export interface StreakPermissionStatus {
    permission: 'granted' | 'denied' | 'default';
    canRequest: boolean;
    deniedPermanently: boolean;
}

export const useStreakNotification = (dreams: Dream[], currentStreak: number) => {
    const [permissionStatus, setPermissionStatus] = useState<StreakPermissionStatus>({
        permission: 'default',
        canRequest: true,
        deniedPermanently: false,
    });
    const listenerCleanupRef = useRef<(() => void) | null>(null);

    // Check permission on mount
    useEffect(() => {
        const checkPermission = async () => {
            if (!isNative) return;

            try {
                // Ensure channels are created
                await createNotificationChannels();
                // Register action types
                await registerStreakActions();

                const status: PermissionStatus = await LocalNotifications.checkPermissions();
                const permission = status.display === 'granted' ? 'granted' : status.display === 'denied' ? 'denied' : 'default';

                setPermissionStatus({
                    permission,
                    canRequest: permission !== 'denied',
                    deniedPermanently: permission === 'denied',
                });
            } catch {
                setPermissionStatus({
                    permission: 'denied',
                    canRequest: false,
                    deniedPermanently: true,
                });
            }
        };
        checkPermission();
    }, []);

    // Setup notification action listener
    useEffect(() => {
        if (!isNative) return;

        const setupListener = async () => {
            const listener = await LocalNotifications.addListener(
                'localNotificationActionPerformed',
                (action: ActionPerformed) => {
                    const extra = action.notification.extra;
                    if (extra?.type === 'streak_reminder' || extra?.type === 'evening_reminder') {
                        if (action.actionId === 'log_dream') {
                            // App will be foregrounded, navigation handled by app
                            logger.log('[StreakNotification] User tapped Log Dream action');
                        } else if (action.actionId === 'remind_later') {
                            // Schedule reminder for 1 hour later
                            scheduleEveningReminder(
                                new Date().getHours() + 1,
                                new Date().getMinutes(),
                                extra.streak || 0
                            );
                        }
                    }
                }
            );

            listenerCleanupRef.current = () => listener.remove();
        };

        setupListener();

        return () => {
            if (listenerCleanupRef.current) {
                listenerCleanupRef.current();
                listenerCleanupRef.current = null;
            }
        };
    }, []);

    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!isNative) return false;

        try {
            // Ensure channels exist before requesting
            await createNotificationChannels();

            const result = await LocalNotifications.requestPermissions();
            const granted = result.display === 'granted';
            const denied = result.display === 'denied';

            setPermissionStatus({
                permission: granted ? 'granted' : denied ? 'denied' : 'default',
                canRequest: !denied,
                deniedPermanently: denied,
            });

            return granted;
        } catch (e) {
            logger.error('[StreakNotification] Permission request failed:', e);
            setPermissionStatus({
                permission: 'denied',
                canRequest: false,
                deniedPermanently: true,
            });
            return false;
        }
    }, []);

    // Check and send streak reminder on mount (once per session)
    useEffect(() => {
        if (!isNative) return;
        if (permissionStatus.permission !== 'granted') return;
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
    }, [dreams, currentStreak, permissionStatus.permission]);

    return {
        permission: permissionStatus.permission,
        canRequest: permissionStatus.canRequest,
        deniedPermanently: permissionStatus.deniedPermanently,
        requestPermission,
        hasLoggedToday: hasLoggedDreamToday(dreams),
        scheduleEveningReminder: (hour?: number, minute?: number) =>
            scheduleEveningReminder(hour, minute, currentStreak),
        cancelEveningReminder,
    };
};
