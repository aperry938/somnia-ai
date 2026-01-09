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
import { Alarm, Dream, SleepEntry } from '../types';
import { updateWidget, initializeWidget, WidgetData } from '../services/widgetService';
import { calculateUserStats } from '../services/userStatsService';
import { logger } from '../services/logger';

interface WidgetSyncOptions {
    alarms: Alarm[];
    dreams: Dream[];
    sleepEntries?: SleepEntry[];
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
    sleepEntries: SleepEntry[]
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
    const enabledAlarms = alarms.filter(a => a.isActive);
    if (enabledAlarms.length === 0) return null;

    // Find the next alarm to ring
    let nextAlarm: Alarm | null = null;
    let minMinutesUntil = Infinity;

    for (const alarm of enabledAlarms) {
        const [hours, minutes] = alarm.time.split(':').map(Number);
        const alarmMinutes = (hours ?? 0) * 60 + (minutes ?? 0);

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
 * Calculate average sleep quality (1-5 scale converted to hours estimate)
 * Uses sleep quality as a proxy since we don't track actual duration
 */
function calculateAverageSleep(sleepEntries: SleepEntry[]): number {
    const validEntries = sleepEntries.filter(e => e.sleepQuality && e.sleepQuality > 0);
    if (validEntries.length === 0) return 0;

    // Convert sleep quality (1-5) to estimated hours (5-9)
    // Quality 5 = ~8 hours, Quality 1 = ~5 hours
    const avgQuality = validEntries.reduce((sum, e) => sum + (e.sleepQuality || 3), 0) / validEntries.length;
    return 5 + (avgQuality - 1) * 0.75; // Maps 1-5 to 5-8 hours
}

/**
 * Calculate a simple sleep score (0-100)
 * Based on quality ratings and streak consistency
 */
function calculateSleepScore(
    sleepEntries: SleepEntry[],
    streak: number
): number {
    if (sleepEntries.length === 0) return 0;

    // Calculate average quality (1-5 scale)
    const validEntries = sleepEntries.filter(e => e.sleepQuality && e.sleepQuality > 0);
    if (validEntries.length === 0) return Math.min(streak * 5, 50); // Just streak bonus if no quality data

    const avgQuality = validEntries.reduce((sum, e) => sum + (e.sleepQuality || 3), 0) / validEntries.length;

    // Quality score (1-5 maps to 20-100)
    const qualityScore = Math.round(avgQuality * 20);

    // Consistency bonus from streak (up to 20 points)
    const streakBonus = Math.min(streak * 2, 20);

    // Final score (capped at 100)
    return Math.min(qualityScore + streakBonus, 100);
}

/**
 * Export for manual widget refresh
 */
export function refreshWidget(
    alarms: Alarm[],
    dreams: Dream[],
    sleepEntries: SleepEntry[] = []
): void {
    if (!Capacitor.isNativePlatform()) return;

    const widgetData = calculateWidgetData(alarms, dreams, sleepEntries);
    updateWidget(widgetData);
}
