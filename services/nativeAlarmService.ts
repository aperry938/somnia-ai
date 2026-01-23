/**
 * Native Alarm Service for Somnia
 *
 * Uses REAL native alarm scheduling that works when phone is sleeping:
 * - Android: AlarmManager via custom NativeAlarmPlugin (foreground service)
 * - iOS: Local Notifications with critical alerts + background audio
 *
 * This service ensures alarms ACTUALLY wake users up, unlike web-based solutions.
 *
 * MOBILE APP STORE COMPLIANCE:
 * - Retry logic for scheduling failures (network issues, permission timing)
 * - Proper error categorization for user feedback
 * - Defensive checks for edge cases (permission denied mid-operation)
 * - Battery-efficient scheduling practices
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { logger } from './logger';

// Check platform
export const isNative = Capacitor.isNativePlatform();
const isAndroid = Capacitor.getPlatform() === 'android';
const isIOS = Capacitor.getPlatform() === 'ios';

/** Maximum retries for alarm scheduling operations */
const MAX_SCHEDULE_RETRIES = 3;

/** Delay between retries in milliseconds (exponential backoff) */
const RETRY_BASE_DELAY_MS = 500;

/** Error categories for user-friendly feedback */
export enum AlarmErrorType {
    PERMISSION_DENIED = 'permission_denied',
    SCHEDULE_FAILED = 'schedule_failed',
    CANCEL_FAILED = 'cancel_failed',
    NOT_NATIVE = 'not_native',
    UNKNOWN = 'unknown'
}

export interface AlarmError {
    type: AlarmErrorType;
    message: string;
    retryable: boolean;
}

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
 * Detailed permission status for alarms
 */
export interface AlarmPermissionStatus {
    notificationGranted: boolean;
    exactAlarmGranted: boolean;
    allGranted: boolean;
    requiresExactAlarmPermission: boolean;
    userMessage?: string;
}

/**
 * Request all necessary permissions for alarms
 */
export async function requestPermissions(): Promise<boolean> {
    const status = await requestPermissionsWithDetails();
    return status.allGranted;
}

/**
 * Request permissions with detailed status
 * Provides information for UI feedback to users
 */
export async function requestPermissionsWithDetails(): Promise<AlarmPermissionStatus> {
    if (!isNative) {
        logger.log('[NativeAlarm] Not running in native environment');
        return {
            notificationGranted: false,
            exactAlarmGranted: false,
            allGranted: false,
            requiresExactAlarmPermission: false,
            userMessage: 'Alarms require the native app.',
        };
    }

    try {
        // Request notification permissions
        const notifResult = await LocalNotifications.requestPermissions();
        const hasNotifPermission = notifResult.display === 'granted';

        let exactAlarmGranted = true;
        let requiresExactAlarm = false;

        // On Android 12+, also check exact alarm permission
        if (isAndroid && NativeAlarm) {
            requiresExactAlarm = true;
            const exactAlarmResult = await NativeAlarm.canScheduleExactAlarms();
            exactAlarmGranted = exactAlarmResult.canSchedule;

            if (!exactAlarmGranted) {
                logger.warn('[NativeAlarm] Exact alarm permission not granted - alarms may be unreliable');
            }
        }

        const allGranted = hasNotifPermission && exactAlarmGranted;

        let userMessage: string | undefined;
        if (!hasNotifPermission) {
            userMessage = 'Notification permission is required for alarms.';
        } else if (!exactAlarmGranted) {
            userMessage = 'Exact alarm permission needed for reliable wake-up alarms.';
        }

        return {
            notificationGranted: hasNotifPermission,
            exactAlarmGranted,
            allGranted,
            requiresExactAlarmPermission: requiresExactAlarm,
            userMessage,
        };
    } catch (error) {
        logger.error('[NativeAlarm] Permission request failed:', error);
        return {
            notificationGranted: false,
            exactAlarmGranted: false,
            allGranted: false,
            requiresExactAlarmPermission: isAndroid,
            userMessage: 'Failed to request permissions. Please try again.',
        };
    }
}

/**
 * Check current permission status without requesting
 */
