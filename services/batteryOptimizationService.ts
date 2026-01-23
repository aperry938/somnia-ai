/**
 * Battery Optimization Service
 *
 * Helps ensure alarms work reliably by requesting exemption from
 * Android's Doze mode and battery optimization.
 *
 * Without this exemption, alarms may be delayed when the device is in
 * deep sleep mode, especially on devices with aggressive battery management
 * (Samsung, Xiaomi, Huawei, etc.)
 *
 * App Store Compliance:
 * - Uses proper REQUEST_IGNORE_BATTERY_OPTIMIZATIONS permission
 * - Respects user choice (doesn't repeatedly prompt)
 * - Handles App Standby Buckets (Android 9+)
 * - Detects background execution restrictions
 * - Provides clear user instructions
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { logger } from './logger';

const isNative = Capacitor.isNativePlatform();
const isAndroid = Capacitor.getPlatform() === 'android';
const isIOS = Capacitor.getPlatform() === 'ios';

// Storage key for tracking user dismissals
const BATTERY_PROMPT_DISMISSED_KEY = 'somnia_battery_prompt_dismissed';
const BATTERY_PROMPT_DISMISS_COUNT_KEY = 'somnia_battery_prompt_dismiss_count';
const MAX_PROMPT_ATTEMPTS = 3; // Don't repeatedly prompt after 3 dismissals

/**
 * App Standby Bucket categories (Android 9+)
 * Determines how aggressively the system limits app background work
 */
export type AppStandbyBucket =
    | 'active'      // App is in use or recently used
    | 'working_set' // App is used regularly
    | 'frequent'    // App is used often but not daily
    | 'rare'        // App is rarely used
    | 'restricted'  // App is heavily restricted (Android 12+)
    | 'never'       // App has never been used
    | 'unknown';    // Could not determine bucket

/**
 * Background restriction levels
 */
export type BackgroundRestrictionLevel =
    | 'none'        // No restrictions
    | 'optimized'   // Standard battery optimization
    | 'restricted'  // User manually restricted background activity
    | 'unknown';    // Could not determine

/**
 * Native Battery Optimization Plugin Interface
 */
interface BatteryOptimizationPlugin {
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

    /**
     * Get the current App Standby Bucket (Android 9+)
     */
    getAppStandbyBucket?(): Promise<{ bucket: number; bucketName: string }>;

    /**
     * Check if background execution is restricted by user
     */
    isBackgroundRestricted?(): Promise<{ restricted: boolean }>;

    /**
     * Check if the app can schedule exact alarms (Android 12+)
     */
    canScheduleExactAlarms?(): Promise<{ canSchedule: boolean }>;

    /**
     * Open exact alarm permission settings (Android 12+)
     */
    openExactAlarmSettings?(): Promise<{ success: boolean }>;
}

// Register the plugin (only available on Android)
const BatteryOptimization = isAndroid
    ? registerPlugin<BatteryOptimizationPlugin>('BatteryOptimization')
    : null;

/**
 * Check if the app is exempt from battery optimization
 */
export async function isIgnoringBatteryOptimization(): Promise<boolean> {
    if (!isAndroid || !BatteryOptimization) {
        // iOS doesn't have this issue
        return true;
    }

    try {
        const result = await BatteryOptimization.isIgnoringBatteryOptimizations();
        return result.isIgnoring;
    } catch (error) {
        logger.error('[BatteryOptimization] Failed to check status:', error);
        return false;
    }
}

/**
 * Request the user to disable battery optimization
 * This shows a system dialog asking the user to allow the app
 * to ignore battery optimizations
 */
export async function requestIgnoreBatteryOptimization(): Promise<boolean> {
    if (!isAndroid || !BatteryOptimization) {
        return true;
    }

    try {
        // First check if already ignoring
        const isIgnoring = await isIgnoringBatteryOptimization();
        if (isIgnoring) {
            logger.log('[BatteryOptimization] Already ignoring battery optimization');
            return true;
        }

        // Request the exemption
        const result = await BatteryOptimization.requestIgnoreBatteryOptimizations();
        logger.log('[BatteryOptimization] Request result:', result.success);
        return result.success;
    } catch (error) {
        logger.error('[BatteryOptimization] Request failed:', error);
        return false;
    }
}

/**
 * Open battery optimization settings
 */
export async function openBatterySettings(): Promise<boolean> {
    if (!isAndroid || !BatteryOptimization) {
        return false;
    }

    try {
        const result = await BatteryOptimization.openBatteryOptimizationSettings();
        return result.success;
    } catch (error) {
        logger.error('[BatteryOptimization] Failed to open settings:', error);
        return false;
    }
}

