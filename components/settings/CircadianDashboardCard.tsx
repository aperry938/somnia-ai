/**
 * Circadian Dashboard Card
 *
 * Displays sleep predictions based on the Borbély Two-Process Model:
 * - Process S (Sleep Homeostasis): Sleep pressure that builds during wakefulness
 * - Process C (Circadian): 24-hour rhythm affecting alertness
 *
 * Provides optimal sleep timing recommendations.
 */

import React, { useState } from 'react';
import { useCircadianPrediction } from '../../hooks/useCircadianPrediction';

const CHRONOTYPE_LABELS = {
    early: 'Early Bird (Lark)',
    normal: 'Normal',
    late: 'Night Owl'
};

export const CircadianDashboardCard: React.FC = () => {
    const {
        prediction,
        settings,
        quickAlertness,
        updateSettings,
        recordWakeTime
    } = useCircadianPrediction();

    const [expanded, setExpanded] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Calculate color based on value (green = good, red = concerning)
    const getAlertColor = (alertness: number): string => {
        if (alertness > 60) return 'text-green-400';
        if (alertness > 40) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getPressureColor = (pressure: number): string => {
        if (pressure < 40) return 'text-green-400';
        if (pressure < 70) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <button
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                className="w-full flex items-center justify-between min-h-[56px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-day-accent dark:focus:ring-night-accent rounded-lg"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-purple-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h3 className="font-serif text-lg">Circadian Rhythm</h3>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                            Borbély two-process model
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {prediction && (
                        <span className={`text-sm font-medium ${getAlertColor(quickAlertness)}`}>
                            {quickAlertness}% alert
                        </span>
                    )}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 text-day-text-secondary dark:text-night-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {expanded && prediction && (
                <div className="mt-4 space-y-4 animate-fadeIn">
                    {/* Current State Gauges */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Alertness */}
                        <div className="bg-white/30 dark:bg-black/20 rounded-lg p-3 text-center">
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mb-1">Alertness</p>
                            <div className="relative w-16 h-16 mx-auto">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        className="text-gray-700/30"
                                    />
                                    <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={`${prediction.currentAlertness * 1.76} 176`}
                                        className={getAlertColor(prediction.currentAlertness)}
                                    />
                                </svg>
                                <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${getAlertColor(prediction.currentAlertness)}`}>
                                    {prediction.currentAlertness}
                                </span>
                            </div>
                        </div>

                        {/* Sleep Pressure */}
                        <div className="bg-white/30 dark:bg-black/20 rounded-lg p-3 text-center">
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mb-1">Sleep Pressure</p>
                            <div className="relative w-16 h-16 mx-auto">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        className="text-gray-700/30"
                                    />
                                    <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={`${prediction.currentSleepPressure * 1.76} 176`}
                                        className={getPressureColor(prediction.currentSleepPressure)}
                                    />
                                </svg>
                                <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${getPressureColor(prediction.currentSleepPressure)}`}>
                                    {prediction.currentSleepPressure}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Optimal Times */}
                    <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-xs text-purple-300 mb-1">Optimal Bedtime</p>
                                <p className="text-2xl font-bold text-purple-200">{prediction.optimalSleepTime}</p>
                            </div>
                            <div>
                                <p className="text-xs text-indigo-300 mb-1">Optimal Wake</p>
                                <p className="text-2xl font-bold text-indigo-200">{prediction.optimalWakeTime}</p>
                            </div>
                        </div>
                        {prediction.sleepDebt > 0 && (
                            <div className="mt-3 text-center">
                                <span className="text-xs text-red-300">Sleep debt: {prediction.sleepDebt} hours</span>
                            </div>
                        )}
                    </div>

                    {/* Recommendation */}
                    <div className="flex items-start gap-2 text-sm bg-day-accent/10 dark:bg-night-accent/10 rounded-lg p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <p className="text-day-text-secondary dark:text-night-text-secondary">{prediction.recommendation}</p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => recordWakeTime()}
                            className="flex-1 py-2 text-sm bg-white/20 dark:bg-black/20 rounded-lg hover:bg-white/30 dark:hover:bg-black/30 transition-colors"
                        >
                            I just woke up
                        </button>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="px-3 py-2 bg-white/20 dark:bg-black/20 rounded-lg hover:bg-white/30 dark:hover:bg-black/30 transition-colors"
                            aria-label="Settings"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>

                    {/* Settings Panel */}
                    {showSettings && (
                        <div className="space-y-3 pt-3 border-t border-day-border dark:border-night-border animate-fadeIn">
                            <div>
                                <label className="text-xs text-day-text-secondary dark:text-night-text-secondary">Chronotype</label>
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                    {(['early', 'normal', 'late'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => updateSettings({ chronotype: type })}
                                            className={`py-2 px-3 text-xs rounded-lg transition-colors ${
                                                settings.chronotype === type
                                                    ? 'bg-day-accent dark:bg-night-accent text-white'
                                                    : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30'
                                            }`}
                                        >
                                            {CHRONOTYPE_LABELS[type]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                    Target Sleep: {settings.targetSleepHours} hours
                                </label>
                                <input
                                    type="range"
                                    min="5"
                                    max="10"
                                    step="0.5"
                                    value={settings.targetSleepHours}
                                    onChange={(e) => updateSettings({ targetSleepHours: parseFloat(e.target.value) })}
                                    className="w-full mt-1"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                    Last Night's Sleep: {settings.lastSleepDuration} hours
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="12"
                                    step="0.5"
                                    value={settings.lastSleepDuration}
                                    onChange={(e) => updateSettings({ lastSleepDuration: parseFloat(e.target.value) })}
                                    className="w-full mt-1"
                                />
                            </div>
                        </div>
                    )}

                    {/* Model Attribution */}
                    <p className="text-xs text-center text-day-text-secondary/50 dark:text-night-text-secondary/50">
                        Based on Borbély's Two-Process Model of Sleep Regulation
                    </p>
                </div>
            )}
        </div>
    );
};
