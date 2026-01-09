/**
 * Health Service for Somnia
 *
 * Integrates with native health platforms:
 * - iOS: HealthKit (via custom HealthKitPlugin)
 * - Android: Health Connect (via custom HealthConnectPlugin)
 *
 * Provides real sleep data from health apps (Apple Health, Google Fit).
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { Biometrics } from '../types';
import { logger } from './logger';

// Platform detection
const isNative = Capacitor.isNativePlatform();
const isIOS = Capacitor.getPlatform() === 'ios';
const isAndroid = Capacitor.getPlatform() === 'android';

// HealthKit Plugin Interface (iOS)
interface HealthKitPlugin {
    isAvailable(): Promise<{ available: boolean }>;
    requestAuthorization(): Promise<{ authorized: boolean }>;
    checkAuthorization(): Promise<{ authorized: boolean; status: string }>;
    readSleepAnalysis(options: { days: number }): Promise<{
        sessions: SleepSession[];
        startDate: string;
        endDate: string;
        count: number;
    }>;
    readHeartRate(options: { days: number }): Promise<{
        samples: HeartRateSample[];
        startDate: string;
        endDate: string;
        count: number;
    }>;
    getSleepStats(options: { days: number }): Promise<{
        averageDuration: number;
        averageBedtime: string;
        averageWakeTime: string;
        totalNights: number;
        totalSleepMinutes: number;
    }>;
}

// Health Connect Plugin Interface (Android)
interface HealthConnectPlugin {
    isAvailable(): Promise<{ available: boolean; status: number }>;
    checkPermissions(): Promise<{ granted: boolean; permissions: string[] }>;
    requestPermissions(): Promise<{ requested: boolean }>;
    openHealthConnectSettings(): Promise<{ success: boolean }>;
    readSleepSessions(options: { days: number }): Promise<{
        sessions: SleepSession[];
        startDate: string;
        endDate: string;
    }>;
    readHeartRate(options: { days: number }): Promise<{
        samples: HeartRateSample[];
        startDate: string;
        endDate: string;
    }>;
    getSleepStats(options: { days: number }): Promise<{
        averageDuration: number;
        averageBedtime: string;
        averageWakeTime: string;
        totalNights: number;
    }>;
}

// Data types
export interface SleepSession {
    uuid: string;
    startDate: string;
    endDate: string;
    value: number; // 0=InBed, 1=Asleep, 2=Awake, 3=Core, 4=Deep, 5=REM
    sourceName: string;
    sourceBundle?: string;
    duration: number; // minutes
}

export interface HeartRateSample {
    uuid: string;
    date: string;
    value: number; // BPM
    sourceName: string;
}

export interface SleepStats {
    averageDuration: number; // hours
    averageBedtime: string; // HH:mm
    averageWakeTime: string; // HH:mm
    totalNights: number;
}

export interface HealthConnectionStatus {
    isConnected: boolean;
    source: 'apple_health' | 'health_connect' | 'google_fit' | 'oura' | 'whoop' | 'none';
    lastSync: string | null;
    authorized: boolean;
    permissions?: string[];
}

// Register native plugins
const HealthKit = isIOS ? registerPlugin<HealthKitPlugin>('HealthKit') : null;
const HealthConnect = isAndroid ? registerPlugin<HealthConnectPlugin>('HealthConnect') : null;

// Storage key for connection status
const HEALTH_CONNECTION_KEY = 'somnia_health_connection';

/**
 * Check if native health integration is available
 */
export const isHealthAvailable = async (): Promise<boolean> => {
    if (!isNative) return false;

    try {
        if (isIOS && HealthKit) {
            const result = await HealthKit.isAvailable();
            return result.available;
        } else if (isAndroid && HealthConnect) {
            const result = await HealthConnect.isAvailable();
            return result.available;
        }
    } catch (e) {
        logger.error('[HealthService] Availability check failed:', e);
    }

    return false;
};

/**
 * Request authorization to read health data
 */
export const requestHealthAuthorization = async (): Promise<boolean> => {
    if (!isNative) {
        logger.warn('[HealthService] Not running in native environment');
        return false;
    }

    try {
        if (isIOS && HealthKit) {
            const result = await HealthKit.requestAuthorization();
            if (result.authorized) {
                updateConnectionStatus('apple_health', true);
            }
            return result.authorized;
        } else if (isAndroid && HealthConnect) {
            await HealthConnect.requestPermissions();
            // Check if permission was granted
            const perms = await HealthConnect.checkPermissions();
            if (perms.granted) {
                updateConnectionStatus('health_connect', true);
            }
            return perms.granted;
        }
    } catch (e) {
        logger.error('[HealthService] Authorization failed:', e);
    }

    return false;
};

