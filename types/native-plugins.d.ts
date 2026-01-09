/**
 * Type definitions for custom Capacitor native plugins
 *
 * These plugins are implemented in:
 * - Android: android/app/src/main/java/ai/somnia/app/
 * - iOS: ios/App/App/
 */

import type { registerPlugin as _registerPlugin } from '@capacitor/core';

// ============================================================================
// Native Alarm Plugin (Android only)
// ============================================================================

export interface NativeAlarmPlugin {
    /**
     * Schedule an alarm using Android AlarmManager
     * Works when phone is sleeping (uses exact alarm + foreground service)
     */
    scheduleAlarm(options: {
        id: string;
        time: string;  // HH:mm format
        soundId?: string;
        label?: string;
        vibrate?: boolean;
    }): Promise<{ success: boolean; scheduledTime: number }>;

    /**
     * Cancel a scheduled alarm
     */
    cancelAlarm(options: { id: string }): Promise<{ success: boolean }>;

    /**
     * Stop currently playing alarm
     */
    stopAlarm(): Promise<{ success: boolean }>;

    /**
     * Snooze the current alarm
     */
    snoozeAlarm(options: { id: string; minutes?: number }): Promise<{ success: boolean }>;

    /**
     * Check if app can schedule exact alarms (Android 12+)
     */
    canScheduleExactAlarms(): Promise<{ canSchedule: boolean }>;

    /**
     * Open system settings for exact alarm permission
     */
    openAlarmSettings(): Promise<{ success: boolean }>;
}

// ============================================================================
// Health Connect Plugin (Android)
// ============================================================================

export interface HealthConnectPlugin {
    /**
     * Check if Health Connect is available
     */
    isAvailable(): Promise<{ available: boolean }>;

    /**
     * Request health data permissions
     */
    requestAuthorization(): Promise<{ authorized: boolean }>;

    /**
     * Check current authorization status
     */
    checkAuthorization(): Promise<{
        authorized: boolean;
        status: 'authorized' | 'denied' | 'notDetermined' | 'unavailable';
    }>;

    /**
     * Read sleep sessions from Health Connect
     */
    readSleepSessions(options?: { days?: number }): Promise<{
        sessions: Array<{
            id: string;
            startTime: string;
            endTime: string;
            duration: number;
            stages?: Array<{
                stage: string;
                startTime: string;
                endTime: string;
            }>;
        }>;
        count: number;
    }>;

    /**
     * Read heart rate samples
     */
    readHeartRate(options?: { days?: number }): Promise<{
        samples: Array<{
            time: string;
            bpm: number;
        }>;
        count: number;
    }>;
}

// ============================================================================
// HealthKit Plugin (iOS)
// ============================================================================

export interface HealthKitPlugin {
    /**
     * Check if HealthKit is available on this device
     */
    isAvailable(): Promise<{ available: boolean }>;

    /**
     * Request authorization to read health data
     */
    requestAuthorization(): Promise<{ authorized: boolean }>;

    /**
     * Check current authorization status
     */
    checkAuthorization(): Promise<{
        authorized: boolean;
        status: 'authorized' | 'denied' | 'notDetermined' | 'unknown' | 'unavailable';
    }>;

    /**
     * Read sleep analysis data from HealthKit
     */
    readSleepAnalysis(options?: { days?: number }): Promise<{
        sessions: Array<{
            uuid: string;
            startDate: string;
            endDate: string;
            value: number; // 0=InBed, 1=AsleepUnspecified, 2=Awake, 3=Core, 4=Deep, 5=REM
            sourceName: string;
            sourceBundle: string;
            duration: number;
        }>;
        startDate: string;
        endDate: string;
        count: number;
    }>;

    /**
     * Read heart rate samples
     */
    readHeartRate(options?: { days?: number }): Promise<{
        samples: Array<{
            uuid: string;
            date: string;
            value: number;
            sourceName: string;
        }>;
        startDate: string;
        endDate: string;
        count: number;
    }>;

    /**
     * Get aggregated sleep statistics
     */
    getSleepStats(options?: { days?: number }): Promise<{
        averageDuration: number;
        averageBedtime: string;
        averageWakeTime: string;
        totalNights: number;
        totalSleepMinutes: number;
    }>;
}

// ============================================================================
// Widget Plugin (Android & iOS)
// ============================================================================

