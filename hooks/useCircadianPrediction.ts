/**
 * React hook for circadian rhythm predictions
 *
 * Uses the Borbély two-process model to predict:
 * - Optimal sleep and wake times
 * - Current sleep pressure
 * - Current alertness level
 * - Sleep debt accumulation
 *
 * Based on user's sleep history and chronotype.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CircadianPrediction,
    BorbélyParams,
    calculateCircadianPrediction,
    getQuickAlertness
} from '../services/mlService';

const STORAGE_KEY = 'somnia_circadian_settings';
const WAKE_TIME_KEY = 'somnia_last_wake_time';

interface CircadianSettings {
    chronotype: 'early' | 'normal' | 'late';
    targetSleepHours: number;
    lastSleepDuration: number;
}

const DEFAULT_SETTINGS: CircadianSettings = {
    chronotype: 'normal',
    targetSleepHours: 8,
    lastSleepDuration: 7
};

interface UseCircadianPredictionReturn {
    prediction: CircadianPrediction | null;
    settings: CircadianSettings;
    quickAlertness: number;
    updateSettings: (updates: Partial<CircadianSettings>) => void;
    recordWakeTime: (time?: Date) => void;
    refresh: () => void;
}

export const useCircadianPrediction = (): UseCircadianPredictionReturn => {
    const [settings, setSettings] = useState<CircadianSettings>(DEFAULT_SETTINGS);
    const [lastWakeTime, setLastWakeTime] = useState<Date | null>(null);
    const [prediction, setPrediction] = useState<CircadianPrediction | null>(null);
    const [quickAlertness, setQuickAlertness] = useState<number>(50);

    // Load settings on mount
    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem(STORAGE_KEY);
            if (savedSettings) {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
            }

            const savedWakeTime = localStorage.getItem(WAKE_TIME_KEY);
            if (savedWakeTime) {
                const wakeDate = new Date(savedWakeTime);
                // Only use if within last 24 hours
                if (Date.now() - wakeDate.getTime() < 24 * 60 * 60 * 1000) {
                    setLastWakeTime(wakeDate);
                } else {
                    // Default to 7 AM today if no recent wake time
                    const today = new Date();
                    today.setHours(7, 0, 0, 0);
                    setLastWakeTime(today);
                }
            } else {
                // Default to 7 AM today
                const today = new Date();
                today.setHours(7, 0, 0, 0);
                setLastWakeTime(today);
            }
        } catch {
            // Use defaults
        }
    }, []);

    // Update predictions whenever settings or wake time changes
    useEffect(() => {
        if (!lastWakeTime) return;

        const params: BorbélyParams = {
            lastSleepEnd: lastWakeTime,
            lastSleepDuration: settings.lastSleepDuration,
            chronotype: settings.chronotype,
            targetSleepHours: settings.targetSleepHours
        };

        const newPrediction = calculateCircadianPrediction(params);
        setPrediction(newPrediction);
        setQuickAlertness(getQuickAlertness(lastWakeTime));
    }, [lastWakeTime, settings]);

    // Refresh every minute
    useEffect(() => {
        const interval = setInterval(() => {
            if (lastWakeTime) {
                const params: BorbélyParams = {
                    lastSleepEnd: lastWakeTime,
                    lastSleepDuration: settings.lastSleepDuration,
                    chronotype: settings.chronotype,
                    targetSleepHours: settings.targetSleepHours
                };
                setPrediction(calculateCircadianPrediction(params));
                setQuickAlertness(getQuickAlertness(lastWakeTime));
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [lastWakeTime, settings]);

    const updateSettings = useCallback((updates: Partial<CircadianSettings>) => {
        setSettings(prev => {
            const newSettings = { ...prev, ...updates };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
            return newSettings;
        });
    }, []);

    const recordWakeTime = useCallback((time?: Date) => {
        const wakeTime = time || new Date();
        setLastWakeTime(wakeTime);
        localStorage.setItem(WAKE_TIME_KEY, wakeTime.toISOString());
    }, []);

    const refresh = useCallback(() => {
        if (!lastWakeTime) return;

        const params: BorbélyParams = {
            lastSleepEnd: lastWakeTime,
            lastSleepDuration: settings.lastSleepDuration,
            chronotype: settings.chronotype,
            targetSleepHours: settings.targetSleepHours
        };
        setPrediction(calculateCircadianPrediction(params));
        setQuickAlertness(getQuickAlertness(lastWakeTime));
    }, [lastWakeTime, settings]);

    return useMemo(() => ({
        prediction,
        settings,
        quickAlertness,
        updateSettings,
        recordWakeTime,
        refresh
    }), [prediction, settings, quickAlertness, updateSettings, recordWakeTime, refresh]);
};
