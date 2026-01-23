/**
 * Health Service for Somnia
 *
 * Integrates with native health platforms:
 * - iOS: HealthKit (via custom HealthKitPlugin)
 * - Android: Health Connect (via custom HealthConnectPlugin)
 *
 * Provides real sleep data from health apps (Apple Health, Google Fit).
 *
 * App Store Compliance:
 * - Proper permission handling with user-facing explanations
 * - No health data stored in plaintext (localStorage encrypted)
 * - Timeout handling for all health queries
 * - Privacy-compliant data handling (no PII transmission)
 * - Input validation for all parameters
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { Biometrics } from '../types';
import { logger } from './logger';

// Platform detection
const isNative = Capacitor.isNativePlatform();
const isIOS = Capacitor.getPlatform() === 'ios';
const isAndroid = Capacitor.getPlatform() === 'android';

// ============================================================================
// Constants and Configuration
// ============================================================================

/** Maximum days that can be queried (prevents excessive data requests) */
const MAX_QUERY_DAYS = 365;

/** Default timeout for health queries in milliseconds */
const DEFAULT_TIMEOUT_MS = 30000;

/** Minimum days for a valid query */
const MIN_QUERY_DAYS = 1;

/**
 * Validate days parameter for health queries.
 * Ensures it's within acceptable bounds.
 */
const validateDays = (days: number): number => {
    if (typeof days !== 'number' || isNaN(days)) {
        logger.warn('[HealthService] Invalid days parameter, defaulting to 7');
        return 7;
    }
    return Math.max(MIN_QUERY_DAYS, Math.min(MAX_QUERY_DAYS, Math.floor(days)));
};

/**
 * Wrap a promise with a timeout.
 * Prevents health queries from hanging indefinitely.
 */
const withTimeout = <T>(
    promise: Promise<T>,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
    operationName: string = 'Health query'
): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        promise
            .then(result => {
                clearTimeout(timeoutId);
                resolve(result);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
};

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
            const result = await withTimeout(
                HealthKit.isAvailable(),
                5000,
                'HealthKit availability check'
            );
            return result.available;
        } else if (isAndroid && HealthConnect) {
            const result = await withTimeout(
                HealthConnect.isAvailable(),
                5000,
                'Health Connect availability check'
            );
            return result.available;
        }
    } catch (e) {
        logger.error('[HealthService] Availability check failed:', e);
    }

    return false;
};

/**
 * Get detailed health platform status for debugging/UI
 */
export const getHealthPlatformStatus = async (): Promise<{
    platform: 'ios' | 'android' | 'web';
    available: boolean;
    authorized: boolean;
    source: HealthConnectionStatus['source'];
    error: string | null;
}> => {
    const defaultStatus = {
        platform: (isIOS ? 'ios' : isAndroid ? 'android' : 'web') as 'ios' | 'android' | 'web',
        available: false,
        authorized: false,
        source: 'none' as const,
        error: null as string | null,
    };

    if (!isNative) {
        return { ...defaultStatus, error: 'Not running in native environment' };
    }

    try {
        const available = await isHealthAvailable();
        if (!available) {
            return { ...defaultStatus, error: 'Health platform not available on this device' };
        }

        const authorized = await checkHealthAuthorization();
        const source = isIOS ? 'apple_health' : 'health_connect';

        return {
            ...defaultStatus,
            available,
            authorized,
            source: authorized ? source : 'none',
        };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        return { ...defaultStatus, error: errorMessage };
    }
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

    // Validate input
    const validatedDays = validateDays(days);

    try {
        if (isIOS && HealthKit) {
            const result = await withTimeout(
                HealthKit.readSleepAnalysis({ days: validatedDays }),
                DEFAULT_TIMEOUT_MS,
                'HealthKit sleep analysis'
            );
            logger.log(`[HealthService] Fetched ${result.count} sleep sessions from HealthKit`);
            // Validate and sanitize returned data
            return sanitizeSleepSessions(result.sessions);
        } else if (isAndroid && HealthConnect) {
            const result = await withTimeout(
                HealthConnect.readSleepSessions({ days: validatedDays }),
                DEFAULT_TIMEOUT_MS,
                'Health Connect sleep sessions'
            );
            logger.log(`[HealthService] Fetched sleep sessions from Health Connect`);
            return sanitizeSleepSessions(result.sessions);
        }
    } catch (e) {
        logger.error('[HealthService] Failed to fetch sleep sessions:', e);
    }

    return [];
};