export interface WidgetPlugin {
    /**
     * Update widget with current data
     */
    updateWidget(options: {
        alarmTime?: string | null;
        alarmLabel?: string;
        avgSleep?: number;
        sleepScore?: number;
        streak?: number;
    }): Promise<void>;

    /**
     * Force refresh all widgets
     */
    refresh(): Promise<void>;

    /**
     * Check if widgets are supported
     */
    isSupported(): Promise<{ supported: boolean }>;
}

// ============================================================================
// Critical Notifications Plugin (iOS)
// ============================================================================

export interface CriticalNotificationsPlugin {
    /**
     * Request critical alert authorization (bypasses DND)
     */
    requestCriticalAuthorization(): Promise<{
        granted: boolean;
        criticalGranted: boolean;
        alertSetting: string;
        soundSetting: string;
    }>;

    /**
     * Check current notification status
     */
    checkCriticalStatus(): Promise<{
        authorized: boolean;
        criticalEnabled: boolean;
        timeSensitiveEnabled: boolean;
        alertSetting: string;
        soundSetting: string;
        badgeSetting: string;
        lockScreenSetting: string;
    }>;

    /**
     * Schedule an alarm notification with critical alert
     */
    scheduleAlarmNotification(options: {
        id: string;
        title: string;
        body: string;
        timestamp: number;
        sound?: string;
    }): Promise<{ scheduled: boolean; id: string }>;

    /**
     * Open device notification settings
     */
    openNotificationSettings(): Promise<void>;
}

// ============================================================================
// Battery Optimization Plugin (Android)
// ============================================================================

export interface BatteryOptimizationPlugin {
    /**
     * Check if the app is exempt from battery optimization
     */
    isIgnoringBatteryOptimizations(): Promise<{ isIgnoring: boolean }>;

    /**
     * Request the user to disable battery optimization for this app
     * Opens system settings dialog
     */
    requestIgnoreBatteryOptimizations(): Promise<{ success: boolean }>;

    /**
     * Open battery optimization settings directly
     */
    openBatteryOptimizationSettings(): Promise<{ success: boolean }>;

    /**
     * Check if the device manufacturer has aggressive battery management
     * (Samsung, Xiaomi, Huawei, OnePlus, etc.)
     */
    hasAggressiveBatteryManagement(): Promise<{ hasAggressive: boolean; manufacturer: string }>;

    /**
     * Open manufacturer-specific battery settings (for aggressive OEMs)
     */
    openManufacturerBatterySettings(): Promise<{ success: boolean; manufacturer: string }>;
}

// ============================================================================
// Audio Session Plugin (iOS)
// ============================================================================

export interface AudioSessionPlugin {
    /**
     * Configure the audio session for background playback
     * Call this BEFORE starting any audio that should continue in background
     */
    configure(options?: {
        mixWithOthers?: boolean;
        duckOthers?: boolean;
    }): Promise<{ configured: boolean; category: string; isActive: boolean }>;

    /**
     * Set audio session active/inactive
     * Deactivate when stopping audio to be a good citizen
     */
    setActive(options: { active: boolean }): Promise<{ active: boolean; warning?: string }>;

    /**
     * Get current audio session status
     */
    getStatus(): Promise<{
        isConfigured: boolean;
        category: string;
        mode: string;
        isOtherAudioPlaying: boolean;
        outputVolume: number;
        sampleRate: number;
        outputLatency: number;
    }>;

    /**
     * Add listener for audio session events
     */
    addListener(
        eventName: 'interruptionBegan' | 'interruptionEnded' | 'routeChange',
        listenerFunc: (data: Record<string, unknown>) => void
    ): Promise<{ remove: () => void }>;
}

// ============================================================================
// Plugin Registration Helpers
// ============================================================================

declare module '@capacitor/core' {
    interface PluginRegistry {
        NativeAlarm: NativeAlarmPlugin;
        HealthConnect: HealthConnectPlugin;
        HealthKit: HealthKitPlugin;
        Widget: WidgetPlugin;
        CriticalNotifications: CriticalNotificationsPlugin;
        BatteryOptimization: BatteryOptimizationPlugin;
        AudioSession: AudioSessionPlugin;
    }
}

// Export for direct imports
export const NativeAlarm: NativeAlarmPlugin;
export const HealthConnect: HealthConnectPlugin;
export const HealthKit: HealthKitPlugin;
export const Widget: WidgetPlugin;
export const CriticalNotifications: CriticalNotificationsPlugin;
export const BatteryOptimization: BatteryOptimizationPlugin;
export const AudioSession: AudioSessionPlugin;
