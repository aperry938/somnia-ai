import React, { useState, useEffect } from 'react';
import { isPremium } from '../../services/secureSubscriptionService';
import { useToast } from '../shared/Toast';
import {
    scheduleSleepDetectionNotification,
    cancelSleepDetectionNotification,
    requestSleepDetectionPermissions
} from '../../hooks/useSleepDetection';
import { Capacitor } from '@capacitor/core';
import { logger } from '../../services/logger';

const STORAGE_KEY = 'somnia_sleep_detection';

interface SleepDetectionSettings {
    enabled: boolean;
    inactivityHours: number;
    soundId: string; // Alarm sound to use when triggered
}

const DEFAULT_SETTINGS: SleepDetectionSettings = {
    enabled: false,
    inactivityHours: 5,
    soundId: 'somnia'
};

const ALARM_SOUNDS = [
    { id: 'classic', name: 'Classic' },
    { id: 'aether', name: 'Aether' },
    { id: 'somnia', name: 'Somnia' },
    { id: 'prism', name: 'Prism' },
    { id: 'cyber-dawn', name: 'Cyber-Dawn' },
    { id: 'solar-ascent', name: 'Solar Ascent' },
];

export const SleepDetectionSettingsCard: React.FC = () => {
    const [settings, setSettings] = useState<SleepDetectionSettings>(DEFAULT_SETTINGS);
    const [isScheduling, setIsScheduling] = useState(false);
    const userIsPremium = isPremium();
    const { showToast } = useToast();

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setSettings(JSON.parse(stored));
        } catch {
            // Use defaults
        }
    }, []);

    const updateSettings = async (updates: Partial<SleepDetectionSettings>) => {
        const newSettings = { ...settings, ...updates };
        setSettings(newSettings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

        // If changing hours or sound while enabled, reschedule the notification
        if (newSettings.enabled && Capacitor.isNativePlatform()) {
            await scheduleSleepDetectionNotification(newSettings.inactivityHours, newSettings.soundId);
        }
    };

    const handleToggle = async (enabled: boolean) => {
        if (!userIsPremium) return;

        setIsScheduling(true);

        try {
            if (enabled) {
                // Request notification permissions
                if (Capacitor.isNativePlatform()) {
                    const granted = await requestSleepDetectionPermissions();
                    if (!granted) {
                        showToast('Please enable notifications in Settings for Sleep Detection to work');
                        setIsScheduling(false);
                        return;
                    }

                    // Schedule the notification
                    await scheduleSleepDetectionNotification(settings.inactivityHours, settings.soundId);
                    showToast('Sleep Detection enabled - we\'ll wake you after inactivity');
                }

                updateSettings({ enabled: true });
            } else {
                // Cancel any scheduled notification
                if (Capacitor.isNativePlatform()) {
                    await cancelSleepDetectionNotification();
                }

                updateSettings({ enabled: false });
                showToast('Sleep Detection disabled');
            }
        } catch (error) {
            logger.error('[SleepDetection] Toggle error:', error);
            showToast('Failed to update Sleep Detection');
        } finally {
            setIsScheduling(false);
        }
    };

    return (
        <div className={`bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4 ${!userIsPremium ? 'opacity-75' : ''}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div>
                        <h3 className="font-serif text-lg">Sleep Detection</h3>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                            Auto wake-up after detected sleep
                        </p>
                    </div>
                    {!userIsPremium && (
                        <span className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            PRO
                        </span>
                    )}
                </div>
                <label className={`relative inline-flex items-center ${userIsPremium && !isScheduling ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                        type="checkbox"
                        checked={userIsPremium && settings.enabled}
                        onChange={(e) => handleToggle(e.target.checked)}
                        disabled={!userIsPremium || isScheduling}
                        aria-label="Enable sleep detection"
                        className="sr-only peer"
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-day-accent dark:peer-checked:bg-night-accent ${!userIsPremium || isScheduling ? 'opacity-50' : ''}`}></div>
                </label>
            </div>

            {userIsPremium && settings.enabled && (
                <div className="space-y-3">
                    <div>
                        <label className="text-sm text-day-text-secondary dark:text-night-text-secondary block mb-2">
                            Inactivity threshold: <span className="font-bold text-day-accent dark:text-night-accent">{settings.inactivityHours} hours</span>
                        </label>
                        <div className="relative">
                            <input
                                type="range"
                                min="3"
                                max="10"
                                step="0.5"
                                value={settings.inactivityHours}
                                onChange={(e) => updateSettings({ inactivityHours: parseFloat(e.target.value) })}
                                aria-label={`Inactivity threshold: ${settings.inactivityHours} hours`}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-day-accent dark:accent-night-accent"
                                style={{
                                    background: `linear-gradient(to right, 
                                        var(--color-day-accent, rgb(129, 140, 248)) 0%, 
                                        var(--color-day-accent, rgb(129, 140, 248)) ${((settings.inactivityHours - 3) / 7) * 100}%, 
                                        rgb(75, 85, 99) ${((settings.inactivityHours - 3) / 7) * 100}%, 
                                        rgb(75, 85, 99) 100%)`
                                }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-day-text-secondary dark:text-night-text-secondary mt-1">
                            <span>3h</span>
                            <span>10h</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-day-text-secondary dark:text-night-text-secondary block mb-2">
                            Wake-up sound
                        </label>
                        <select
                            value={settings.soundId}
                            onChange={(e) => updateSettings({ soundId: e.target.value })}
                            aria-label="Wake-up sound"
                            className="w-full bg-white/50 dark:bg-black/30 border border-day-border dark:border-night-border rounded-lg px-3 py-3 min-h-[48px] text-base"
                        >
                            {ALARM_SOUNDS.map(sound => (
                                <option key={sound.id} value={sound.id}>{sound.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-sm text-green-800 dark:text-green-200 font-medium">Works while phone is locked</p>
                                <p className="text-xs text-green-700 dark:text-green-300/80 mt-1">
                                    After {settings.inactivityHours} hours of inactivity, you'll receive a notification to record your dreams—even if the app is closed.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
