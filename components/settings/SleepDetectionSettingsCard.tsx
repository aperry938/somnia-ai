import React, { useState, useEffect } from 'react';
import { isPremium } from '../../services/secureSubscriptionService';

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
    { id: 'somnia', name: 'Somnia' },
    { id: 'gentle', name: 'Gentle' },
    { id: 'classic', name: 'Classic' },
    { id: 'prism', name: 'Prism' },
    { id: 'aether', name: 'Aether' },
    { id: 'bamboo', name: 'Bamboo' },
];

export const SleepDetectionSettingsCard: React.FC = () => {
    const [settings, setSettings] = useState<SleepDetectionSettings>(DEFAULT_SETTINGS);
    const userIsPremium = isPremium();

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setSettings(JSON.parse(stored));
        } catch {
            // Use defaults
        }
    }, []);

    const updateSettings = (updates: Partial<SleepDetectionSettings>) => {
        const newSettings = { ...settings, ...updates };
        setSettings(newSettings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
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
                <label className={`relative inline-flex items-center ${userIsPremium ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                        type="checkbox"
                        checked={userIsPremium && settings.enabled}
                        onChange={(e) => userIsPremium && updateSettings({ enabled: e.target.checked })}
                        disabled={!userIsPremium}
                        className="sr-only peer"
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-day-accent dark:peer-checked:bg-night-accent ${!userIsPremium ? 'opacity-50' : ''}`}></div>
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
                            className="w-full bg-white/50 dark:bg-black/30 border border-day-border dark:border-night-border rounded-lg px-3 py-2 text-sm"
                        >
                            {ALARM_SOUNDS.map(sound => (
                                <option key={sound.id} value={sound.id}>{sound.name}</option>
                            ))}
                        </select>
                    </div>

                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary bg-white/30 dark:bg-black/20 p-2 rounded-lg">
                        When your phone is inactive for {settings.inactivityHours} hours, we'll trigger your morning wake-up with your selected alarm sound and open the dream capture screen—just like a scheduled alarm.
                    </p>
                </div>
            )}
        </div>
    );
};
