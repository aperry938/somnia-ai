// hooks/useAlarmNotification.ts
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Alarm } from '../types';
import { logger } from '../services/logger';

const isNative = Capacitor.isNativePlatform();

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
        const alarmMinutes = hours * 60 + minutes;

        // Check if alarm triggers today
        const triggersToday = !alarm.days || alarm.days.length === 0 || alarm.days.includes(currentDay);

        if (triggersToday && alarmMinutes > currentMinutes) {
            // Alarm is later today
            const diff = alarmMinutes - currentMinutes;
            if (diff < minDiff) {
                minDiff = diff;
                nextAlarm = alarm;
                nextDate = new Date(now);
                nextDate.setHours(hours, minutes, 0, 0);
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
                        nextDate.setHours(hours, minutes, 0, 0);
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
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
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

    const title = 'Alarm Set';
    const body = label ? `${timeStr} - ${label}` : timeStr;

    try {
        // Cancel existing status notification first
        await LocalNotifications.cancel({ notifications: [{ id: ALARM_STATUS_NOTIFICATION_ID }] });

        // Schedule as immediate notification (shows now, doesn't auto-dismiss)
        await LocalNotifications.schedule({
            notifications: [{
                id: ALARM_STATUS_NOTIFICATION_ID,
                title,
                body,
                ongoing: true,
                autoCancel: false,
                smallIcon: 'ic_stat_alarm',
                largeIcon: 'ic_launcher',
            }]
        } as ScheduleOptions);

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
 * Schedule the actual alarm notification that fires at the alarm time
 */
const scheduleAlarmTrigger = async (alarm: Alarm, nextDate: Date): Promise<void> => {
    if (!isNative) return;

    const alarmNotificationId = alarm.id + 1000; // Offset to avoid collision with status notification

    try {
        // Cancel any existing scheduled alarm for this alarm ID
        await LocalNotifications.cancel({ notifications: [{ id: alarmNotificationId }] });

        // Schedule the alarm notification
        await LocalNotifications.schedule({
            notifications: [{
                id: alarmNotificationId,
                title: alarm.label || 'Alarm',
                body: 'Time to wake up!',
                schedule: { at: nextDate },
                sound: 'alarm.wav',
                smallIcon: 'ic_stat_alarm',
                largeIcon: 'ic_launcher',
                actionTypeId: 'ALARM_ACTIONS',
            }]
        });

        logger.log('[AlarmNotification] Alarm scheduled for:', nextDate.toISOString());
    } catch (e) {
        logger.warn('[AlarmNotification] Failed to schedule alarm:', e);
    }
};

/**
 * Hook to manage alarm notifications using Capacitor Local Notifications
 * Shows a persistent notification when an alarm is set and schedules the actual alarm
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
                    await scheduleAlarmTrigger(next.alarm, next.nextDate);
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
    if (!isNative) return false;

    try {
        const status = await LocalNotifications.checkPermissions();
        if (status.display === 'granted') return true;

        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
    } catch (e) {
        logger.warn('[AlarmNotification] Permission request failed:', e);
        return false;
    }
};
