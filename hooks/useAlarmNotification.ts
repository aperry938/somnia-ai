// hooks/useAlarmNotification.ts
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions, Channel } from '@capacitor/local-notifications';
import { Alarm } from '../types';
import { logger } from '../services/logger';

const isNative = Capacitor.isNativePlatform();
const isAndroid = Capacitor.getPlatform() === 'android';
const isIOS = Capacitor.getPlatform() === 'ios';

/**
 * Android Notification Channels (Required for Android 8+)
 * These must be created before any notifications are scheduled
 */
const NOTIFICATION_CHANNELS: Channel[] = [
    {
        id: 'alarm_status',
        name: 'Alarm Status',
        description: 'Shows which alarm is currently set',
        importance: 2, // LOW - doesn't make sound
        visibility: 0, // PRIVATE
        lights: false,
        vibration: false,
    },
    {
        id: 'alarm_trigger',
        name: 'Alarm Alerts',
        description: 'Alarm sounds and alerts that wake you up',
        importance: 5, // MAX - shows heads-up, makes sound
        visibility: 1, // PUBLIC - shows on lock screen
        lights: true,
        vibration: true,
        sound: 'alarm_somnia.wav', // Custom sound in res/raw
    },
    {
        id: 'streak_reminders',
        name: 'Dream Reminders',
        description: 'Reminders to log your dreams',
        importance: 3, // DEFAULT
        visibility: 1, // PUBLIC
        lights: true,
        vibration: true,
    },
];

let channelsCreated = false;

/**
 * Create Android notification channels (must be called before scheduling notifications)
 * Safe to call multiple times - channels are created only once
 */
export async function createNotificationChannels(): Promise<void> {
    if (!isNative || !isAndroid || channelsCreated) return;

    try {
        for (const channel of NOTIFICATION_CHANNELS) {
            await LocalNotifications.createChannel(channel);
            logger.log(`[AlarmNotification] Created channel: ${channel.id}`);
        }
        channelsCreated = true;
    } catch (error) {
        logger.error('[AlarmNotification] Failed to create channels:', error);
    }
}

/**
 * Permission status with detailed information
 */
export interface NotificationPermissionStatus {
    granted: boolean;
    denied: boolean;
    canRequest: boolean;
    exactAlarmGranted: boolean;
}

/**
 * Get the next upcoming alarm time from a list of alarms
 */
const getNextAlarmTime = (alarms: Alarm[]): { alarm: Alarm; timeStr: string; nextDate: Date } | null => {
    const activeAlarms = alarms.filter(a => a.isActive);
    if (activeAlarms.length === 0) return null;

    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let nextAlarm: Alarm | null = null;
    let nextDate: Date | null = null;
    let minDiff = Infinity;

    for (const alarm of activeAlarms) {
        const [hours, minutes] = alarm.time.split(':').map(Number);
        const alarmMinutes = (hours ?? 0) * 60 + (minutes ?? 0);

        // Check if alarm triggers today
        const triggersToday = !alarm.days || alarm.days.length === 0 || alarm.days.includes(currentDay);

        if (triggersToday && alarmMinutes > currentMinutes) {
            // Alarm is later today
            const diff = alarmMinutes - currentMinutes;
            if (diff < minDiff) {
                minDiff = diff;
                nextAlarm = alarm;
                nextDate = new Date(now);
                nextDate.setHours(hours ?? 0, minutes ?? 0, 0, 0);
            }
        } else if (alarm.days && alarm.days.length > 0) {
            // Check next occurrence in the week
            for (let i = 1; i <= 7; i++) {
                const checkDay = (currentDay + i) % 7;
                if (alarm.days.includes(checkDay)) {
                    const diff = (i * 24 * 60) + alarmMinutes - currentMinutes;
                    if (diff < minDiff) {
                        minDiff = diff;
                        nextAlarm = alarm;
                        nextDate = new Date(now);
                        nextDate.setDate(nextDate.getDate() + i);
                        nextDate.setHours(hours ?? 0, minutes ?? 0, 0, 0);
                    }
                    break;
                }
            }
        } else if (!triggersToday) {
            // One-time alarm that's already passed today - won't trigger
            continue;
        }
    }

    if (!nextAlarm || !nextDate) return null;

    // Format time for display
    const [h, m] = nextAlarm.time.split(':').map(Number);
    const period = (h ?? 0) >= 12 ? 'PM' : 'AM';
    const displayHour = (h ?? 0) % 12 || 12;
    const timeStr = `${displayHour}:${String(m).padStart(2, '0')} ${period}`;

    return { alarm: nextAlarm, timeStr, nextDate };
};

/**
 * Notification ID for alarm status - using a constant for easy reference
 */
const ALARM_STATUS_NOTIFICATION_ID = 999;

/**
 * Shows or updates the alarm notification
 */
const showAlarmNotification = async (timeStr: string, label?: string): Promise<void> => {
    if (!isNative) return;

    // Ensure channels are created before scheduling
    await createNotificationChannels();

    const title = 'Alarm Set';
    const body = label ? `${timeStr} - ${label}` : timeStr;

    try {
        // Check permission before scheduling
        const permCheck = await LocalNotifications.checkPermissions();
        if (permCheck.display !== 'granted') {
            logger.warn('[AlarmNotification] Permission not granted, skipping notification');
            return;
        }

        // Cancel existing status notification first
        await LocalNotifications.cancel({ notifications: [{ id: ALARM_STATUS_NOTIFICATION_ID }] });

        // Schedule as immediate notification (shows now, doesn't auto-dismiss)
        const notificationOptions: ScheduleOptions = {
            notifications: [{
                id: ALARM_STATUS_NOTIFICATION_ID,
                title,
                body,
                ongoing: true,
                autoCancel: false,
                smallIcon: 'ic_stat_alarm',
                largeIcon: 'ic_launcher',
                // Android 8+ channel
                channelId: isAndroid ? 'alarm_status' : undefined,
                // iOS specific
                ...(isIOS && {
                    threadIdentifier: 'alarm-status',
                    summaryArgument: 'Alarm',
                }),
            }]
        };

        await LocalNotifications.schedule(notificationOptions);

        logger.log('[AlarmNotification] Status notification shown');
    } catch (e) {
        logger.warn('[AlarmNotification] Failed to show notification:', e);
    }
};

