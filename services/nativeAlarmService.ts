/**
 * Native Alarm Service for Somnia
 * 
 * Bridges to Capacitor Local Notifications for native alarm functionality.
 * Works when app is in background and phone is locked.
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions, LocalNotificationSchema } from '@capacitor/local-notifications';
import { logger } from './logger';

// Check if running in native environment
export const isNative = Capacitor.isNativePlatform();

/**
 * Request notification permissions
 */
export async function requestPermissions(): Promise<boolean> {
    if (!isNative) {
        logger.log('[NativeAlarm] Not running in native environment');
        return false;
    }

    try {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
    } catch (error) {
        logger.error('[NativeAlarm] Permission request failed:', error);
        return false;
    }
}

/**
 * Check notification permissions
 */
export async function checkPermissions(): Promise<boolean> {
    if (!isNative) return false;

    try {
        const result = await LocalNotifications.checkPermissions();
        return result.display === 'granted';
    } catch (error) {
        logger.error('[NativeAlarm] Permission check failed:', error);
        return false;
    }
}

/**
 * Schedule a native alarm notification
 */
export async function scheduleAlarm(
    id: number,
    title: string,
    body: string,
    scheduleAt: Date,
    sound?: string
): Promise<boolean> {
    if (!isNative) {
        logger.log('[NativeAlarm] Skipping native schedule - not in native environment');
        return false;
    }

    try {
        const notification: LocalNotificationSchema = {
            id,
            title,
            body,
            schedule: { at: scheduleAt },
            sound: sound || 'default',
            // Critical for alarms - high priority
            actionTypeId: 'ALARM',
            extra: {
                type: 'alarm',
                alarmId: id,
            },
        };

        await LocalNotifications.schedule({
            notifications: [notification],
        });

        logger.log(`[NativeAlarm] Scheduled alarm ${id} for ${scheduleAt.toISOString()}`);
        return true;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to schedule alarm:', error);
        return false;
    }
}

/**
 * Cancel a scheduled alarm
 */
export async function cancelAlarm(id: number): Promise<boolean> {
    if (!isNative) return false;

    try {
        await LocalNotifications.cancel({ notifications: [{ id }] });
        logger.log(`[NativeAlarm] Cancelled alarm ${id}`);
        return true;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to cancel alarm:', error);
        return false;
    }
}

/**
 * Cancel all scheduled alarms
 */
export async function cancelAllAlarms(): Promise<boolean> {
    if (!isNative) return false;

    try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel({ notifications: pending.notifications });
        }
        logger.log('[NativeAlarm] Cancelled all alarms');
        return true;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to cancel all alarms:', error);
        return false;
    }
}

/**
 * Get all pending/scheduled alarms
 */
export async function getPendingAlarms(): Promise<number[]> {
    if (!isNative) return [];

    try {
        const pending = await LocalNotifications.getPending();
        return pending.notifications.map(n => n.id);
    } catch (error) {
        logger.error('[NativeAlarm] Failed to get pending alarms:', error);
        return [];
    }
}

/**
 * Schedule a recurring alarm (daily, specific days of week)
 */
export async function scheduleRecurringAlarm(
    id: number,
    title: string,
    body: string,
    hour: number,
    minute: number,
    daysOfWeek: number[], // 1 = Sunday, 2 = Monday, etc.
    sound?: string
): Promise<boolean> {
    if (!isNative) return false;

    try {
        // Capacitor uses different schedule options for recurring
        const notifications: LocalNotificationSchema[] = daysOfWeek.map((day, index) => ({
            id: id * 10 + index, // Unique ID for each day
            title,
            body,
            schedule: {
                on: {
                    weekday: day,
                    hour,
                    minute,
                },
            },
            sound: sound || 'default',
            actionTypeId: 'ALARM',
            extra: {
                type: 'recurring_alarm',
                parentAlarmId: id,
                dayOfWeek: day,
            },
        }));

        await LocalNotifications.schedule({ notifications });
        logger.log(`[NativeAlarm] Scheduled recurring alarm ${id} for days: ${daysOfWeek.join(', ')}`);
        return true;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to schedule recurring alarm:', error);
        return false;
    }
}

/**
 * Initialize native alarm listeners
 */
export function initializeAlarmListeners(
    onAlarmReceived?: (alarmId: number) => void,
    onAlarmAction?: (alarmId: number, actionId: string) => void
): void {
    if (!isNative) return;

    // Listen for notification received
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
        logger.log('[NativeAlarm] Notification received:', notification);
        if (notification.extra?.type === 'alarm' || notification.extra?.type === 'recurring_alarm') {
            const alarmId = notification.extra.alarmId || notification.extra.parentAlarmId;
            onAlarmReceived?.(alarmId);
        }
    });

    // Listen for notification action (user tapped)
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        logger.log('[NativeAlarm] Action performed:', action);
        const alarmId = action.notification.extra?.alarmId || action.notification.extra?.parentAlarmId;
        onAlarmAction?.(alarmId, action.actionId);
    });
}

/**
 * Register alarm action types (snooze, dismiss, etc.)
 */
export async function registerAlarmActions(): Promise<void> {
    if (!isNative) return;

    try {
        await LocalNotifications.registerActionTypes({
            types: [
                {
                    id: 'ALARM',
                    actions: [
                        {
                            id: 'snooze',
                            title: 'Snooze (5 min)',
                        },
                        {
                            id: 'dismiss',
                            title: 'Dismiss',
                            destructive: true,
                        },
                    ],
                },
            ],
        });
        logger.log('[NativeAlarm] Registered alarm action types');
    } catch (error) {
        logger.error('[NativeAlarm] Failed to register action types:', error);
    }
}