/**
 * Check if device has aggressive battery management (OEM specific)
 * Manufacturers like Samsung, Xiaomi, Huawei, OnePlus have extra restrictions
 */
export async function hasAggressiveBatteryManagement(): Promise<{ hasAggressive: boolean; manufacturer: string }> {
    if (!isAndroid || !BatteryOptimization) {
        return { hasAggressive: false, manufacturer: '' };
    }

    try {
        const result = await BatteryOptimization.hasAggressiveBatteryManagement();
        return result;
    } catch (error) {
        logger.error('[BatteryOptimization] Failed to check manufacturer:', error);
        return { hasAggressive: false, manufacturer: '' };
    }
}

/**
 * Open manufacturer-specific battery settings
 * Different OEMs have different apps/settings for battery management
 */
export async function openManufacturerBatterySettings(): Promise<{ success: boolean; manufacturer: string }> {
    if (!isAndroid || !BatteryOptimization) {
        return { success: false, manufacturer: '' };
    }

    try {
        const result = await BatteryOptimization.openManufacturerBatterySettings();
        return result;
    } catch (error) {
        logger.error('[BatteryOptimization] Failed to open manufacturer settings:', error);
        return { success: false, manufacturer: '' };
    }
}

/**
 * Get battery optimization status for display to user
 */
export async function getBatteryOptimizationStatus(): Promise<{
    isOptimized: boolean;
    hasAggressiveOEM: boolean;
    manufacturer: string;
    needsUserAction: boolean;
}> {
    if (!isAndroid) {
        return {
            isOptimized: false,
            hasAggressiveOEM: false,
            manufacturer: '',
            needsUserAction: false,
        };
    }

    const isIgnoring = await isIgnoringBatteryOptimization();
    const oemInfo = await hasAggressiveBatteryManagement();

    return {
        isOptimized: !isIgnoring,
        hasAggressiveOEM: oemInfo.hasAggressive,
        manufacturer: oemInfo.manufacturer,
        needsUserAction: !isIgnoring || oemInfo.hasAggressive,
    };
}

/**
 * Get instructions for user to fix battery optimization issues
 */
export function getBatteryOptimizationInstructions(manufacturer: string): string[] {
    const normalizedMfr = manufacturer.toLowerCase();

    if (normalizedMfr.includes('samsung')) {
        return [
            'Go to Settings > Apps > Somnia',
            'Tap "Battery"',
            'Select "Unrestricted"',
            'Also check Device Care > Battery > App power management',
            'Add Somnia to "Apps that won\'t be put to sleep"',
        ];
    }

    if (normalizedMfr.includes('xiaomi') || normalizedMfr.includes('redmi') || normalizedMfr.includes('poco')) {
        return [
            'Go to Settings > Apps > Manage apps > Somnia',
            'Tap "Battery saver"',
            'Select "No restrictions"',
            'Also enable "Autostart" for Somnia',
            'In Security app, go to Permissions > Autostart and enable Somnia',
        ];
    }

    if (normalizedMfr.includes('huawei') || normalizedMfr.includes('honor')) {
        return [
            'Go to Settings > Apps > Apps > Somnia',
            'Tap "Battery"',
            'Disable "Power-intensive prompt" and "Launch"',
            'Enable "Run in background" and "Auto-launch"',
            'In Phone Manager > Protected apps, add Somnia',
        ];
    }

    if (normalizedMfr.includes('oneplus') || normalizedMfr.includes('oppo') || normalizedMfr.includes('realme')) {
        return [
            'Go to Settings > Apps > App info > Somnia',
            'Tap "Battery usage"',
            'Select "Allow background activity"',
            'Also go to Settings > Battery > Battery optimization',
            'Find Somnia and select "Don\'t optimize"',
        ];
    }

    if (normalizedMfr.includes('vivo')) {
        return [
            'Go to Settings > More settings > Applications > Somnia',
            'Enable "High background power consumption"',
            'In iManager > App manager > Autostart manager',
            'Enable autostart for Somnia',
        ];
    }

    // Generic Android instructions
    return [
        'Go to Settings > Apps > Somnia',
        'Tap "Battery"',
        'Select "Unrestricted" or "Don\'t optimize"',
        'This ensures alarms work reliably',
    ];
}

/**
 * Check if platform requires battery optimization handling
 */
export function requiresBatteryOptimization(): boolean {
    return isAndroid && isNative;
}

// ============================================================================
// App Standby Buckets (Android 9+)
// ============================================================================

/**
 * Get the current App Standby Bucket.
 * Lower buckets mean more restrictions on background work.
 */