/**
 * Clears the alarm notification
 */
const clearAlarmNotification = async (): Promise<void> => {
    if (!isNative) return;

    try {
        await LocalNotifications.cancel({ notifications: [{ id: ALARM_STATUS_NOTIFICATION_ID }] });
        logger.log('[AlarmNotification] Status notification cleared');
    } catch (e) {
        logger.warn('[AlarmNotification] Failed to clear notification:', e);
    }
};

/**
 * Hook to manage alarm status notifications using Capacitor Local Notifications
 * Shows a persistent notification when an alarm is set (e.g., "Alarm Set - 7:00 AM")
 * Note: The actual alarm trigger is handled by NativeAlarmPlugin via AppContext,
 * which uses Android AlarmManager for reliable wake-up functionality.
 */
export const useAlarmNotification = (alarms: Alarm[]) => {
    const lastNotificationRef = useRef<string | null>(null);

    useEffect(() => {
        const updateNotification = async () => {
            const next = getNextAlarmTime(alarms);

            if (next) {
                const notificationKey = `${next.timeStr}-${next.alarm.label || ''}`;

                // Only update if changed
                if (lastNotificationRef.current !== notificationKey) {
                    lastNotificationRef.current = notificationKey;
                    // Only show status notification - the actual alarm trigger is handled
                    // by NativeAlarmPlugin via AppContext (uses Android AlarmManager)
                    await showAlarmNotification(next.timeStr, next.alarm.label);
                }
            } else {
                // No active alarms - clear notification
                if (lastNotificationRef.current !== null) {
                    lastNotificationRef.current = null;
                    await clearAlarmNotification();
                }
            }
        };

        updateNotification();

        // Update every minute to keep time-until accurate
        const interval = setInterval(updateNotification, 60000);

        return () => clearInterval(interval);
    }, [alarms]);

    // Clear notification on unmount
    useEffect(() => {
        return () => {
            clearAlarmNotification();
        };
    }, []);
};

/**
 * Request notification permission if not already granted
 * Returns detailed permission status for UI feedback
 */
export const requestAlarmNotificationPermission = async (): Promise<NotificationPermissionStatus> => {
    const defaultStatus: NotificationPermissionStatus = {
        granted: false,
        denied: false,
        canRequest: true,
        exactAlarmGranted: true, // iOS always true
    };

    if (!isNative) return { ...defaultStatus, canRequest: false };

    try {
        // Ensure channels exist before requesting (Android requirement)
        await createNotificationChannels();

        const status = await LocalNotifications.checkPermissions();

        if (status.display === 'granted') {
            return {
                granted: true,
                denied: false,
                canRequest: false,
                exactAlarmGranted: true, // Will be checked separately for Android 12+
            };
        }

        // Check if we can request (iOS tracks this)
        if (status.display === 'denied') {
            return {
                granted: false,
                denied: true,
                canRequest: false, // User must go to settings
                exactAlarmGranted: true,
            };
        }

        // Request permission
        const result = await LocalNotifications.requestPermissions();
        const granted = result.display === 'granted';

        return {
            granted,
            denied: result.display === 'denied',
            canRequest: result.display !== 'denied',
            exactAlarmGranted: true,
        };
    } catch (e) {
        logger.warn('[AlarmNotification] Permission request failed:', e);
        return { ...defaultStatus, denied: true, canRequest: false };
    }
};

/**
 * Check current notification permission status without requesting
 */
export const checkAlarmNotificationPermission = async (): Promise<NotificationPermissionStatus> => {
    const defaultStatus: NotificationPermissionStatus = {
        granted: false,
        denied: false,
        canRequest: true,
        exactAlarmGranted: true,
    };

    if (!isNative) return { ...defaultStatus, canRequest: false };

    try {
        const status = await LocalNotifications.checkPermissions();

        return {
            granted: status.display === 'granted',
            denied: status.display === 'denied',
            canRequest: status.display !== 'denied',
            exactAlarmGranted: true, // Checked separately for Android 12+
        };
    } catch (e) {
        logger.error('[AlarmNotification] Permission check failed:', e);
        return defaultStatus;
    }
};

/**
 * Open system settings for notification permissions
 * Use when permission is denied and user needs to manually enable
 */
export const openNotificationSettings = async (): Promise<void> => {
    if (!isNative) return;

    try {
        // LocalNotifications doesn't have built-in settings opener
        // This would need a native plugin or App plugin
        logger.log('[AlarmNotification] Opening notification settings requires native plugin');
    } catch (e) {
        logger.error('[AlarmNotification] Failed to open settings:', e);
    }
};

/**
 * Update app badge count (iOS) or notification badge (Android)
 */
export const updateBadgeCount = async (count: number): Promise<void> => {
    if (!isNative) return;

    try {
        // Badge plugin would be needed for proper badge management
        // LocalNotifications can set badge on individual notifications
        logger.log(`[AlarmNotification] Badge count: ${count}`);
    } catch (e) {
        logger.error('[AlarmNotification] Failed to update badge:', e);
    }
};
