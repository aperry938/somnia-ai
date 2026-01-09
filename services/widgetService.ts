/**
 * Widget Service for Somnia
 *
 * Updates home screen widgets with alarm and sleep data.
 * - Android: Uses custom WidgetPlugin to update AppWidget
 * - iOS: Uses WidgetKit through WidgetPlugin
 *
 * Call updateWidget() whenever alarm or sleep data changes.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { logger } from './logger';

// Check platform
const isNative = Capacitor.isNativePlatform();
const isAndroid = Capacitor.getPlatform() === 'android';
const isIOS = Capacitor.getPlatform() === 'ios';

/**
 * Widget Plugin Interface
 */
interface WidgetPluginInterface {
    updateWidget(options: {
        alarmTime?: string | null;
        alarmLabel?: string;
        avgSleep?: number;
        sleepScore?: number;
        streak?: number;
    }): Promise<void>;

    refresh(): Promise<void>;
    isSupported(): Promise<{ supported: boolean }>;
}

// Register the native widget plugin
const WidgetPlugin = isNative
    ? registerPlugin<WidgetPluginInterface>('Widget')
    : null;

/**
 * Widget data structure for type safety
 */
export interface WidgetData {
    alarmTime?: string | null;
    alarmLabel?: string;
    avgSleep?: number;
    sleepScore?: number;
    streak?: number;
}

/**
 * Check if widgets are supported on this device
 */
export async function isWidgetSupported(): Promise<boolean> {
    if (!isNative || !WidgetPlugin) {
        return false;
    }

    try {
        const result = await WidgetPlugin.isSupported();
        return result.supported;
    } catch (error) {
        logger.error('[Widget] isSupported check failed:', error);
        return false;
    }
}

/**
 * Update widget with current data
 *
 * @param data - Widget data to display
 */
export async function updateWidget(data: WidgetData): Promise<void> {
    if (!isNative || !WidgetPlugin) {
        logger.log('[Widget] Not in native environment, skipping update');
        return;
    }

    try {
        await WidgetPlugin.updateWidget({
            alarmTime: data.alarmTime,
            alarmLabel: data.alarmLabel || 'Alarm',
            avgSleep: data.avgSleep || 0,
            sleepScore: data.sleepScore || 0,
            streak: data.streak || 0,
        });

        logger.log('[Widget] Updated with data:', data);
    } catch (error) {
        logger.error('[Widget] Update failed:', error);
    }
}

/**
 * Update only the alarm display on the widget
 */
export async function updateAlarmWidget(
    time: string | null,
    label?: string
): Promise<void> {
    if (!isNative || !WidgetPlugin) return;

    try {
        await WidgetPlugin.updateWidget({
            alarmTime: time,
            alarmLabel: label || 'Alarm',
        });
        logger.log('[Widget] Alarm updated:', time);
    } catch (error) {
        logger.error('[Widget] Alarm update failed:', error);
    }
}

/**
 * Update only the sleep stats on the widget
 */
export async function updateSleepWidget(
    avgSleep: number,
    sleepScore: number,
    streak: number
): Promise<void> {
    if (!isNative || !WidgetPlugin) return;

    try {
        await WidgetPlugin.updateWidget({
            avgSleep,
            sleepScore,
            streak,
        });
        logger.log('[Widget] Sleep stats updated:', { avgSleep, sleepScore, streak });
    } catch (error) {
        logger.error('[Widget] Sleep stats update failed:', error);
    }
}

/**
 * Force refresh all widgets
 */
export async function refreshWidgets(): Promise<void> {
    if (!isNative || !WidgetPlugin) return;

    try {
        await WidgetPlugin.refresh();
        logger.log('[Widget] Refresh requested');
    } catch (error) {
        logger.error('[Widget] Refresh failed:', error);
    }
}

/**
 * Helper to format time for widget display
 * Converts Date or HH:mm string to display format
 */
export function formatTimeForWidget(time: Date | string | null): string | null {
    if (!time) return null;

    if (typeof time === 'string') {
        // Already in HH:mm format
        if (/^\d{2}:\d{2}$/.test(time)) {
            return time;
        }
        // Try to parse ISO string
        time = new Date(time);
    }

    if (time instanceof Date && !isNaN(time.getTime())) {
        const hours = time.getHours().toString().padStart(2, '0');
        const minutes = time.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    return null;
}

/**
 * Initialize widget with current app data
 * Call this on app startup to sync widget state
 */
export async function initializeWidget(data: WidgetData): Promise<void> {
    if (!isNative || !WidgetPlugin) return;

    const supported = await isWidgetSupported();
    if (!supported) {
        logger.log('[Widget] Widgets not supported on this device');
        return;
    }

    await updateWidget(data);
    logger.log('[Widget] Initialized');
}
