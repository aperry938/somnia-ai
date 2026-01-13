import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useToast } from '../shared/Toast';
import { refreshDreamWidget } from '../../services/widgetService';

const STORAGE_KEY = 'somnia_lockscreen_widget';

interface LockScreenWidgetSettings {
    hasSeenSetupInstructions: boolean;
    lastSetupReminder: string | null;
}

const DEFAULT_SETTINGS: LockScreenWidgetSettings = {
    hasSeenSetupInstructions: false,
    lastSetupReminder: null
};

/**
 * LockScreenWidgetSettingsCard
 *
 * Provides setup instructions for the Quick Dream Record widget
 * that allows users to record dreams from their lock screen.
 */
export const LockScreenWidgetSettingsCard: React.FC = () => {
    const [settings, setSettings] = useState<LockScreenWidgetSettings>(DEFAULT_SETTINGS);
    const [showInstructions, setShowInstructions] = useState(false);
    const { showToast } = useToast();

    const isIOS = Capacitor.getPlatform() === 'ios';
    const isAndroid = Capacitor.getPlatform() === 'android';
    const isNative = Capacitor.isNativePlatform();

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setSettings(JSON.parse(stored));
        } catch {
            // Use defaults
        }
    }, []);

    const updateSettings = (updates: Partial<LockScreenWidgetSettings>) => {
        const newSettings = { ...settings, ...updates };
        setSettings(newSettings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    };

    const handleRefreshWidget = async () => {
        await refreshDreamWidget();
        showToast('Dream widget refreshed');
    };

    const handleDismissSetup = () => {
        updateSettings({ hasSeenSetupInstructions: true });
        setShowInstructions(false);
        showToast('You can always add the widget from your device settings');
    };

    // Not available on web
    if (!isNative) {
        return null;
    }

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-serif text-lg">Quick Dream Record</h3>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                            Lock screen widget for instant recording
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="px-3 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                    {showInstructions ? 'Hide' : 'Setup'}
                </button>
            </div>

            {showInstructions && (
                <div className="space-y-4 mt-4 pt-4 border-t border-day-border dark:border-night-border">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700/50 rounded-lg p-4">
                        <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">
                            How It Works
                        </h4>
                        <p className="text-sm text-purple-700 dark:text-purple-300/80">
                            Add the "Quick Dream Record" widget to your lock screen. When you wake up from a dream,
                            simply tap the widget to instantly start recording—no need to unlock your phone first.
                        </p>
                    </div>

                    {isIOS && (
                        <div className="space-y-3">
                            <h4 className="font-medium">iOS Setup Instructions</h4>
                            <ol className="space-y-2 text-sm text-day-text-secondary dark:text-night-text-secondary">
                                <li className="flex gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                    <span>Lock your phone and long-press on the lock screen</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                    <span>Tap "Customize" at the bottom</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                    <span>Select "Lock Screen" and tap the widget area</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                                    <span>Search for "Somnia" and add "Quick Dream Record"</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                                    <span>Choose circular or rectangular widget style</span>
                                </li>
                            </ol>
                            <p className="text-xs text-day-text-secondary/70 dark:text-night-text-secondary/70 italic">
                                Requires iOS 16 or later. Widget taps will open Somnia to dream recording.
                            </p>
                        </div>
                    )}

                    {isAndroid && (
                        <div className="space-y-3">
                            <h4 className="font-medium">Android Setup Instructions</h4>
                            <ol className="space-y-2 text-sm text-day-text-secondary dark:text-night-text-secondary">
                                <li className="flex gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                    <span>Long-press on your home screen</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                    <span>Select "Widgets" from the menu</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                    <span>Find and expand "Somnia"</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                                    <span>Drag "Quick Dream Record" to your home screen</span>
                                </li>
                            </ol>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-3 mt-3">
                                <div className="flex items-start gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Lock Screen Widget (Android 12+)</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1">
                                            On Android 12+, you can also add widgets directly to your lock screen via Settings → Display → Lock screen.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleRefreshWidget}
                            className="flex-1 py-3 px-4 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                        >
                            Refresh Widget
                        </button>
                        <button
                            onClick={handleDismissSetup}
                            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800/50 text-day-text-secondary dark:text-night-text-secondary rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}

            {!showInstructions && (
                <div className="flex items-center gap-2 text-sm text-day-text-secondary dark:text-night-text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Tap to record dreams right from your {isIOS ? 'lock screen' : 'home/lock screen'}</span>
                </div>
            )}
        </div>
    );
};
