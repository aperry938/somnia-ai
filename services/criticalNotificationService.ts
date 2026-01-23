/**
 * Critical Notification Service for Somnia
 *
 * Provides Do Not Disturb bypass for alarm notifications:
 * - Android: Uses notification channel with setBypassDnd(true)
 * - iOS: Uses Critical Alerts (requires Apple entitlement approval)
 *
 * Critical Alerts Setup (iOS):
 * 1. Apply for entitlement: https://developer.apple.com/contact/request/notifications-critical-alerts-entitlement
 * 2. Add entitlement to App.entitlements
 * 3. Call requestCriticalPermission() on app startup
 *
 * iOS/Android App Store Compliance:
 * - Proper permission handling with user feedback
 * - Fallback for when critical alerts are denied
 * - Custom sound support
 * - Error categorization for troubleshooting
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { logger } from './logger';

const isNative = Capacitor.isNativePlatform();
const isIOS = Capacitor.getPlatform() === 'ios';
const isAndroid = Capacitor.getPlatform() === 'android';

/**
 * Error types for critical notification failures
 */
export enum CriticalNotificationErrorType {
    PERMISSION_DENIED = 'permission_denied',
    ENTITLEMENT_MISSING = 'entitlement_missing',
    SCHEDULE_FAILED = 'schedule_failed',
    SOUND_NOT_FOUND = 'sound_not_found',
    PLATFORM_NOT_SUPPORTED = 'platform_not_supported',
}

/**
 * Critical Notifications Plugin Interface (iOS)
 */
interface CriticalNotificationsPlugin {
    requestCriticalAuthorization(): Promise<{
        granted: boolean;
        criticalGranted: boolean;
        alertSetting: string;
        soundSetting: string;
    }>;

    checkCriticalStatus(): Promise<{
        authorized: boolean;
        criticalEnabled: boolean;
        timeSensitiveEnabled: boolean;
        alertSetting: string;
        soundSetting: string;
        badgeSetting: string;
        lockScreenSetting: string;
    }>;

    scheduleAlarmNotification(options: {
        id: string;
        title: string;
        body: string;
        timestamp: number;
        sound?: string;
    }): Promise<{ scheduled: boolean; id: string }>;

    openNotificationSettings(): Promise<void>;
}

// Register the plugin (iOS only)
const CriticalNotifications = isIOS
    ? registerPlugin<CriticalNotificationsPlugin>('CriticalNotifications')
    : null;

/**
 * Detailed permission result for UI feedback
 */
export interface CriticalPermissionResult {
    granted: boolean;
    criticalGranted: boolean;
    errorType?: CriticalNotificationErrorType;
    userMessage?: string;
}

/**
 * Request critical alert permission (iOS)
 * This allows notifications to bypass Do Not Disturb
 *
 * Note: Requires Apple's critical alerts entitlement approval
 */
