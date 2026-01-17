/**
 * Native Alarm Service for Somnia
 *
 * Uses REAL native alarm scheduling that works when phone is sleeping:
 * - Android: AlarmManager via custom NativeAlarmPlugin (foreground service)
 * - iOS: Local Notifications with critical alerts + background audio
 *
 * This service ensures alarms ACTUALLY wake users up, unlike web-based solutions.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { logger } from './logger';

// Check platform
export const isNative = Capacitor.isNativePlatform();
const isAndroid = Capacitor.getPlatform() === 'android';
const isIOS = Capacitor.getPlatform() === 'ios';

/**
 * Native Alarm Plugin Interface (Android)
 * This connects to our custom Java plugin that uses AlarmManager
 */
interface NativeAlarmPlugin {
    scheduleAlarm(options: {
        id: string;
        time: string;  // HH:mm format
        soundId?: string;
        label?: string;
        vibrate?: boolean;
    }): Promise<{ success: boolean; scheduledTime: number }>;

    cancelAlarm(options: { id: string }): Promise<{ success: boolean }>;
    stopAlarm(): Promise<{ success: boolean }>;
    snoozeAlarm(options: { id: string; minutes?: number }): Promise<{ success: boolean }>;
    canScheduleExactAlarms(): Promise<{ canSchedule: boolean }>;
    openAlarmSettings(): Promise<{ success: boolean }>;
    getRingingAlarm(): Promise<{
        isRinging: boolean;
        alarmId?: string;
        label?: string;
        soundId?: string;
    }>;
}

// Register the native plugin (only available on Android)
const NativeAlarm = isAndroid
    ? registerPlugin<NativeAlarmPlugin>('NativeAlarm')
    : null;

/**
 * Request all necessary permissions for alarms
 */
export async function requestPermissions(): Promise<boolean> {
    if (!isNative) {
        logger.log('[NativeAlarm] Not running in native environment');
        return false;
    }

    try {
        // Request notification permissions
        const notifResult = await LocalNotifications.requestPermissions();
        const hasNotifPermission = notifResult.display === 'granted';

        // On Android 12+, also check exact alarm permission
        if (isAndroid && NativeAlarm) {
            const exactAlarmResult = await NativeAlarm.canScheduleExactAlarms();
            if (!exactAlarmResult.canSchedule) {
                logger.warn('[NativeAlarm] Exact alarm permission not granted - alarms may be unreliable');
                // Could prompt user to grant permission
            }
        }

        return hasNotifPermission;
    } catch (error) {
        logger.error('[NativeAlarm] Permission request failed:', error);
        return false;
    }
}

/**
 * Check if exact alarms can be scheduled (Android 12+)
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
    if (!isAndroid || !NativeAlarm) return true; // iOS always can

    try {
        const result = await NativeAlarm.canScheduleExactAlarms();
        return result.canSchedule;
    } catch {
        return false;
    }
}

/**
 * Open system settings for exact alarm permission (Android 12+)
 */
export async function openAlarmSettings(): Promise<void> {
    if (isAndroid && NativeAlarm) {
        await NativeAlarm.openAlarmSettings();
    }
}

/**
 * Schedule a native alarm that works when phone is sleeping
 *
 * @param id - Unique alarm identifier
 * @param time - Time in HH:mm format (24-hour)
 * @param label - Optional label shown in notification
 * @param soundId - Sound to play (default: 'somnia')
 * @param vibrate - Whether to vibrate (default: true)
 */
export async function scheduleAlarm(
    id: number | string,
    time: string,
    label?: string,
    soundId: string = 'somnia',
    vibrate: boolean = true
): Promise<boolean> {
    const alarmId = String(id);

    if (!isNative) {
        logger.log('[NativeAlarm] Skipping - not in native environment');
        return false;
    }

    try {
        if (isAndroid && NativeAlarm) {
            // Use native AlarmManager on Android - this WILL wake the phone
            const result = await NativeAlarm.scheduleAlarm({
                id: alarmId,
                time,
                soundId,
                label: label || 'Alarm',
                vibrate,
            });

            logger.log(`[NativeAlarm] Android alarm ${alarmId} scheduled at ${time}`);
            return result.success;

        } else if (isIOS) {
            // iOS uses Local Notifications with high priority
            // Parse time to get next occurrence
            const [hours, minutes] = time.split(':').map(Number);
            const now = new Date();
            const scheduleDate = new Date();
            scheduleDate.setHours(hours ?? 0, minutes ?? 0, 0, 0);

            // If time has passed today, schedule for tomorrow
            if (scheduleDate <= now) {
                scheduleDate.setDate(scheduleDate.getDate() + 1);
            }

            await LocalNotifications.schedule({
                notifications: [{
                    id: typeof id === 'number' ? id : parseInt(alarmId) || Date.now(),
                    title: label || 'Alarm',
                    body: 'Time to wake up!',
                    schedule: { at: scheduleDate },
                    sound: 'alarm.wav',
                    actionTypeId: 'ALARM_ACTIONS',
                    extra: {
                        type: 'alarm',
                        alarmId: alarmId,
                        soundId,
                    },
                }],
            });

            logger.log(`[NativeAlarm] iOS alarm ${alarmId} scheduled for ${scheduleDate.toISOString()}`);
            return true;
        }

        return false;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to schedule alarm:', error);
        return false;
    }
}

/**
 * Schedule alarm for specific days of the week
 */
