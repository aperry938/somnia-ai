// hooks/useAlarmNotification.ts
import { useEffect, useRef } from 'react';
import { Alarm } from '../types';

/**
 * Get the next upcoming alarm time from a list of alarms
 */
const getNextAlarmTime = (alarms: Alarm[]): { alarm: Alarm; timeStr: string } | null => {
    const activeAlarms = alarms.filter(a => a.isActive);
    if (activeAlarms.length === 0) return null;

    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let nextAlarm: Alarm | null = null;
    let minDiff = Infinity;

    for (const alarm of activeAlarms) {
        const [hours, minutes] = alarm.time.split(':').map(Number);
        const alarmMinutes = hours * 60 + minutes;

        // Check if alarm triggers today
        const triggersToday = !alarm.days || alarm.days.length === 0 || alarm.days.includes(currentDay);

        if (triggersToday && alarmMinutes > currentMinutes) {
            // Alarm is later today
            const diff = alarmMinutes - currentMinutes;
            if (diff < minDiff) {
                minDiff = diff;
                nextAlarm = alarm;
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
                    }
                    break;
                }
            }
        } else if (!triggersToday) {
            // One-time alarm that's already passed today - won't trigger
            continue;
        }
    }

    if (!nextAlarm) return null;

    // Format time for display
    const [h, m] = nextAlarm.time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    const timeStr = `${displayHour}:${String(m).padStart(2, '0')} ${period}`;

    return { alarm: nextAlarm, timeStr };
};

/**
 * Notification tag for alarm - allows updating existing notification
 */
const ALARM_NOTIFICATION_TAG = 'somnia-alarm-set';

/**
 * Shows or updates the alarm notification in the status bar
 */
const showAlarmNotification = async (timeStr: string, label?: string): Promise<void> => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    const title = 'Alarm Set';
    const body = label ? `${timeStr} - ${label}` : timeStr;

    // Close existing notification first (if any)
    // Then show new one with same tag (replaces it)
    try {
        const registration = await navigator.serviceWorker?.ready;
        if (registration) {
            // Use service worker for persistent notification
            await registration.showNotification(title, {
                body,
                tag: ALARM_NOTIFICATION_TAG,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                silent: true,
                requireInteraction: false,
                // @ts-ignore - ongoing is supported on Android
                ongoing: true,
            });
        } else {
            // Fallback to regular notification
            new Notification(title, {
                body,
                tag: ALARM_NOTIFICATION_TAG,
                icon: '/icon-192.png',
                silent: true,
            });
        }
    } catch (e) {
        logger.warn('[AlarmNotification] Failed to show notification:', e);
    }
};

/**
 * Clears the alarm notification from status bar
 */
const clearAlarmNotification = async (): Promise<void> => {
    try {
        const registration = await navigator.serviceWorker?.ready;
        if (registration) {
            const notifications = await registration.getNotifications({ tag: ALARM_NOTIFICATION_TAG });
            notifications.forEach(n => n.close());
        }
    } catch (e) {
        logger.warn('[AlarmNotification] Failed to clear notification:', e);
    }
};

/**
 * Hook to manage alarm status bar notification
 * Shows a persistent notification when an alarm is set
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
 */
export const requestAlarmNotificationPermission = async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;

    if (Notification.permission === 'granted') return true;

    if (Notification.permission !== 'denied') {
        const result = await Notification.requestPermission();
        return result === 'granted';
    }

    return false;
};