/**
 * Check current authorization status
 */
export const checkHealthAuthorization = async (): Promise<boolean> => {
    if (!isNative) return false;

    try {
        if (isIOS && HealthKit) {
            const result = await HealthKit.checkAuthorization();
            return result.authorized;
        } else if (isAndroid && HealthConnect) {
            const result = await HealthConnect.checkPermissions();
            return result.granted;
        }
    } catch (e) {
        logger.error('[HealthService] Auth check failed:', e);
    }

    return false;
};

/**
 * Open native health app settings
 */
export const openHealthSettings = async (): Promise<void> => {
    if (isAndroid && HealthConnect) {
        await HealthConnect.openHealthConnectSettings();
    }
    // iOS doesn't have a direct way to open Health app settings
};

/**
 * Fetch sleep sessions from connected health platform
 */
export const fetchSleepSessions = async (days: number = 7): Promise<SleepSession[]> => {
    if (!isNative) return [];

    try {
        if (isIOS && HealthKit) {
            const result = await HealthKit.readSleepAnalysis({ days });
            logger.log(`[HealthService] Fetched ${result.count} sleep sessions from HealthKit`);
            return result.sessions;
        } else if (isAndroid && HealthConnect) {
            const result = await HealthConnect.readSleepSessions({ days });
            logger.log(`[HealthService] Fetched sleep sessions from Health Connect`);
            return result.sessions;
        }
    } catch (e) {
        logger.error('[HealthService] Failed to fetch sleep sessions:', e);
    }

    return [];
};

/**
 * Fetch heart rate samples from connected health platform
 */
export const fetchHeartRateSamples = async (days: number = 7): Promise<HeartRateSample[]> => {
    if (!isNative) return [];

    try {
        if (isIOS && HealthKit) {
            const result = await HealthKit.readHeartRate({ days });
            logger.log(`[HealthService] Fetched ${result.count} HR samples from HealthKit`);
            return result.samples;
        } else if (isAndroid && HealthConnect) {
            const result = await HealthConnect.readHeartRate({ days });
            logger.log(`[HealthService] Fetched HR samples from Health Connect`);
            return result.samples;
        }
    } catch (e) {
        logger.error('[HealthService] Failed to fetch heart rate:', e);
    }

    return [];
};

/**
 * Get aggregated sleep statistics
 */
export const getSleepStats = async (days: number = 30): Promise<SleepStats | null> => {
    if (!isNative) return null;

    try {
        if (isIOS && HealthKit) {
            const result = await HealthKit.getSleepStats({ days });
            return {
                averageDuration: result.averageDuration,
                averageBedtime: result.averageBedtime,
                averageWakeTime: result.averageWakeTime,
                totalNights: result.totalNights,
            };
        } else if (isAndroid && HealthConnect) {
            const result = await HealthConnect.getSleepStats({ days });
            return {
                averageDuration: result.averageDuration,
                averageBedtime: result.averageBedtime,
                averageWakeTime: result.averageWakeTime,
                totalNights: result.totalNights,
            };
        }
    } catch (e) {
        logger.error('[HealthService] Failed to get sleep stats:', e);
    }

    return null;
};

/**
 * Sync biometrics from connected platform
 */
export const syncBiometrics = async (): Promise<Partial<Biometrics> | null> => {
    if (!isNative) return null;

    try {
        const stats = await getSleepStats(30);
        const hrSamples = await fetchHeartRateSamples(7);

        if (!stats && hrSamples.length === 0) return null;

        // Calculate average resting heart rate (samples during night hours)
        const nightHrSamples = hrSamples.filter(s => {
            const hour = new Date(s.date).getHours();
            return hour >= 22 || hour <= 6;
        });
        const avgRestingHr = nightHrSamples.length > 0
            ? nightHrSamples.reduce((sum, s) => sum + s.value, 0) / nightHrSamples.length
            : undefined;

        // Update last sync time
        updateConnectionStatus(isIOS ? 'apple_health' : 'health_connect', true);

        return {
            avgSleep: stats?.averageDuration,
            avgBedtime: stats?.averageBedtime,
            avgWakeTime: stats?.averageWakeTime,
            restingHr: avgRestingHr ? Math.round(avgRestingHr) : undefined,
        };
    } catch (e) {
        logger.error('[HealthService] Failed to sync biometrics:', e);
    }

    return null;
};

