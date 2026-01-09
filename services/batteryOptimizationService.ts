/**
 * Battery Optimization Service
 *
 * Helps ensure alarms work reliably by requesting exemption from
 * Android's Doze mode and battery optimization.
 *
 * Without this exemption, alarms may be delayed when the device is in
 * deep sleep mode, especially on devices with aggressive battery management
 * (Samsung, Xiaomi, Huawei, etc.)
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { logger } from './logger';

const isNative = Capacitor.isNativePlatform();
const isAndroid = Capacitor.getPlatform() === 'android';

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
