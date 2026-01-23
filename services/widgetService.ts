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
const isIOS = Capacitor.getPlatform() === 'ios';
const isAndroid = Capacitor.getPlatform() === 'android';

// Widget update throttling to prevent excessive updates
const MIN_UPDATE_INTERVAL = 1000; // 1 second minimum between updates
let lastUpdateTime = 0;
let pendingUpdate: WidgetData | null = null;
let updateTimeoutId: ReturnType<typeof setTimeout> | null = null;

// App Group identifier for iOS shared data (must match native configuration)
const IOS_APP_GROUP = 'group.com.somnia.dreamjournal';

// Retry configuration for failed updates
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

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

    /** Update sleep tracking state for dream recording widget */
    updateSleepTrackingState(options: {
        isSleepTracking: boolean;
    }): Promise<void>;

    /** Refresh dream recording widget specifically */
    refreshDreamWidget(): Promise<void>;

    refresh(): Promise<void>;
    isSupported(): Promise<{ supported: boolean }>;

    /** iOS WidgetKit timeline reload */
    reloadTimelines?(options: { kind?: string }): Promise<void>;

    /** Get shared app group data (iOS) */
    getSharedData?(options: { key: string }): Promise<{ value: string | null }>;

    /** Set shared app group data (iOS) */
    setSharedData?(options: { key: string; value: string }): Promise<void>;
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
 * Execute with retry logic for resilience
 */