/**
 * Get current health connection status
 */
export const getHealthConnectionStatus = (): HealthConnectionStatus => {
    try {
        const stored = localStorage.getItem(HEALTH_CONNECTION_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore parse errors
    }

    return {
        isConnected: false,
        source: 'none',
        lastSync: null,
        authorized: false,
    };
};

/**
 * Update connection status
 */
const updateConnectionStatus = (
    source: 'apple_health' | 'health_connect',
    authorized: boolean
): void => {
    const status: HealthConnectionStatus = {
        isConnected: authorized,
        source: authorized ? source : 'none',
        lastSync: authorized ? new Date().toISOString() : null,
        authorized,
    };

    try {
        localStorage.setItem(HEALTH_CONNECTION_KEY, JSON.stringify(status));
    } catch {
        // Ignore storage errors
    }
};

/**
 * Set health connection status (for manual connection flows)
 */
export const setHealthConnectionStatus = (status: HealthConnectionStatus): void => {
    try {
        localStorage.setItem(HEALTH_CONNECTION_KEY, JSON.stringify(status));
    } catch {
        // Ignore storage errors
    }
};

/**
 * Disconnect from health platform
 */
export const disconnectHealth = (): void => {
    try {
        localStorage.removeItem(HEALTH_CONNECTION_KEY);
        logger.log('[HealthService] Disconnected from health platform');
    } catch {
        // Ignore errors
    }
};

/**
 * Process sleep sessions into sleep stages summary
 */
export const processSleepStages = (sessions: SleepSession[]): {
    deep: number;
    core: number;
    rem: number;
    awake: number;
    total: number;
} => {
    const stages = { deep: 0, core: 0, rem: 0, awake: 0, total: 0 };

    for (const session of sessions) {
        const duration = session.duration; // minutes

        switch (session.value) {
            case 4: // Deep
                stages.deep += duration;
                stages.total += duration;
                break;
            case 3: // Core
                stages.core += duration;
                stages.total += duration;
                break;
            case 5: // REM
                stages.rem += duration;
                stages.total += duration;
                break;
            case 2: // Awake
                stages.awake += duration;
                break;
            case 1: // Asleep (unspecified)
                stages.core += duration; // Default to core
                stages.total += duration;
                break;
            case 0: // In Bed
                // Don't count as sleep
                break;
        }
    }

    return stages;
};

// Legacy exports for backward compatibility
export type HKQuantityTypeIdentifier =
    | 'HKQuantityTypeIdentifierHeartRate'
    | 'HKQuantityTypeIdentifierRestingHeartRate'
    | 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN'
    | 'HKQuantityTypeIdentifierOxygenSaturation'
    | 'HKQuantityTypeIdentifierRespiratoryRate';

export type HKCategoryTypeIdentifier = 'HKCategoryTypeIdentifierSleepAnalysis';

export interface HKSample {
    uuid: string;
    startDate: string;
    endDate: string;
    sourceName: string;
    device?: string;
}

export interface HKQuantitySample extends HKSample {
    quantityType: HKQuantityTypeIdentifier;
    quantity: number;
    unit: string;
}

export interface HKCategorySample extends HKSample {
    categoryType: HKCategoryTypeIdentifier;
    value: number;
}

// Legacy function - now calls real implementation
export const fetchSleepSamples = async (days: number = 7): Promise<HKCategorySample[]> => {
    const sessions = await fetchSleepSessions(days);

    // Convert to legacy format
    return sessions.map(s => ({
        uuid: s.uuid,
        startDate: s.startDate,
        endDate: s.endDate,
        sourceName: s.sourceName,
        categoryType: 'HKCategoryTypeIdentifierSleepAnalysis' as HKCategoryTypeIdentifier,
        value: s.value,
    }));
};

// Legacy availability check
export const isHealthKitAvailable = (): boolean => {
    return isNative && (isIOS || isAndroid);
};

export const getCurrentSleepStage = async (): Promise<'Deep' | 'Core' | 'REM' | 'Awake' | null> => {
    // Real-time sleep stage would require active health app connection
    // For now, return null - this would need background processing
    return null;
};
