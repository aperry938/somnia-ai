import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { logger } from '../services/logger';

const STORAGE_KEY = 'somnia_sleep_detection';
const LAST_ACTIVITY_KEY = 'somnia_last_activity';
const SLEEP_DETECTION_NOTIFICATION_ID = 999999;

interface SleepDetectionSettings {
    enabled: boolean;
    inactivityHours: number; // Hours of inactivity before prompting
    soundId: string; // Alarm sound to use when triggered
}

const DEFAULT_SETTINGS: SleepDetectionSettings = {
    enabled: false,
    inactivityHours: 5,
    soundId: 'somnia'
};

/**
 * Schedule a native notification to fire after the inactivity threshold.
 * This works even when the app is closed/phone is locked.
 */
export const scheduleSleepDetectionNotification = async (hoursFromNow: number, soundId: string): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;

    try {
        // Cancel any existing sleep detection notification first
        await cancelSleepDetectionNotification();

        const notificationTime = new Date();
        notificationTime.setTime(notificationTime.getTime() + hoursFromNow * 60 * 60 * 1000);

        await LocalNotifications.schedule({
            notifications: [{
                id: SLEEP_DETECTION_NOTIFICATION_ID,
                title: 'Good morning! 🌅',
                body: 'Time to record your dreams while they\'re fresh!',
                schedule: { at: notificationTime },
                sound: `${soundId}.wav`,
                actionTypeId: 'SLEEP_DETECTION_WAKE',
                extra: { type: 'sleep_detection', soundId },
            }]
        });

        logger.log('[SleepDetection] Scheduled notification for', notificationTime.toLocaleString());
    } catch (error) {
        logger.error('[SleepDetection] Failed to schedule notification:', error);
    }
};

/**
 * Cancel the sleep detection notification.
 */
export const cancelSleepDetectionNotification = async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;

    try {
        await LocalNotifications.cancel({ notifications: [{ id: SLEEP_DETECTION_NOTIFICATION_ID }] });
        logger.log('[SleepDetection] Cancelled notification');
    } catch (error) {
        logger.error('[SleepDetection] Failed to cancel notification:', error);
    }
};

/**
 * Request notification permissions. Returns true if granted.
 */
export const requestSleepDetectionPermissions = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
    } catch (error) {
        logger.error('[SleepDetection] Failed to request permissions:', error);
        return false;
    }
};

/**
 * Hook to detect phone inactivity and prompt dream logging.
 * Uses native local notifications for reliable wake-up when phone is locked.
 * @param onWakePrompt - Called with the sound ID to use when inactivity threshold is met
 */
export const useSleepDetection = (onWakePrompt: (soundId: string) => void) => {
    const checkIntervalRef = useRef<number | null>(null);
    const onWakePromptRef = useRef(onWakePrompt);

    // Keep the callback ref updated
    useEffect(() => {
        onWakePromptRef.current = onWakePrompt;
    }, [onWakePrompt]);

    // Get settings from localStorage
    const getSettings = useCallback((): SleepDetectionSettings => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
        } catch {
            return DEFAULT_SETTINGS;
        }
    }, []);

    // Save settings to localStorage
    const saveSettings = useCallback((settings: SleepDetectionSettings) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, []);

    // Update last activity timestamp AND reschedule notification
    const recordActivity = useCallback(async () => {
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());

        // Reschedule the notification further into the future
        const settings = getSettings();
        if (settings.enabled && Capacitor.isNativePlatform()) {
            await scheduleSleepDetectionNotification(settings.inactivityHours, settings.soundId);
        }
    }, [getSettings]);

    // Check if inactivity threshold has been reached (fallback for when app is active)
    const checkInactivity = useCallback(() => {
        const settings = getSettings();
        if (!settings.enabled) return false;

        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (!lastActivity) {
            recordActivity();
            return false;
        }

        const lastActivityTime = parseInt(lastActivity, 10);
        const inactivityMs = Date.now() - lastActivityTime;
        const thresholdMs = settings.inactivityHours * 60 * 60 * 1000;

        if (inactivityMs >= thresholdMs) {
            // Reset last activity to prevent repeated prompts
            recordActivity();
            return true;
        }
        return false;
    }, [getSettings, recordActivity]);

    // Setup activity listeners and notification handlers
    useEffect(() => {
        const settings = getSettings();
        if (!settings.enabled) return;

        // Record activity on various user interactions
        const activityEvents = ['touchstart', 'mousedown', 'keydown', 'scroll'];

        const handleActivity = () => {
            if (document.visibilityState === 'visible') {
                recordActivity();
            }
        };

        activityEvents.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Initial activity record and notification schedule
        recordActivity();

        // Handle notification clicks - this fires when user taps the notification
        let notificationListener: { remove: () => void } | undefined;
        if (Capacitor.isNativePlatform()) {
            LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
                if (notification.notification.id === SLEEP_DETECTION_NOTIFICATION_ID) {
                    const soundId = notification.notification.extra?.soundId ?? 'somnia';
                    logger.log('[SleepDetection] Notification tapped, triggering wake prompt with sound:', soundId);
                    onWakePromptRef.current(soundId);
                }
            }).then(listener => {
                notificationListener = listener;
            });
        }

        // Fallback: Check inactivity periodically when app IS active (every 5 minutes)
        checkIntervalRef.current = window.setInterval(() => {
            if (document.visibilityState === 'visible' && checkInactivity()) {
                const settings = getSettings();
                onWakePromptRef.current(settings.soundId);
            }
        }, 5 * 60 * 1000);

        // Also check when app becomes visible after being in background
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Reschedule notification when app comes to foreground
                recordActivity();

                if (checkInactivity()) {
                    const settings = getSettings();
                    onWakePromptRef.current(settings.soundId);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
            notificationListener?.remove();
        };
    }, [getSettings, recordActivity, checkInactivity]);

    return {
        getSettings,
        saveSettings,
        recordActivity
    };
};