async function executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries = MAX_RETRIES
): Promise<T | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            const isLastAttempt = attempt === retries;
            if (isLastAttempt) {
                logger.error(`[Widget] ${operationName} failed after ${retries} attempts:`, error);
                return null;
            }
            logger.warn(`[Widget] ${operationName} attempt ${attempt} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
    }
    return null;
}

/**
 * Cleanup pending update timeout
 */
export function cleanupWidgetService(): void {
    if (updateTimeoutId) {
        clearTimeout(updateTimeoutId);
        updateTimeoutId = null;
    }
    pendingUpdate = null;
}

/**
 * Update widget with current data (throttled)
 *
 * @param data - Widget data to display
 * @param force - Skip throttling for critical updates
 */
export async function updateWidget(data: WidgetData, force = false): Promise<void> {
    if (!isNative || !WidgetPlugin) {
        logger.log('[Widget] Not in native environment, skipping update');
        return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime;

    // Throttle updates unless forced
    if (!force && timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
        // Store pending update and schedule it
        pendingUpdate = data;
        if (!updateTimeoutId) {
            updateTimeoutId = setTimeout(() => {
                updateTimeoutId = null;
                if (pendingUpdate) {
                    const dataToUpdate = pendingUpdate;
                    pendingUpdate = null;
                    updateWidget(dataToUpdate, true);
                }
            }, MIN_UPDATE_INTERVAL - timeSinceLastUpdate);
        }
        return;
    }

    lastUpdateTime = now;

    const result = await executeWithRetry(
        async () => {
            await WidgetPlugin!.updateWidget({
                alarmTime: data.alarmTime,
                alarmLabel: data.alarmLabel || 'Alarm',
                avgSleep: data.avgSleep || 0,
                sleepScore: data.sleepScore || 0,
                streak: data.streak || 0,
            });

            // Also update shared data for iOS app groups
            if (isIOS && WidgetPlugin!.setSharedData) {
                await WidgetPlugin!.setSharedData({
                    key: 'widgetData',
                    value: JSON.stringify({
                        ...data,
                        lastUpdated: new Date().toISOString(),
                    }),
                });
            }
        },
        'updateWidget'
    );

    if (result !== null) {
        logger.log('[Widget] Updated with data:', data);
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
 * On iOS, this reloads the WidgetKit timeline
 * On Android, this triggers AppWidget update
 */
export async function refreshWidgets(): Promise<void> {
    if (!isNative || !WidgetPlugin) return;

    const result = await executeWithRetry(
        async () => {
            // iOS: Use WidgetKit timeline reload if available
            if (isIOS && WidgetPlugin!.reloadTimelines) {
                await WidgetPlugin!.reloadTimelines({});
            }
            // Fallback/Android: Use general refresh
            await WidgetPlugin!.refresh();
        },
        'refreshWidgets'
    );

    if (result !== null) {
        logger.log('[Widget] Refresh requested');
    }
}

/**
 * Reload iOS WidgetKit timeline for a specific widget kind
 * @param kind - The widget kind identifier (optional, reloads all if not specified)
 */
export async function reloadWidgetTimeline(kind?: string): Promise<void> {
    if (!isNative || !WidgetPlugin || !isIOS) return;

    if (!WidgetPlugin.reloadTimelines) {
        logger.warn('[Widget] reloadTimelines not available on this build');
        return;
    }

    const result = await executeWithRetry(
        () => WidgetPlugin!.reloadTimelines!({ kind }),
        'reloadTimeline'
    );

    if (result !== null) {
        logger.log('[Widget] Timeline reload requested for:', kind || 'all');
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

/**
 * Update sleep tracking state for the dream recording widget
 * Call this when user starts/stops sleep tracking
 *
 * This updates the lock screen widget to show whether sleep is being tracked,
 * giving users visual feedback that the app is monitoring their sleep.
 *
 * @param isSleepTracking - Whether sleep tracking is currently active
 */
export async function updateSleepTrackingState(isSleepTracking: boolean): Promise<void> {
    if (!isNative || !WidgetPlugin) {
        logger.log('[Widget] Not in native environment, skipping sleep tracking state update');
        return;
    }

    try {
        await WidgetPlugin.updateSleepTrackingState({ isSleepTracking });
        logger.log('[Widget] Sleep tracking state updated:', isSleepTracking);
    } catch (error) {
        // Gracefully handle if method not implemented on older native builds
        logger.warn('[Widget] Sleep tracking state update not supported:', error);
    }
}

/**
 * Refresh only the dream recording widget
 * Useful after user enables/disables sleep tracking features
 */
export async function refreshDreamWidget(): Promise<void> {
    if (!isNative || !WidgetPlugin) return;

    const result = await executeWithRetry(
        () => WidgetPlugin!.refreshDreamWidget(),
        'refreshDreamWidget'
    );

    if (result !== null) {
        logger.log('[Widget] Dream widget refresh requested');
    } else {
        // Fallback to general refresh
        logger.warn('[Widget] Dream widget refresh not supported, using general refresh');
        await refreshWidgets();
    }
}

/**
 * Get shared data from iOS App Group
 * Useful for syncing state between app and widget extension
 */
export async function getSharedWidgetData<T>(key: string): Promise<T | null> {
    if (!isNative || !WidgetPlugin || !isIOS) return null;

    if (!WidgetPlugin.getSharedData) {
        logger.warn('[Widget] getSharedData not available on this build');
        return null;
    }

    try {
        const result = await WidgetPlugin.getSharedData({ key });
        if (result.value) {
            return JSON.parse(result.value) as T;
        }
        return null;
    } catch (error) {
        logger.error('[Widget] Failed to get shared data:', error);
        return null;
    }
}

/**
 * Set shared data in iOS App Group
 * Useful for syncing state between app and widget extension
 */
export async function setSharedWidgetData(key: string, value: unknown): Promise<boolean> {
    if (!isNative || !WidgetPlugin || !isIOS) return false;

    if (!WidgetPlugin.setSharedData) {
        logger.warn('[Widget] setSharedData not available on this build');
        return false;
    }

    try {
        await WidgetPlugin.setSharedData({
            key,
            value: JSON.stringify(value),
        });
        return true;
    } catch (error) {
        logger.error('[Widget] Failed to set shared data:', error);
        return false;
    }
}

/**
 * Get platform-specific widget info
 */
export function getWidgetPlatformInfo(): {
    platform: 'ios' | 'android' | 'web';
    supportsTimeline: boolean;
    supportsAppGroups: boolean;
    supportsGlance: boolean;
    appGroupId: string | null;
} {
    if (!isNative) {
        return {
            platform: 'web',
            supportsTimeline: false,
            supportsAppGroups: false,
            supportsGlance: false,
            appGroupId: null,
        };
    }

    if (isIOS) {
        return {
            platform: 'ios',
            supportsTimeline: true, // iOS WidgetKit supports timelines
            supportsAppGroups: true, // App Groups are iOS-specific
            supportsGlance: false,
            appGroupId: IOS_APP_GROUP,
        };
    }

    // Android
    return {
        platform: 'android',
        supportsTimeline: false, // Android AppWidgets don't have timelines
        supportsAppGroups: false, // Android uses different shared storage
        supportsGlance: isAndroid, // Android Glance API for widgets
        appGroupId: null,
    };
}