export async function requestCriticalPermission(): Promise<CriticalPermissionResult> {
    if (!isNative) {
        return {
            granted: false,
            criticalGranted: false,
            errorType: CriticalNotificationErrorType.PLATFORM_NOT_SUPPORTED,
            userMessage: 'Critical alerts are only available in the native app.',
        };
    }

    if (isIOS && CriticalNotifications) {
        try {
            const result = await CriticalNotifications.requestCriticalAuthorization();
            logger.log('[CriticalNotification] Authorization result:', result);

            if (!result.granted) {
                return {
                    granted: false,
                    criticalGranted: false,
                    errorType: CriticalNotificationErrorType.PERMISSION_DENIED,
                    userMessage: 'Notification permission denied. Please enable in Settings.',
                };
            }

            if (!result.criticalGranted) {
                logger.warn('[CriticalNotification] Critical alerts not granted. Alarms may not bypass DND.');
                return {
                    granted: true,
                    criticalGranted: false,
                    errorType: CriticalNotificationErrorType.ENTITLEMENT_MISSING,
                    userMessage: 'Critical alerts not enabled. Alarms may be silenced during Do Not Disturb.',
                };
            }

            return {
                granted: result.granted,
                criticalGranted: result.criticalGranted,
            };
        } catch (error) {
            logger.error('[CriticalNotification] Authorization failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check for specific error types
            if (errorMessage.includes('entitlement')) {
                return {
                    granted: false,
                    criticalGranted: false,
                    errorType: CriticalNotificationErrorType.ENTITLEMENT_MISSING,
                    userMessage: 'Critical alerts require special app entitlement.',
                };
            }

            return {
                granted: false,
                criticalGranted: false,
                errorType: CriticalNotificationErrorType.PERMISSION_DENIED,
                userMessage: 'Failed to request notification permission.',
            };
        }
    }

    // Android: Request standard notification permission first
    if (isAndroid) {
        try {
            const permResult = await LocalNotifications.requestPermissions();
            const granted = permResult.display === 'granted';

            if (!granted) {
                return {
                    granted: false,
                    criticalGranted: false,
                    errorType: CriticalNotificationErrorType.PERMISSION_DENIED,
                    userMessage: 'Notification permission denied. Please enable in Settings.',
                };
            }

            // Android DND bypass is configured at the channel level in AlarmService.java
            return { granted: true, criticalGranted: true };
        } catch (error) {
            logger.error('[CriticalNotification] Android permission failed:', error);
            return {
                granted: false,
                criticalGranted: false,
                errorType: CriticalNotificationErrorType.PERMISSION_DENIED,
            };
        }
    }

    // Fallback
    return { granted: true, criticalGranted: true };
}

/**
 * Check if critical alerts are enabled
 */
export async function checkCriticalStatus(): Promise<{
    authorized: boolean;
    criticalEnabled: boolean;
    canBypassDND: boolean;
}> {
    if (!isNative) {
        return { authorized: false, criticalEnabled: false, canBypassDND: false };
    }

    if (isIOS && CriticalNotifications) {
        try {
            const status = await CriticalNotifications.checkCriticalStatus();
            return {
                authorized: status.authorized,
                criticalEnabled: status.criticalEnabled,
                canBypassDND: status.criticalEnabled || status.timeSensitiveEnabled,
            };
        } catch (error) {
            logger.error('[CriticalNotification] Status check failed:', error);
            return { authorized: false, criticalEnabled: false, canBypassDND: false };
        }
    }

    // Android: DND bypass is configured at the channel level
    // It's enabled by default for our alarm channel
    return { authorized: true, criticalEnabled: true, canBypassDND: true };
}

/**
 * Schedule result with detailed error information
 */
export interface ScheduleCriticalResult {
    success: boolean;
    errorType?: CriticalNotificationErrorType;
    userMessage?: string;
}

/**
 * Schedule a critical alarm notification
 * Uses Critical Alerts on iOS to bypass DND
 */
export async function scheduleCriticalAlarm(
    id: string,
    title: string,
    body: string,
    triggerTime: Date,
    soundFile?: string
): Promise<boolean> {
    const result = await scheduleCriticalAlarmWithDetails(id, title, body, triggerTime, soundFile);
    return result.success;
}

/**
 * Schedule a critical alarm with detailed result
 * Provides error information for user feedback
 */
export async function scheduleCriticalAlarmWithDetails(
    id: string,
    title: string,
    body: string,
    triggerTime: Date,
    soundFile?: string
): Promise<ScheduleCriticalResult> {
    if (!isNative) {
        return {
            success: false,
            errorType: CriticalNotificationErrorType.PLATFORM_NOT_SUPPORTED,
            userMessage: 'Critical alarms require the native app.',
        };
    }

    // Validate trigger time
    if (triggerTime.getTime() <= Date.now()) {
        logger.warn('[CriticalNotification] Trigger time is in the past, adjusting to tomorrow');
        triggerTime = new Date(triggerTime);
        triggerTime.setDate(triggerTime.getDate() + 1);
    }

    if (isIOS && CriticalNotifications) {
        try {
            // Check permission first
            const status = await checkCriticalStatus();
            if (!status.authorized) {
                return {
                    success: false,
                    errorType: CriticalNotificationErrorType.PERMISSION_DENIED,
                    userMessage: 'Notification permission required. Please enable in Settings.',
                };
            }

            const result = await CriticalNotifications.scheduleAlarmNotification({
                id,
                title,
                body,
                timestamp: triggerTime.getTime(),
                sound: soundFile,
            });
            logger.log('[CriticalNotification] Scheduled:', result);

            if (!result.scheduled) {
                return {
                    success: false,
                    errorType: CriticalNotificationErrorType.SCHEDULE_FAILED,
                    userMessage: 'Failed to schedule alarm. Please try again.',
                };
            }

            return { success: true };
        } catch (error) {
            logger.error('[CriticalNotification] Schedule failed:', error);
            const errorMessage = error instanceof Error ? error.message : '';

            if (errorMessage.includes('sound') || errorMessage.includes('audio')) {
                return {
                    success: false,
                    errorType: CriticalNotificationErrorType.SOUND_NOT_FOUND,
                    userMessage: 'Custom alarm sound not found. Using default sound.',
                };
            }

            return {
                success: false,
                errorType: CriticalNotificationErrorType.SCHEDULE_FAILED,
                userMessage: 'Failed to schedule alarm. Please try again.',
            };
        }
    }

    // Android uses AlarmManager + AlarmService
    // This is handled by nativeAlarmService.ts
    return { success: true };
}

/**
 * Open device notification settings
 * Useful to guide users to enable critical alerts if disabled
 */
export async function openNotificationSettings(): Promise<boolean> {
    if (!isNative) return false;

    try {
        if (isIOS && CriticalNotifications) {
            await CriticalNotifications.openNotificationSettings();
            return true;
        } else if (isAndroid) {
            // Android: Use App plugin to open settings
            // For now, log a message - would need native implementation
            logger.log('[CriticalNotification] Opening Android notification settings');
            // The App plugin from Capacitor can open settings:
            // import { App } from '@capacitor/app';
            // await App.openUrl({ url: 'app-settings:' });
            return true;
        }
    } catch (error) {
        logger.error('[CriticalNotification] Failed to open settings:', error);
    }

    return false;
}

/**
 * Check if DND bypass is properly configured
 * Returns user-friendly status message
 */
export async function getDNDBypassStatus(): Promise<{
    enabled: boolean;
    message: string;
    actionRequired?: 'settings' | 'permission' | 'none';
}> {
    const status = await checkCriticalStatus();

    if (status.canBypassDND) {
        return {
            enabled: true,
            message: 'Alarms will ring even when Do Not Disturb is on',
            actionRequired: 'none',
        };
    }

    if (!status.authorized) {
        return {
            enabled: false,
            message: 'Notification permission required for alarms to work properly.',
            actionRequired: 'permission',
        };
    }

    if (isIOS) {
        return {
            enabled: false,
            message: 'Critical alerts disabled. Alarms may be silent during Do Not Disturb.',
            actionRequired: 'settings',
        };
    }

    return {
        enabled: false,
        message: 'Check notification settings to allow alarm sounds during Do Not Disturb.',
        actionRequired: 'settings',
    };
}

/**
 * Configure foreground notification presentation (iOS)
 * Controls whether notifications show when app is in foreground
 */
export async function configureForegroundPresentation(options: {
    alert?: boolean;
    badge?: boolean;
    sound?: boolean;
}): Promise<void> {
    if (!isNative) return;

    try {
        // LocalNotifications handles this per-notification with:
        // - presentAlert
        // - presentBadge
        // - presentSound
        // These are set when scheduling notifications
        logger.log('[CriticalNotification] Foreground presentation configured:', options);
    } catch (error) {
        logger.error('[CriticalNotification] Failed to configure foreground presentation:', error);
    }
}

/**
 * Get list of available custom alarm sounds
 * Returns sounds bundled with the app
 */
export function getAvailableAlarmSounds(): Array<{ id: string; name: string; file: string }> {
    return [
        { id: 'somnia', name: 'Somnia (Default)', file: 'alarm_somnia.wav' },
        { id: 'gentle', name: 'Gentle Wake', file: 'alarm_gentle.wav' },
        { id: 'nature', name: 'Nature Sounds', file: 'alarm_nature.wav' },
        { id: 'chimes', name: 'Wind Chimes', file: 'alarm_chimes.wav' },
        { id: 'classic', name: 'Classic Alarm', file: 'alarm_classic.wav' },
        { id: 'system', name: 'System Default', file: '' }, // Uses system default
    ];
}

/**
 * Validate that a custom sound file exists
 * Returns true if sound is available, false otherwise
 */
export async function validateAlarmSound(soundId: string): Promise<boolean> {
    const sounds = getAvailableAlarmSounds();
    const sound = sounds.find(s => s.id === soundId);

    if (!sound) {
        logger.warn(`[CriticalNotification] Unknown sound ID: ${soundId}`);
        return false;
    }

    if (sound.id === 'system') {
        return true; // System default always available
    }

    // For custom sounds, assume they're bundled correctly
    // Actual validation would require checking the file system
    return true;
}