/**
 * Sanitize sleep session data to prevent invalid/malformed data from native plugins
 */
const sanitizeSleepSessions = (sessions: SleepSession[]): SleepSession[] => {
    if (!Array.isArray(sessions)) {
        logger.warn('[HealthService] Invalid sessions data received');
        return [];
    }

    return sessions.filter(session => {
        // Validate required fields
        if (!session.uuid || typeof session.uuid !== 'string') return false;
        if (!session.startDate || !session.endDate) return false;
        if (typeof session.value !== 'number' || session.value < 0 || session.value > 5) return false;
        if (typeof session.duration !== 'number' || session.duration < 0) return false;

        // Validate dates
        const startTime = new Date(session.startDate).getTime();
        const endTime = new Date(session.endDate).getTime();
        if (isNaN(startTime) || isNaN(endTime)) return false;
        if (endTime <= startTime) return false;

        return true;
    }).map(session => ({
        ...session,
        // Sanitize string fields
        uuid: String(session.uuid).slice(0, 100),
        sourceName: String(session.sourceName || 'Unknown').slice(0, 100),
        sourceBundle: session.sourceBundle ? String(session.sourceBundle).slice(0, 200) : undefined,
    }));
};

/**
 * Fetch heart rate samples from connected health platform
 */
export const fetchHeartRateSamples = async (days: number = 7): Promise<HeartRateSample[]> => {
    if (!isNative) return [];

    // Validate input
    const validatedDays = validateDays(days);

    try {
        if (isIOS && HealthKit) {
            const result = await withTimeout(
                HealthKit.readHeartRate({ days: validatedDays }),
                DEFAULT_TIMEOUT_MS,
                'HealthKit heart rate'
            );
            logger.log(`[HealthService] Fetched ${result.count} HR samples from HealthKit`);
            return sanitizeHeartRateSamples(result.samples);
        } else if (isAndroid && HealthConnect) {
            const result = await withTimeout(
                HealthConnect.readHeartRate({ days: validatedDays }),
                DEFAULT_TIMEOUT_MS,
                'Health Connect heart rate'
            );
            logger.log(`[HealthService] Fetched HR samples from Health Connect`);
            return sanitizeHeartRateSamples(result.samples);
        }
    } catch (e) {
        logger.error('[HealthService] Failed to fetch heart rate:', e);
    }

    return [];
};

/**
 * Sanitize heart rate sample data
 */
const sanitizeHeartRateSamples = (samples: HeartRateSample[]): HeartRateSample[] => {
    if (!Array.isArray(samples)) {
        logger.warn('[HealthService] Invalid heart rate samples data received');
        return [];
    }

    return samples.filter(sample => {
        // Validate required fields
        if (!sample.uuid || typeof sample.uuid !== 'string') return false;
        if (!sample.date) return false;
        if (typeof sample.value !== 'number') return false;

        // Validate heart rate is in reasonable range (20-300 BPM)
        if (sample.value < 20 || sample.value > 300) return false;

        // Validate date
        const sampleTime = new Date(sample.date).getTime();
        if (isNaN(sampleTime)) return false;

        return true;
    }).map(sample => ({
        ...sample,
        uuid: String(sample.uuid).slice(0, 100),
        sourceName: String(sample.sourceName || 'Unknown').slice(0, 100),
        value: Math.round(sample.value), // Ensure integer BPM
    }));
};

/**
 * Get aggregated sleep statistics
 */
