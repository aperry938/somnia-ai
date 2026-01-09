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
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { logger } from './logger';

const isNative = Capacitor.isNativePlatform();
const isIOS = Capacitor.getPlatform() === 'ios';

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
 * Request critical alert permission (iOS)
 * This allows notifications to bypass Do Not Disturb
 *
 * Note: Requires Apple's critical alerts entitlement approval
 */
export async function requestCriticalPermission(): Promise<{
    granted: boolean;
    criticalGranted: boolean;
}> {
    if (!isNative) {
        return { granted: false, criticalGranted: false };
    }

    if (isIOS && CriticalNotifications) {
        try {
            const result = await CriticalNotifications.requestCriticalAuthorization();
            logger.log('[CriticalNotification] Authorization result:', result);

            if (!result.criticalGranted) {
                logger.warn('[CriticalNotification] Critical alerts not granted. Alarms may not bypass DND.');
            }

            return {
                granted: result.granted,
                criticalGranted: result.criticalGranted,
            };
        } catch (error) {
            logger.error('[CriticalNotification] Authorization failed:', error);
            return { granted: false, criticalGranted: false };
        }
    }

    // Android uses notification channel configuration
    // DND bypass is already set in AlarmService.java
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
    if (!isNative) return false;

    if (isIOS && CriticalNotifications) {
        try {
            const result = await CriticalNotifications.scheduleAlarmNotification({
                id,
                title,
                body,
                timestamp: triggerTime.getTime(),
                sound: soundFile,
            });
            logger.log('[CriticalNotification] Scheduled:', result);
            return result.scheduled;
        } catch (error) {
            logger.error('[CriticalNotification] Schedule failed:', error);
            return false;
        }
    }

    // Android uses AlarmManager + AlarmService
    // This is handled by nativeAlarmService.ts
    return true;
}

/**
 * Open device notification settings
 * Useful to guide users to enable critical alerts if disabled
 */
export async function openNotificationSettings(): Promise<void> {
    if (!isNative) return;

    if (isIOS && CriticalNotifications) {
        await CriticalNotifications.openNotificationSettings();
    } else {
        // Android: Open app notification settings
        // Could implement native settings intent
        logger.log('[CriticalNotification] Android settings not implemented');
    }
}

/**
 * Check if DND bypass is properly configured
 * Returns user-friendly status message
 */
export async function getDNDBypassStatus(): Promise<{
    enabled: boolean;
    message: string;
}> {
    const status = await checkCriticalStatus();

    if (status.canBypassDND) {
        return {
            enabled: true,
            message: 'Alarms will ring even when Do Not Disturb is on',
        };
    }

    if (isIOS) {
        return {
            enabled: false,
            message: 'Critical alerts disabled. Alarms may be silent during Do Not Disturb.',
        };
    }

    return {
        enabled: false,
        message: 'Check notification settings to allow alarm sounds during Do Not Disturb.',
    };
}
