import { Biometrics } from '../types';

export type HKQuantityTypeIdentifier =
    | 'HKQuantityTypeIdentifierHeartRate'
    | 'HKQuantityTypeIdentifierRestingHeartRate'
    | 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN'
    | 'HKQuantityTypeIdentifierOxygenSaturation'
    | 'HKQuantityTypeIdentifierRespiratoryRate';

export type HKCategoryTypeIdentifier =
    | 'HKCategoryTypeIdentifierSleepAnalysis';

export interface HKSample {
    uuid: string;
    startDate: string;
    endDate: string;
    sourceName: string; // e.g., "Oura Ring", "Apple Watch"
    device?: string;
}

export interface HKQuantitySample extends HKSample {
    quantityType: HKQuantityTypeIdentifier;
    quantity: number;
    unit: string;
}

export interface HKCategorySample extends HKSample {
    categoryType: HKCategoryTypeIdentifier;
    value: number; // 0=InBed, 1=Asleep, 2=Awake, 3=Core, 4=Deep, 5=REM
}

export interface HealthConnectionStatus {
    isConnected: boolean;
    source: 'apple_health' | 'google_fit' | 'oura' | 'whoop' | 'none';
    lastSync: string | null;
    permissions: string[];
}

// Storage key for connection status
const HEALTH_CONNECTION_KEY = 'somnia_health_connection';

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
        permissions: [],
    };
};

/**
 * Check if native health integration is available
 * Requires Capacitor plugin for iOS/Android
 */
export const isHealthKitAvailable = (): boolean => {
    // Check for Capacitor plugin
    const win = window as unknown as Record<string, unknown>;
    return typeof win.Capacitor !== 'undefined' &&
           typeof win.CapacitorHealthKit !== 'undefined';
};

/**
 * Request health data authorization
 * Returns false if native integration unavailable
 */
export const requestHealthAuthorization = async (): Promise<boolean> => {
    if (!isHealthKitAvailable()) {
        console.warn('[HealthService] Native health integration not available');
        return false;
    }

    try {
        // Capacitor HealthKit plugin call would go here
        // const result = await CapacitorHealthKit.requestAuthorization({ ... });
        // return result.authorized;
        return false; // Not implemented without native plugin
    } catch (e) {
        console.error('[HealthService] Authorization failed:', e);
        return false;
    }
};

/**
 * Fetch sleep samples from connected health platform
 * Returns empty array if not connected
 */
export const fetchSleepSamples = async (_days: number = 7): Promise<HKCategorySample[]> => {
    const status = getHealthConnectionStatus();

    if (!status.isConnected) {
        console.warn('[HealthService] No health platform connected');
        return [];
    }

    if (!isHealthKitAvailable()) {
        console.warn('[HealthService] Native integration not available');
        return [];
    }

    try {
        // Capacitor HealthKit plugin call would go here
        // const result = await CapacitorHealthKit.querySleepAnalysis({ days });
        // return result.samples;
        return []; // Not implemented without native plugin
    } catch (e) {
        console.error('[HealthService] Failed to fetch sleep samples:', e);
        return [];
    }
};

/**
 * Get current sleep stage from connected wearable
 * Returns null if not connected or unavailable
 */
export const getCurrentSleepStage = async (): Promise<'Deep' | 'Core' | 'REM' | 'Awake' | null> => {
    const status = getHealthConnectionStatus();

    if (!status.isConnected) {
        return null;
    }

    // Real-time sleep stage requires active wearable connection
    // This would use WebSocket or polling to connected device
    return null;
};

/**
 * Sync biometrics from connected platform
 * Returns null if not connected
 */
export const syncBiometrics = async (): Promise<Partial<Biometrics> | null> => {
    const status = getHealthConnectionStatus();

    if (!status.isConnected || !isHealthKitAvailable()) {
        return null;
    }

    try {
        // Capacitor HealthKit plugin call would go here
        // const result = await CapacitorHealthKit.queryBiometrics({ ... });
        // return { avgSleep: result.avgSleepHours, ... };
        return null; // Not implemented without native plugin
    } catch (e) {
        console.error('[HealthService] Failed to sync biometrics:', e);
        return null;
    }
};

/**
 * Update connection status after OAuth flow
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
    } catch {
        // Ignore errors
    }
};