export async function getAppStandbyBucket(): Promise<AppStandbyBucket> {
    if (!isAndroid || !BatteryOptimization) {
        return 'unknown';
    }

    try {
        if (BatteryOptimization.getAppStandbyBucket) {
            const result = await BatteryOptimization.getAppStandbyBucket();
            // Map bucket numbers to names
            // STANDBY_BUCKET_ACTIVE = 10
            // STANDBY_BUCKET_WORKING_SET = 20
            // STANDBY_BUCKET_FREQUENT = 30
            // STANDBY_BUCKET_RARE = 40
            // STANDBY_BUCKET_RESTRICTED = 45 (Android 12+)
            // STANDBY_BUCKET_NEVER = 50
            switch (result.bucket) {
                case 10: return 'active';
                case 20: return 'working_set';
                case 30: return 'frequent';
                case 40: return 'rare';
                case 45: return 'restricted';
                case 50: return 'never';
                default: return 'unknown';
            }
        }
    } catch (error) {
        logger.error('[BatteryOptimization] Failed to get app standby bucket:', error);
    }

    return 'unknown';
}

/**
 * Check if the app's standby bucket might cause alarm delays
 */
export async function mightHaveAlarmDelays(): Promise<boolean> {
    const bucket = await getAppStandbyBucket();
    // 'rare', 'restricted', and 'never' buckets have significant restrictions
    return bucket === 'rare' || bucket === 'restricted' || bucket === 'never';
}

// ============================================================================
// Background Restrictions
// ============================================================================

/**
 * Check if background execution is restricted by the user
 */
export async function isBackgroundRestricted(): Promise<boolean> {
    if (!isAndroid || !BatteryOptimization) {
        return false;
    }

    try {
        if (BatteryOptimization.isBackgroundRestricted) {
            const result = await BatteryOptimization.isBackgroundRestricted();
            return result.restricted;
        }
    } catch (error) {
        logger.error('[BatteryOptimization] Failed to check background restriction:', error);
    }

    return false;
}

/**
 * Get the current background restriction level
 */
export async function getBackgroundRestrictionLevel(): Promise<BackgroundRestrictionLevel> {
    if (!isAndroid || !BatteryOptimization) {
        return 'none';
    }

    try {
        const isRestricted = await isBackgroundRestricted();
        if (isRestricted) {
            return 'restricted';
        }

        const isIgnoring = await isIgnoringBatteryOptimization();
        if (isIgnoring) {
            return 'none';
        }

        return 'optimized';
    } catch (error) {
        logger.error('[BatteryOptimization] Failed to get restriction level:', error);
        return 'unknown';
    }
}

// ============================================================================
// Exact Alarm Permissions (Android 12+)
// ============================================================================

/**
 * Check if the app can schedule exact alarms (Android 12+)
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
    if (!isAndroid || !BatteryOptimization) {
        return true; // Non-Android platforms don't have this restriction
    }

    try {
        if (BatteryOptimization.canScheduleExactAlarms) {
            const result = await BatteryOptimization.canScheduleExactAlarms();
            return result.canSchedule;
        }
        // Plugin method not available, assume permission granted (pre-Android 12)
        return true;
    } catch (error) {
        logger.error('[BatteryOptimization] Failed to check exact alarm permission:', error);
        return true; // Assume allowed if check fails
    }
}

/**
 * Open the exact alarm permission settings (Android 12+)
 */
export async function openExactAlarmSettings(): Promise<boolean> {
    if (!isAndroid || !BatteryOptimization) {
        return false;
    }

    try {
        if (BatteryOptimization.openExactAlarmSettings) {
            const result = await BatteryOptimization.openExactAlarmSettings();
            return result.success;
        }
    } catch (error) {
        logger.error('[BatteryOptimization] Failed to open exact alarm settings:', error);
    }

    return false;
}

// ============================================================================
// User Prompt Management
// ============================================================================

/**
 * Check if we should show the battery optimization prompt.
 * Respects user dismissals to avoid being annoying.
 */
export function shouldShowBatteryPrompt(): boolean {
    try {
        const dismissCount = parseInt(localStorage.getItem(BATTERY_PROMPT_DISMISS_COUNT_KEY) || '0', 10);
        return dismissCount < MAX_PROMPT_ATTEMPTS;
    } catch {
        return true;
    }
}

/**
 * Record that the user dismissed the battery optimization prompt
 */