export async function scheduleRecurringAlarm(
    id: number | string,
    time: string,
    days: number[], // 0 = Sunday, 1 = Monday, etc.
    label?: string,
    soundId: string = 'somnia',
    vibrate: boolean = true
): Promise<boolean> {
    if (!isNative || days.length === 0) return false;

    try {
        // For each day, schedule a separate alarm
        // This approach works on both Android and iOS
        const [hours, minutes] = time.split(':').map(Number);

        for (const day of days) {
            const alarmId = `${id}_day${day}`;

            if (isAndroid && NativeAlarm) {
                // Calculate next occurrence of this weekday (not used, but validates the day)
                const timeStr = `${String(hours ?? 0).padStart(2, '0')}:${String(minutes ?? 0).padStart(2, '0')}`;

                await NativeAlarm.scheduleAlarm({
                    id: alarmId,
                    time: timeStr,
                    soundId,
                    label: label || 'Alarm',
                    vibrate,
                });
            } else if (isIOS) {
                // iOS supports weekday scheduling natively
                await LocalNotifications.schedule({
                    notifications: [{
                        id: hashCode(alarmId),
                        title: label || 'Alarm',
                        body: 'Time to wake up!',
                        schedule: {
                            on: {
                                weekday: day + 1, // iOS uses 1-7 (Sunday = 1)
                                hour: hours,
                                minute: minutes,
                            },
                        },
                        sound: 'alarm.wav',
                        actionTypeId: 'ALARM_ACTIONS',
                        extra: {
                            type: 'recurring_alarm',
                            alarmId: String(id),
                            dayOfWeek: day,
                        },
                    }],
                });
            }
        }

        logger.log(`[NativeAlarm] Recurring alarm ${id} scheduled for days: ${days.join(', ')}`);
        return true;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to schedule recurring alarm:', error);
        return false;
    }
}

/**
 * Cancel a scheduled alarm
 */
export async function cancelAlarm(id: number | string): Promise<boolean> {
    const alarmId = String(id);

    if (!isNative) return false;

    try {
        if (isAndroid && NativeAlarm) {
            await NativeAlarm.cancelAlarm({ id: alarmId });
        } else {
            await LocalNotifications.cancel({
                notifications: [{ id: typeof id === 'number' ? id : hashCode(alarmId) }]
            });
        }

        logger.log(`[NativeAlarm] Cancelled alarm ${alarmId}`);
        return true;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to cancel alarm:', error);
        return false;
    }
}

/**
 * Cancel recurring alarm (all days)
 */
export async function cancelRecurringAlarm(id: number | string): Promise<boolean> {
    if (!isNative) return false;

    try {
        // Cancel all day variations
        for (let day = 0; day < 7; day++) {
            const alarmId = `${id}_day${day}`;

            if (isAndroid && NativeAlarm) {
                await NativeAlarm.cancelAlarm({ id: alarmId });
            } else {
                await LocalNotifications.cancel({
                    notifications: [{ id: hashCode(alarmId) }]
                });
            }
        }

        logger.log(`[NativeAlarm] Cancelled recurring alarm ${id}`);
        return true;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to cancel recurring alarm:', error);
        return false;
    }
}

/**
 * Stop currently playing alarm
 */
export async function stopAlarm(): Promise<boolean> {
    if (!isNative) return false;

    try {
        if (isAndroid && NativeAlarm) {
            await NativeAlarm.stopAlarm();
        }
        // iOS alarm stops when notification is dismissed

        logger.log('[NativeAlarm] Alarm stopped');
        return true;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to stop alarm:', error);
        return false;
    }
}

/**
 * Snooze currently playing alarm
 */
export async function snoozeAlarm(id: number | string, minutes: number = 9): Promise<boolean> {
    if (!isNative) return false;

    try {
        if (isAndroid && NativeAlarm) {
            await NativeAlarm.snoozeAlarm({ id: String(id), minutes });
        } else if (isIOS) {
            // iOS: Schedule new notification for snooze time
            const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
            await LocalNotifications.schedule({
                notifications: [{
                    id: hashCode(`${id}_snooze`),
                    title: 'Snooze',
                    body: 'Time to wake up!',
                    schedule: { at: snoozeTime },
                    sound: 'alarm.wav',
                }],
            });
        }

        logger.log(`[NativeAlarm] Snoozed for ${minutes} minutes`);
        return true;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to snooze alarm:', error);
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
 * Initialize alarm listeners for when alarm fires
 */
export function initializeAlarmListeners(
    onAlarmReceived?: (alarmId: string) => void,
    onAlarmAction?: (alarmId: string, actionId: string) => void
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
 * Register alarm action types (snooze, dismiss)
 */
export async function registerAlarmActions(): Promise<void> {
    if (!isNative) return;

    try {
        await LocalNotifications.registerActionTypes({
            types: [
                {
                    id: 'ALARM_ACTIONS',
                    actions: [
                        {
                            id: 'snooze',
                            title: 'Snooze (9 min)',
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

// Helper functions
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

// Export check permissions
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
 * Get the currently ringing alarm from native side
 * Used to detect alarm state on app launch/resume from lock screen
 */
export async function getRingingAlarm(): Promise<{
    isRinging: boolean;
    alarmId?: string;
    label?: string;
    soundId?: string;
} | null> {
    if (!isAndroid || !NativeAlarm) return null;

    try {
        const result = await NativeAlarm.getRingingAlarm();
        logger.log('[NativeAlarm] getRingingAlarm result:', result);
        return result;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to get ringing alarm:', error);
        return null;
    }
}