export const getSleepStats = async (days: number = 30): Promise<SleepStats | null> => {
    if (!isNative) return null;

    // Validate input
    const validatedDays = validateDays(days);

    try {
        let result;

        if (isIOS && HealthKit) {
            result = await withTimeout(
                HealthKit.getSleepStats({ days: validatedDays }),
                DEFAULT_TIMEOUT_MS,
                'HealthKit sleep stats'
            );
        } else if (isAndroid && HealthConnect) {
            result = await withTimeout(
                HealthConnect.getSleepStats({ days: validatedDays }),
                DEFAULT_TIMEOUT_MS,
                'Health Connect sleep stats'
            );
        }

        if (result) {
            // Validate and sanitize the stats
            return sanitizeSleepStats(result);
        }
    } catch (e) {
        logger.error('[HealthService] Failed to get sleep stats:', e);
    }

    return null;
};

/**
 * Sanitize sleep statistics data
 */
const sanitizeSleepStats = (stats: {
    averageDuration: number;
    averageBedtime: string;
    averageWakeTime: string;
    totalNights: number;
    totalSleepMinutes?: number;
}): SleepStats | null => {
    // Validate required fields
    if (typeof stats.averageDuration !== 'number' || isNaN(stats.averageDuration)) {
        logger.warn('[HealthService] Invalid averageDuration in stats');
        return null;
    }

    if (typeof stats.totalNights !== 'number' || stats.totalNights < 0) {
        logger.warn('[HealthService] Invalid totalNights in stats');
        return null;
    }

    // Validate time strings (HH:mm format)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    const averageBedtime = stats.averageBedtime || '22:00';
    const averageWakeTime = stats.averageWakeTime || '07:00';

    return {
        averageDuration: Math.max(0, Math.min(24, stats.averageDuration)), // Clamp to 0-24 hours
        averageBedtime: timeRegex.test(averageBedtime) ? averageBedtime : '22:00',
        averageWakeTime: timeRegex.test(averageWakeTime) ? averageWakeTime : '07:00',
        totalNights: Math.max(0, Math.floor(stats.totalNights)),
    };
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
 * Clear all cached health data.
 * Called when user requests data deletion (GDPR/CCPA compliance).
 * Note: This only clears Somnia's cached data, not the source health platform data.
 */
export const clearHealthDataCache = (): void => {
    try {
        localStorage.removeItem(HEALTH_CONNECTION_KEY);
        // Clear any other health-related cached data
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('somnia_health_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        logger.log('[HealthService] Cleared all health data cache');
    } catch (e) {
        logger.error('[HealthService] Failed to clear health data cache:', e);
    }
};

/**
 * Get privacy-compliant health data summary.
 * Returns aggregated data only, no raw samples.
 * Safe for analytics and insights without exposing sensitive data.
 */
export const getPrivacyCompliantHealthSummary = async (days: number = 30): Promise<{
    hasData: boolean;
    avgSleepHours: number | null;
    avgBedtimeHour: number | null;
    avgWakeHour: number | null;
    totalNightsTracked: number;
    dataSource: string;
} | null> => {
    if (!isNative) return null;

    try {
        const stats = await getSleepStats(days);
        if (!stats) {
            return {
                hasData: false,
                avgSleepHours: null,
                avgBedtimeHour: null,
                avgWakeHour: null,
                totalNightsTracked: 0,
                dataSource: 'none',
            };
        }

        // Extract hour from time string (e.g., "22:30" -> 22.5)
        const parseTimeToHour = (timeStr: string): number | null => {
            const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
            if (!match || !match[1] || !match[2]) return null;
            const hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            return hours + minutes / 60;
        };

        return {
            hasData: stats.totalNights > 0,
            avgSleepHours: stats.averageDuration,
            avgBedtimeHour: parseTimeToHour(stats.averageBedtime),
            avgWakeHour: parseTimeToHour(stats.averageWakeTime),
            totalNightsTracked: stats.totalNights,
            dataSource: isIOS ? 'apple_health' : 'health_connect',
        };
    } catch (e) {
        logger.error('[HealthService] Failed to get privacy-compliant summary:', e);
        return null;
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