export function recordBatteryPromptDismissal(): void {
    try {
        const currentCount = parseInt(localStorage.getItem(BATTERY_PROMPT_DISMISS_COUNT_KEY) || '0', 10);
        localStorage.setItem(BATTERY_PROMPT_DISMISS_COUNT_KEY, String(currentCount + 1));
        localStorage.setItem(BATTERY_PROMPT_DISMISSED_KEY, new Date().toISOString());
    } catch {
        // Ignore storage errors
    }
}

/**
 * Reset the battery prompt dismissal count (e.g., after app update)
 */
export function resetBatteryPromptDismissals(): void {
    try {
        localStorage.removeItem(BATTERY_PROMPT_DISMISS_COUNT_KEY);
        localStorage.removeItem(BATTERY_PROMPT_DISMISSED_KEY);
    } catch {
        // Ignore storage errors
    }
}

// ============================================================================
// Comprehensive Status
// ============================================================================

/**
 * Get comprehensive battery and background status for alarm reliability
 */
export async function getAlarmReliabilityStatus(): Promise<{
    platform: 'ios' | 'android' | 'web';
    batteryOptimized: boolean;
    hasAggressiveOEM: boolean;
    manufacturer: string;
    appStandbyBucket: AppStandbyBucket;
    backgroundRestricted: boolean;
    canScheduleExactAlarms: boolean;
    needsUserAction: boolean;
    issues: string[];
    recommendations: string[];
}> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // iOS has its own background handling, generally reliable for alarms
    if (isIOS) {
        return {
            platform: 'ios',
            batteryOptimized: false,
            hasAggressiveOEM: false,
            manufacturer: 'Apple',
            appStandbyBucket: 'active',
            backgroundRestricted: false,
            canScheduleExactAlarms: true,
            needsUserAction: false,
            issues: [],
            recommendations: [],
        };
    }

    // Web platform
    if (!isAndroid) {
        return {
            platform: 'web',
            batteryOptimized: false,
            hasAggressiveOEM: false,
            manufacturer: '',
            appStandbyBucket: 'unknown',
            backgroundRestricted: false,
            canScheduleExactAlarms: false,
            needsUserAction: false,
            issues: ['Web platform cannot guarantee alarm reliability'],
            recommendations: ['Use the native app for reliable alarms'],
        };
    }

    // Android platform - comprehensive check
    const batteryOptimized = !(await isIgnoringBatteryOptimization());
    const oemInfo = await hasAggressiveBatteryManagement();
    const bucket = await getAppStandbyBucket();
    const bgRestricted = await isBackgroundRestricted();
    const exactAlarms = await canScheduleExactAlarms();

    // Analyze issues
    if (batteryOptimized) {
        issues.push('Battery optimization is enabled');
        recommendations.push('Disable battery optimization for reliable alarms');
    }

    if (bgRestricted) {
        issues.push('Background activity is restricted');
        recommendations.push('Allow background activity in app settings');
    }

    if (!exactAlarms) {
        issues.push('Exact alarm permission not granted');
        recommendations.push('Allow Somnia to schedule exact alarms');
    }

    if (bucket === 'rare' || bucket === 'restricted') {
        issues.push(`App is in "${bucket}" standby bucket`);
        recommendations.push('Open the app more frequently to improve standby bucket');
    }

    if (oemInfo.hasAggressive) {
        issues.push(`${oemInfo.manufacturer} has aggressive battery management`);
        recommendations.push(...getBatteryOptimizationInstructions(oemInfo.manufacturer).slice(0, 2));
    }

    return {
        platform: 'android',
        batteryOptimized,
        hasAggressiveOEM: oemInfo.hasAggressive,
        manufacturer: oemInfo.manufacturer,
        appStandbyBucket: bucket,
        backgroundRestricted: bgRestricted,
        canScheduleExactAlarms: exactAlarms,
        needsUserAction: issues.length > 0,
        issues,
        recommendations,
    };
}

// ============================================================================
// iOS Low Power Mode Detection
// ============================================================================

/**
 * Check if iOS Low Power Mode is enabled.
 * Note: This requires a native plugin as web APIs don't expose this.
 */
export async function isLowPowerModeEnabled(): Promise<boolean> {
    if (!isIOS || !isNative) {
        return false;
    }

    // iOS Low Power Mode detection would require a native plugin
    // For now, we can't reliably detect this from JavaScript
    // The native iOS plugin should implement this
    return false;
}

/**
 * Get iOS-specific battery guidance
 */
export function getIOSBatteryGuidance(): string[] {
    if (!isIOS) return [];

    return [
        'Ensure Somnia has notification permissions enabled',
        'Background App Refresh should be enabled for Somnia',
        'If Low Power Mode is on, alarms may be delayed',
        'Keep the app in your notification summary for reliable alerts',
    ];
}
