import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'somnia_sleep_detection';

interface SleepDetectionSettings {
    enabled: boolean;
    inactivityHours: number;
}

const DEFAULT_SETTINGS: SleepDetectionSettings = {
    enabled: false,
    inactivityHours: 5
};

export const SleepDetectionSettingsCard: React.FC = () => {
    const [settings, setSettings] = useState<SleepDetectionSettings>(DEFAULT_SETTINGS);

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
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-serif text-lg">Sleep Detection</h3>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                        Prompt dream logging after inactivity
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.enabled}
                        onChange={(e) => updateSettings({ enabled: e.target.checked })}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-day-accent dark:peer-checked:bg-night-accent"></div>
                </label>
            </div>

            {settings.enabled && (
                <div className="space-y-3">
                    <div>
                        <label className="text-sm text-day-text-secondary dark:text-night-text-secondary block mb-2">
                            Inactivity threshold: <span className="font-bold text-day-accent dark:text-night-accent">{settings.inactivityHours} hours</span>
                        </label>
                        <input
                            type="range"
                            min="3"
                            max="10"
                            step="0.5"
                            value={settings.inactivityHours}
                            onChange={(e) => updateSettings({ inactivityHours: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-day-accent dark:accent-night-accent"
                        />
                        <div className="flex justify-between text-xs text-day-text-secondary dark:text-night-text-secondary mt-1">
                            <span>3h</span>
                            <span>10h</span>
                        </div>
                    </div>

                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary bg-white/30 dark:bg-black/20 p-2 rounded-lg">
                        💡 When your phone is inactive for {settings.inactivityHours} hours, we'll prompt you to log your dreams when you wake up—even without an alarm set.
                    </p>
                </div>
            )}
        </div>
    );
};