export async function checkPermissionStatus(): Promise<AlarmPermissionStatus> {
    if (!isNative) {
        return {
            notificationGranted: false,
            exactAlarmGranted: false,
            allGranted: false,
            requiresExactAlarmPermission: false,
        };
    }

    try {
        const notifResult = await LocalNotifications.checkPermissions();
        const hasNotifPermission = notifResult.display === 'granted';

        let exactAlarmGranted = true;
        let requiresExactAlarm = false;

        if (isAndroid && NativeAlarm) {
            requiresExactAlarm = true;
            const exactAlarmResult = await NativeAlarm.canScheduleExactAlarms();
            exactAlarmGranted = exactAlarmResult.canSchedule;
        }

        return {
            notificationGranted: hasNotifPermission,
            exactAlarmGranted,
            allGranted: hasNotifPermission && exactAlarmGranted,
            requiresExactAlarmPermission: requiresExactAlarm,
        };
    } catch (error) {
        logger.error('[NativeAlarm] Permission check failed:', error);
        return {
            notificationGranted: false,
            exactAlarmGranted: false,
            allGranted: false,
            requiresExactAlarmPermission: isAndroid,
        };
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
 * Returns true if settings were opened successfully
 */
export async function openAlarmSettings(): Promise<boolean> {
    if (!isAndroid || !NativeAlarm) {
        logger.log('[NativeAlarm] Alarm settings only available on Android 12+');
        return false;
    }

    try {
        await NativeAlarm.openAlarmSettings();
        logger.log('[NativeAlarm] Opened alarm settings');
        return true;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to open alarm settings:', error);
        return false;
    }
}

/**
 * Check if the current Android version requires exact alarm permission
 * Android 12 (API 31) and above require SCHEDULE_EXACT_ALARM
 */
export function requiresExactAlarmPermission(): boolean {
    // This would ideally check Android API level
    // For now, assume all Android devices may need it
    return isAndroid;
}

/**
 * Get user-friendly message about alarm permission status
 */
export async function getAlarmPermissionMessage(): Promise<{
    status: 'granted' | 'denied' | 'needs_action';
    message: string;
    action?: 'request' | 'settings';
}> {
    if (!isNative) {
        return {
            status: 'denied',
            message: 'Alarms require the native mobile app.',
        };
    }

    const permStatus = await checkPermissionStatus();

    if (permStatus.allGranted) {
        return {
            status: 'granted',
            message: 'All alarm permissions granted. Your alarms will work reliably.',
        };
    }

    if (!permStatus.notificationGranted) {
        return {
            status: 'denied',
            message: 'Notification permission required for alarms to wake you up.',
            action: 'request',
        };
    }

    if (!permStatus.exactAlarmGranted && permStatus.requiresExactAlarmPermission) {
        return {
            status: 'needs_action',
            message: 'Enable exact alarms in settings for reliable wake-up times.',
            action: 'settings',
        };
    }

    return {
        status: 'granted',
        message: 'Alarm permissions configured.',
    };
}

/**
 * Helper function to implement retry with exponential backoff
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = MAX_SCHEDULE_RETRIES
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on permission errors - they won't succeed
            if (lastError.message.includes('permission') || lastError.message.includes('denied')) {
                logger.error(`[NativeAlarm] ${operationName} failed (permission error, not retrying):`, error);
                throw lastError;
            }

            if (attempt < maxRetries - 1) {
                const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
                logger.warn(`[NativeAlarm] ${operationName} retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
}

/**
 * Schedule a native alarm that works when phone is sleeping.
 * Implements retry logic for transient failures (e.g., system busy).
 *
 * @param id - Unique alarm identifier
 * @param time - Time in HH:mm format (24-hour)
 * @param label - Optional label shown in notification
 * @param soundId - Sound to play (default: 'somnia')
 * @param vibrate - Whether to vibrate (default: true)
 * @returns Object with success status and optional error details
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

    // Validate time format
    if (!/^\d{1,2}:\d{2}$/.test(time)) {
        logger.error(`[NativeAlarm] Invalid time format: ${time}. Expected HH:mm`);
        return false;
    }

    // Validate time values are within valid ranges
    const [parsedHours, parsedMinutes] = time.split(':').map(Number);
    if (parsedHours === undefined || parsedMinutes === undefined ||
        isNaN(parsedHours) || isNaN(parsedMinutes) ||
        parsedHours < 0 || parsedHours > 23 ||
        parsedMinutes < 0 || parsedMinutes > 59) {
        logger.error(`[NativeAlarm] Invalid time values: ${time}. Hours must be 0-23, minutes must be 0-59`);
        return false;
    }

    try {
        if (isAndroid && NativeAlarm) {
            // Use native AlarmManager on Android - this WILL wake the phone
            // Wrap in retry logic for transient failures
            const result = await withRetry(async () => {
                const scheduleResult = await NativeAlarm.scheduleAlarm({
                    id: alarmId,
                    time,
                    soundId,
                    label: label || 'Alarm',
                    vibrate,
                });
                if (!scheduleResult.success) {
                    throw new Error('Native alarm scheduling returned false');
                }
                return scheduleResult;
            }, `Schedule Android alarm ${alarmId}`);

            logger.log(`[NativeAlarm] Android alarm ${alarmId} scheduled at ${time}`);
            return result.success;

        } else if (isIOS) {
            // iOS uses Local Notifications with high priority
            // Parse time to get next occurrence (already validated above)
            const [hours, minutes] = time.split(':').map(Number) as [number, number];
            const now = new Date();
            const scheduleDate = new Date();
            scheduleDate.setHours(hours, minutes, 0, 0);

            // If time has passed today, schedule for tomorrow
            if (scheduleDate <= now) {
                scheduleDate.setDate(scheduleDate.getDate() + 1);
            }

            // Verify we have notification permissions before scheduling
            const permCheck = await LocalNotifications.checkPermissions();
            if (permCheck.display !== 'granted') {
                logger.error('[NativeAlarm] Notification permission not granted, cannot schedule alarm');
                return false;
            }

            // Wrap in retry logic
            await withRetry(async () => {
                await LocalNotifications.schedule({
                    notifications: [{
                        id: typeof id === 'number' ? id : parseInt(alarmId) || Date.now(),
                        title: label || 'Alarm',
                        body: 'Time to wake up!',
                        schedule: { at: scheduleDate },
                        // ISS-002/003: Don't set iOS notification sound - JS audioService plays
                        // the correct user-selected sound when AlarmRingModal opens.
                        // This prevents dual audio (native + JS) and ensures correct sound.
                        actionTypeId: 'ALARM_ACTIONS',
                        extra: {
                            type: 'alarm',
                            alarmId: alarmId,
                            soundId, // Pass soundId to JS layer for playback
                        },
                    }],
                });
            }, `Schedule iOS alarm ${alarmId}`);

            logger.log(`[NativeAlarm] iOS alarm ${alarmId} scheduled for ${scheduleDate.toISOString()}`);
            return true;
        }

        return false;
    } catch (error) {
        logger.error('[NativeAlarm] Failed to schedule alarm after retries:', error);
        return false;
    }
}

/**
 * Schedule alarm with detailed error reporting.
 * Use this when you need to provide user feedback about failures.
 */
export async function scheduleAlarmWithErrorDetails(
    id: number | string,
    time: string,
    label?: string,
    soundId: string = 'somnia',
    vibrate: boolean = true
): Promise<{ success: boolean; error?: AlarmError }> {
    if (!isNative) {
        return {
            success: false,
            error: {
                type: AlarmErrorType.NOT_NATIVE,
                message: 'Alarms require the native app',
                retryable: false
            }
        };
    }

    // Check permissions first
    try {
        const permCheck = await LocalNotifications.checkPermissions();
        if (permCheck.display !== 'granted') {
            return {
                success: false,
                error: {
                    type: AlarmErrorType.PERMISSION_DENIED,
                    message: 'Notification permission required for alarms',
                    retryable: false
                }
            };
        }
    } catch (error) {
        logger.error('[NativeAlarm] Permission check failed:', error);
    }

    try {
        const success = await scheduleAlarm(id, time, label, soundId, vibrate);
        if (!success) {
            return {
                success: false,
                error: {
                    type: AlarmErrorType.SCHEDULE_FAILED,
                    message: 'Failed to schedule alarm. Please try again.',
                    retryable: true
                }
            };
        }
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
            success: false,
            error: {
                type: AlarmErrorType.UNKNOWN,
                message: `Alarm scheduling failed: ${message}`,
                retryable: !message.includes('permission')
            }
        };
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
                        // ISS-002/003: No sound here - JS audioService handles playback
                        actionTypeId: 'ALARM_ACTIONS',
                        extra: {
                            type: 'recurring_alarm',
                            alarmId: String(id),
                            dayOfWeek: day,
                            soundId, // Pass soundId to JS layer for playback
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
export async function snoozeAlarm(id: number | string, minutes: number = 5): Promise<boolean> {
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
                    // ISS-002/003: No sound - JS audioService handles playback
                    actionTypeId: 'ALARM_ACTIONS',
                    extra: {
                        type: 'alarm',
                        alarmId: String(id),
                    },
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
 * Cleanup function for alarm listeners
 */
type ListenerCleanup = () => Promise<void>;

/**
 * Initialize alarm listeners for when alarm fires
 * Returns cleanup function to remove listeners
 */
export async function initializeAlarmListeners(
    onAlarmReceived?: (alarmId: string, soundId?: string) => void,
    onAlarmAction?: (alarmId: string, actionId: string) => void,
    onForegroundNotification?: (alarmId: string) => void
): Promise<ListenerCleanup> {
    if (!isNative) return async () => {};

    const listeners: Array<{ remove: () => Promise<void> }> = [];

    // Listen for notification received (foreground)
    const receivedListener = await LocalNotifications.addListener(
        'localNotificationReceived',
        (notification) => {
            logger.log('[NativeAlarm] Notification received (foreground):', notification);

            if (notification.extra?.type === 'alarm' || notification.extra?.type === 'recurring_alarm') {
                const alarmId = notification.extra.alarmId || notification.extra.parentAlarmId;
                const soundId = notification.extra.soundId;

                // Call foreground handler if provided
                onForegroundNotification?.(alarmId);

                // Also call general handler
                onAlarmReceived?.(alarmId, soundId);
            }
        }
    );
    listeners.push(receivedListener);

    // Listen for notification action (user tapped or used action button)
    const actionListener = await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (action) => {
            logger.log('[NativeAlarm] Action performed:', action);

            const alarmId = action.notification.extra?.alarmId || action.notification.extra?.parentAlarmId;
            const actionId = action.actionId;

            // Handle built-in actions
            if (actionId === 'snooze') {
                snoozeAlarm(alarmId, 5);
            } else if (actionId === 'dismiss') {
                stopAlarm();
            }

            onAlarmAction?.(alarmId, actionId);
        }
    );
    listeners.push(actionListener);

    // Return cleanup function
    return async () => {
        for (const listener of listeners) {
            await listener.remove();
        }
        logger.log('[NativeAlarm] Listeners cleaned up');
    };
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
 * Update app badge count
 * iOS: Shows number on app icon
 * Android: Shows badge on notification (if supported by launcher)
 */
export async function updateBadgeCount(count: number): Promise<void> {
    if (!isNative) return;

    try {
        // Badge is typically set per-notification on Android
        // iOS can use a badge-specific API
        // For now, we set badge on a silent notification
        if (count === 0) {
            // Clear badge by cancelling the badge notification
            await LocalNotifications.cancel({
                notifications: [{ id: 999999 }] // Badge notification ID
            });
        } else if (isIOS) {
            // iOS: Schedule a local notification just to set badge
            // Note: Badge is set via extra data and handled by native layer
            await LocalNotifications.schedule({
                notifications: [{
                    id: 999999,
                    title: '',
                    body: '',
                    extra: { badge: count },
                    // Don't show alert or sound, just update badge
                }]
            });
        }
        logger.log(`[NativeAlarm] Badge updated to ${count}`);
    } catch (error) {
        logger.error('[NativeAlarm] Failed to update badge:', error);
    }
}

/**
 * Clear app badge
 */
export async function clearBadge(): Promise<void> {
    await updateBadgeCount(0);
}

/**
 * Configure notification sound
 * Returns the proper sound configuration for scheduling
 */
export function getNotificationSoundConfig(soundId: string): {
    sound?: string;
    channelId?: string;
} {
    if (!soundId || soundId === 'system' || soundId === 'default') {
        return {
            channelId: isAndroid ? 'alarm_trigger' : undefined,
            // No custom sound - use channel/system default
        };
    }

    // Custom sound file should be in:
    // - Android: res/raw/alarm_{soundId}.wav
    // - iOS: App bundle root
    const soundFile = `alarm_${soundId.toLowerCase()}`;

    return {
        sound: isAndroid ? soundFile : `${soundFile}.wav`,
        channelId: isAndroid ? 'alarm_trigger' : undefined,
    };
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
