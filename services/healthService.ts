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

// Mock Data Service
export const requestHealthAuthorization = async (): Promise<boolean> => {
    // Simulate iOS HealthKit prompt
    return new Promise(resolve => setTimeout(() => resolve(true), 1500));
};

export const fetchSleepSamples = async (days: number = 7): Promise<HKCategorySample[]> => {
    // Return mock sleep stages suitable for graph visualization
    const samples: HKCategorySample[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
        const night = new Date(now);
        night.setDate(night.getDate() - i);
        night.setHours(23, 0, 0, 0); // Bedtime 11 PM

        // Generate mock stages (approx 8 hours)
        let currentTime = night.getTime();
        const wakeTime = currentTime + (8 * 60 * 60 * 1000);

        while (currentTime < wakeTime) {
            const stageDuration = Math.random() * (90 * 60 * 1000); // Up to 90 mins
            const value = Math.floor(Math.random() * 6); // 0-5

            samples.push({
                uuid: crypto.randomUUID(),
                startDate: new Date(currentTime).toISOString(),
                endDate: new Date(currentTime + stageDuration).toISOString(),
                sourceName: "Apple Watch",
                categoryType: 'HKCategoryTypeIdentifierSleepAnalysis',
                value
            });
            currentTime += stageDuration;
        }
    }
    return samples;
};

export const getCurrentSleepStage = async (): Promise<'Deep' | 'Core' | 'REM' | 'Awake'> => {
    // Mock random stage: 45% Core, 25% Deep, 20% REM, 10% Awake
    const rand = Math.random();
    if (rand < 0.45) return 'Core';
    if (rand < 0.70) return 'Deep';
    if (rand < 0.90) return 'REM';
    return 'Awake';
};

export const syncBiometrics = async (): Promise<Partial<Biometrics>> => {
    // Simulate fetching latest HRV/RHR
    await new Promise(r => setTimeout(r, 2000));
    return {
        avgSleep: 7.5, // Mock override
    };
};
