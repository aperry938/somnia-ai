/**
 * useWidgetSync - Automatically sync app data to home screen widgets
 *
 * Keeps the widget up-to-date with:
 * - Next alarm time and label
 * - Average sleep duration
 * - Sleep score
 * - Dream logging streak
 *
 * Updates widget whenever relevant data changes.
 */

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Alarm, Dream } from '../types';
import { updateWidget, initializeWidget, WidgetData } from '../services/widgetService';
import { calculateUserStats } from '../services/userStatsService';
import { logger } from '../services/logger';

interface WidgetSyncOptions {
    alarms: Alarm[];
    dreams: Dream[];
    sleepEntries?: Array<{ duration?: number }>;
}

export function useWidgetSync({ alarms, dreams, sleepEntries = [] }: WidgetSyncOptions): void {
    const lastUpdateRef = useRef<string>('');

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        // Calculate widget data
        const widgetData = calculateWidgetData(alarms, dreams, sleepEntries);

        // Only update if data has changed
        const dataHash = JSON.stringify(widgetData);
        if (dataHash === lastUpdateRef.current) {
            return;
        }

        lastUpdateRef.current = dataHash;

        // Update widget
        updateWidget(widgetData).then(() => {
            logger.log('[WidgetSync] Widget updated:', widgetData);
        }).catch((error) => {
            logger.error('[WidgetSync] Failed to update widget:', error);
        });

    }, [alarms, dreams, sleepEntries]);

    // Initialize widget on mount
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        const widgetData = calculateWidgetData(alarms, dreams, sleepEntries);
        initializeWidget(widgetData);
    }, []); // Only run on mount
}

/**
 * Calculate all widget data from app state
 */
function calculateWidgetData(
    alarms: Alarm[],
    dreams: Dream[],
    sleepEntries: Array<{ duration?: number }>
): WidgetData {
    // Get next active alarm
    const nextAlarm = getNextAlarm(alarms);

    // Calculate user stats (includes streak)
    const stats = calculateUserStats(dreams);

    // Calculate average sleep from entries
    const avgSleep = calculateAverageSleep(sleepEntries);

    // Sleep score (simple calculation based on consistency)
    const sleepScore = calculateSleepScore(sleepEntries, stats.currentStreak);

    return {
        alarmTime: nextAlarm?.time || null,
        alarmLabel: nextAlarm?.label || 'No alarm set',
        avgSleep,
        sleepScore,
        streak: stats.currentStreak,
    };
}

/**
 * Get the next upcoming alarm
 */
function getNextAlarm(alarms: Alarm[]): Alarm | null {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday

    // Filter enabled alarms
    const enabledAlarms = alarms.filter(a => a.enabled);
    if (enabledAlarms.length === 0) return null;

    // Find the next alarm to ring
    let nextAlarm: Alarm | null = null;
    let minMinutesUntil = Infinity;

    for (const alarm of enabledAlarms) {
        const [hours, minutes] = alarm.time.split(':').map(Number);
        const alarmMinutes = hours * 60 + minutes;

        // Check if alarm is set for today or specific days
        const isForToday = !alarm.days || alarm.days.length === 0 ||
            alarm.days.includes(currentDay);

        if (isForToday) {
            let minutesUntil = alarmMinutes - currentMinutes;

            // If alarm time has passed today, add 24 hours
            if (minutesUntil <= 0) {
                minutesUntil += 24 * 60;
            }

            if (minutesUntil < minMinutesUntil) {
                minMinutesUntil = minutesUntil;
                nextAlarm = alarm;
            }
        }
    }

    return nextAlarm;
}

/**
 * Calculate average sleep duration in hours
 */
function calculateAverageSleep(sleepEntries: Array<{ duration?: number }>): number {
    const validEntries = sleepEntries.filter(e => e.duration && e.duration > 0);
    if (validEntries.length === 0) return 0;

    const totalMinutes = validEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
    return totalMinutes / validEntries.length / 60; // Convert to hours
}

/**
 * Calculate a simple sleep score (0-100)
 * Based on consistency and adequate sleep duration
 */
function calculateSleepScore(
    sleepEntries: Array<{ duration?: number }>,
    streak: number
): number {
    if (sleepEntries.length === 0) return 0;

    const avgHours = calculateAverageSleep(sleepEntries);

    // Base score from average sleep (7-9 hours is ideal)
    let durationScore = 0;
    if (avgHours >= 7 && avgHours <= 9) {
        durationScore = 100;
    } else if (avgHours >= 6 && avgHours < 7) {
        durationScore = 75;
    } else if (avgHours > 9 && avgHours <= 10) {
        durationScore = 85;
    } else if (avgHours >= 5 && avgHours < 6) {
        durationScore = 50;
    } else {
        durationScore = 30;
    }

    // Consistency bonus from streak (up to 20 points)
    const streakBonus = Math.min(streak * 2, 20);

    // Final score (capped at 100)
    return Math.min(Math.round((durationScore * 0.8) + streakBonus), 100);
}

/**
 * Export for manual widget refresh
 */
export function refreshWidget(
    alarms: Alarm[],
    dreams: Dream[],
    sleepEntries: Array<{ duration?: number }> = []
): void {
    if (!Capacitor.isNativePlatform()) return;

    const widgetData = calculateWidgetData(alarms, dreams, sleepEntries);
    updateWidget(widgetData);
}
