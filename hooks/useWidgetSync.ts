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
 * Includes debouncing, cleanup, and background refresh support.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App, AppState } from '@capacitor/app';
import { Alarm, Dream, SleepEntry } from '../types';
import {
    updateWidget,
    initializeWidget,
    WidgetData,
    cleanupWidgetService,
    refreshWidgets,
} from '../services/widgetService';
import { calculateUserStats } from '../services/userStatsService';
import { logger } from '../services/logger';

// Debounce delay for widget updates (prevents rapid successive updates)
const DEBOUNCE_DELAY = 500; // 500ms

// Background refresh interval (15 minutes matches iOS WidgetKit timeline)
const BACKGROUND_REFRESH_INTERVAL = 15 * 60 * 1000;

interface WidgetSyncOptions {
    alarms: Alarm[];
    dreams: Dream[];
    sleepEntries?: SleepEntry[];
    enableBackgroundRefresh?: boolean;
}

export function useWidgetSync({
    alarms,
    dreams,
    sleepEntries = [],
    enableBackgroundRefresh = true,
}: WidgetSyncOptions): void {
    const lastUpdateRef = useRef<string>('');
    const hasInitializedRef = useRef(false);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const backgroundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const appStateListenerRef = useRef<{ remove: () => Promise<void> } | null>(null);
    const isMountedRef = useRef(true);

    // Keep refs for current values to use in initialization and background refresh
    const alarmsRef = useRef(alarms);
    const dreamsRef = useRef(dreams);
    const sleepEntriesRef = useRef(sleepEntries);

    // Update refs when values change
    useEffect(() => {
        alarmsRef.current = alarms;
        dreamsRef.current = dreams;
        sleepEntriesRef.current = sleepEntries;
    }, [alarms, dreams, sleepEntries]);

    // Memoized update function with debouncing
    const scheduleWidgetUpdate = useCallback((widgetData: WidgetData, force = false) => {
        if (!isMountedRef.current) return;

        // Clear any pending debounced update
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
            debounceTimeoutRef.current = null;
        }

        if (force) {
            // Immediate update (e.g., on app resume)
            updateWidget(widgetData).then(() => {
                if (isMountedRef.current) {
                    logger.log('[WidgetSync] Widget updated (forced):', widgetData);
                }
            }).catch((error) => {
                logger.error('[WidgetSync] Failed to update widget:', error);
            });
        } else {
            // Debounced update
            debounceTimeoutRef.current = setTimeout(() => {
                if (!isMountedRef.current) return;
                debounceTimeoutRef.current = null;

                updateWidget(widgetData).then(() => {
                    if (isMountedRef.current) {
                        logger.log('[WidgetSync] Widget updated:', widgetData);
                    }
                }).catch((error) => {
                    logger.error('[WidgetSync] Failed to update widget:', error);
                });
            }, DEBOUNCE_DELAY);
        }
    }, []);

    // Handle data changes with debouncing
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
        scheduleWidgetUpdate(widgetData);

    }, [alarms, dreams, sleepEntries, scheduleWidgetUpdate]);

    // Initialize widget on mount
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        if (hasInitializedRef.current) {
            return;
        }

        hasInitializedRef.current = true;
        const widgetData = calculateWidgetData(
            alarmsRef.current,
            dreamsRef.current,
            sleepEntriesRef.current
        );
        initializeWidget(widgetData);
    }, []);

    // Set up app state listener for foreground/background transitions
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        const handleAppStateChange = (state: AppState) => {
            if (!isMountedRef.current) return;

            if (state.isActive) {
                // App came to foreground - refresh widget with current data
                logger.log('[WidgetSync] App resumed, refreshing widget');
                const widgetData = calculateWidgetData(
                    alarmsRef.current,
                    dreamsRef.current,
                    sleepEntriesRef.current
                );
                lastUpdateRef.current = ''; // Force update
                scheduleWidgetUpdate(widgetData, true);
            }
        };

        App.addListener('appStateChange', handleAppStateChange).then((listener) => {
            if (isMountedRef.current) {
                appStateListenerRef.current = listener;
            } else {
                // Component unmounted before listener was set up
                listener.remove();
            }
        }).catch((error) => {
            logger.error('[WidgetSync] Failed to add app state listener:', error);
        });

        return () => {
            if (appStateListenerRef.current) {
                appStateListenerRef.current.remove();
                appStateListenerRef.current = null;
            }
        };
    }, [scheduleWidgetUpdate]);

    // Set up background refresh interval
    useEffect(() => {
        if (!Capacitor.isNativePlatform() || !enableBackgroundRefresh) {
            return;
        }

        backgroundIntervalRef.current = setInterval(() => {
            if (!isMountedRef.current) return;

            logger.log('[WidgetSync] Background refresh triggered');
            refreshWidgets().catch((error) => {
                logger.error('[WidgetSync] Background refresh failed:', error);
            });
        }, BACKGROUND_REFRESH_INTERVAL);

        return () => {
            if (backgroundIntervalRef.current) {
                clearInterval(backgroundIntervalRef.current);
                backgroundIntervalRef.current = null;
            }
        };
    }, [enableBackgroundRefresh]);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;

            // Clear debounce timeout
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
                debounceTimeoutRef.current = null;
            }

            // Clear background interval
            if (backgroundIntervalRef.current) {
                clearInterval(backgroundIntervalRef.current);
                backgroundIntervalRef.current = null;
            }

            // Cleanup widget service
            cleanupWidgetService();
        };
    }, []);
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
): Promise<void> {
    if (!Capacitor.isNativePlatform()) return Promise.resolve();

    const widgetData = calculateWidgetData(alarms, dreams, sleepEntries);
    return updateWidget(widgetData);
}

/**
 * Force a full widget refresh (useful after significant state changes)
 */
export function forceWidgetRefresh(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return Promise.resolve();

    return refreshWidgets();
}
