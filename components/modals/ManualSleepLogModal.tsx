/**
 * ManualSleepLogModal
 * Allows users to manually log pre-sleep activities when they didn't use Sleep Gateway.
 * Shown when logging a dream without prior session data.
 */

import React, { useState, useEffect } from 'react';
import { ManualSleepActivity, SleepAids } from '../../types';
import haptics from '../../services/hapticsService';

interface ManualSleepLogModalProps {
    onComplete: (sleepAids: SleepAids) => void;
    onSkip: () => void;
}

// Common preset activities for quick-add
// SVG icon components for activities
const ActivityIcons: Record<string, React.ReactNode> = {
    'White Noise': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>,
    'Brown Noise': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>,
    'Rain Sounds': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
    '4-7-8 Breathing': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    'Box Breathing': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2} /></svg>,
    'Meditation': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    'Reading': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    'Other': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
};

const PRESET_ACTIVITIES: Array<{
    type: ManualSleepActivity['type'];
    name: string;
}> = [
        { type: 'soundscape', name: 'White Noise' },
        { type: 'soundscape', name: 'Brown Noise' },
        { type: 'soundscape', name: 'Rain Sounds' },
        { type: 'breathing', name: '4-7-8 Breathing' },
        { type: 'breathing', name: 'Box Breathing' },
        { type: 'meditation', name: 'Meditation' },
        { type: 'reading', name: 'Reading' },
        { type: 'other', name: 'Other' },
    ];

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

export const ManualSleepLogModal: React.FC<ManualSleepLogModalProps> = ({ onComplete, onSkip }) => {
    const [activities, setActivities] = useState<ManualSleepActivity[]>([]);
    const [dayRating, setDayRating] = useState<number | null>(null);
    const [dayNotes, setDayNotes] = useState('');
    const [customActivityName, setCustomActivityName] = useState('');
    const [selectedDuration, setSelectedDuration] = useState(15);
    const [showCustom, setShowCustom] = useState(false);

    // Handle Escape key to skip/close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onSkip();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onSkip]);

    const addActivity = (preset: typeof PRESET_ACTIVITIES[0]) => {
        haptics.light();

        if (preset.name === 'Other') {
            setShowCustom(true);
            return;
        }

        // Check if already added
        const exists = activities.some(a => a.name === preset.name);
        if (exists) return;

        setActivities(prev => [...prev, {
            type: preset.type,
            name: preset.name,
            durationMinutes: selectedDuration,
        }]);
    };

    const addCustomActivity = () => {
        if (!customActivityName.trim()) return;
        haptics.light();

        setActivities(prev => [...prev, {
            type: 'other',
            name: customActivityName.trim(),
            durationMinutes: selectedDuration,
        }]);
        setCustomActivityName('');
        setShowCustom(false);
    };

    const removeActivity = (index: number) => {
        haptics.light();
        setActivities(prev => prev.filter((_, i) => i !== index));
    };

    const updateDuration = (index: number, duration: number) => {
        setActivities(prev => prev.map((a, i) =>
            i === index ? { ...a, durationMinutes: duration } : a
        ));
    };

    const handleComplete = () => {
        haptics.success();
        const sleepAids: SleepAids = {
            manualActivities: activities,
            dayRating,
            dayNotes: dayNotes.trim() || undefined,
        };
        onComplete(sleepAids);
    };

    const handleSkip = () => {
        haptics.light();
        onSkip();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Log yesterday's sleep activities">
            <div className="w-full max-w-md bg-day-card-bg dark:bg-night-card-bg rounded-2xl border border-day-border dark:border-night-border overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-day-border dark:border-night-border">
                    <h2 className="font-serif text-xl text-center">What did you do before bed?</h2>
                    <p className="text-day-text-secondary dark:text-night-text-secondary text-sm text-center mt-1">
                        Log activities from last night's wind-down
                    </p>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Duration selector */}
                    <div>
                        <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-2">Default duration:</p>
                        <div className="flex flex-wrap gap-2">
                            {DURATION_OPTIONS.map(d => (
                                <button
                                    key={d}
                                    onClick={() => setSelectedDuration(d)}
                                    className={`px-3 py-1.5 min-h-[44px] rounded-lg text-sm font-medium transition-all ${selectedDuration === d
                                        ? 'bg-day-accent dark:bg-night-accent text-white'
                                        : 'bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border'
                                        }`}
                                >
                                    {d}m
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick-add presets */}
                    <div>
                        <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-2">Add activities:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {PRESET_ACTIVITIES.map(preset => {
                                const isAdded = activities.some(a => a.name === preset.name);
                                return (
                                    <button
                                        key={preset.name}
                                        onClick={() => addActivity(preset)}
                                        disabled={isAdded && preset.name !== 'Other'}
                                        className={`p-3 min-h-[56px] rounded-xl flex items-center gap-2 transition-all ${isAdded && preset.name !== 'Other'
                                            ? 'bg-day-accent/20 dark:bg-night-accent/20 border-2 border-day-accent dark:border-night-accent text-day-accent dark:text-night-accent'
                                            : 'bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border hover:border-day-accent dark:hover:border-night-accent'
                                            }`}
                                    >
                                        <span className="text-day-accent dark:text-night-accent">{ActivityIcons[preset.name]}</span>
                                        <span className="text-sm font-medium">{preset.name}</span>
                                        {isAdded && preset.name !== 'Other' && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Custom activity input */}
                    {showCustom && (
                        <div className="p-3 bg-white/30 dark:bg-black/20 rounded-xl">
                            <input
                                type="text"
                                value={customActivityName}
                                onChange={(e) => setCustomActivityName(e.target.value)}
                                placeholder="Activity name..."
                                className="w-full p-2 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-lg text-sm mb-2"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowCustom(false)}
                                    className="flex-1 py-2 min-h-[44px] border border-day-border dark:border-night-border rounded-lg text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addCustomActivity}
                                    disabled={!customActivityName.trim()}
                                    className="flex-1 py-2 min-h-[44px] bg-day-accent dark:bg-night-accent text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Added activities list */}
                    {activities.length > 0 && (
                        <div>
                            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-2">Your activities:</p>
                            <div className="space-y-2">
                                {activities.map((activity, index) => (
                                    <div key={index} className="flex items-center gap-3 p-3 bg-white/30 dark:bg-black/20 rounded-xl">
                                        <span className="flex-1 text-sm font-medium">{activity.name}</span>
                                        <select
                                            value={activity.durationMinutes}
                                            onChange={(e) => updateDuration(index, parseInt(e.target.value))}
                                            className="p-1 bg-white/50 dark:bg-black/30 border border-day-border dark:border-night-border rounded text-sm min-h-[44px]"
                                        >
                                            {DURATION_OPTIONS.map(d => (
                                                <option key={d} value={d}>{d}m</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => removeActivity(index)}
                                            className="p-2 min-h-[44px] min-w-[44px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center justify-center"
                                            aria-label={`Remove ${activity.name}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Day rating */}
                    <div>
                        <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-2">How was yesterday?</p>
                        <div className="flex justify-between">
                            {[1, 2, 3, 4, 5].map(rating => (
                                <button
                                    key={rating}
                                    onClick={() => { haptics.light(); setDayRating(rating); }}
                                    className={`w-12 h-12 min-h-[48px] rounded-full flex items-center justify-center text-lg transition-all ${dayRating === rating
                                        ? 'bg-day-accent dark:bg-night-accent text-white scale-110 shadow-lg'
                                        : 'bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border hover:scale-105'
                                        }`}
                                    aria-label={`Rate day ${rating} out of 5`}
                                    aria-pressed={dayRating === rating}
                                >
                                    {rating}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Optional notes */}
                    <div>
                        <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-2">Notes (optional):</p>
                        <textarea
                            value={dayNotes}
                            onChange={(e) => setDayNotes(e.target.value)}
                            placeholder="Anything notable about your day or evening..."
                            className="w-full p-3 min-h-[60px] bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-lg text-sm resize-none"
                            rows={2}
                        />
                    </div>
                </div>

                {/* Footer actions */}
                <div className="p-5 border-t border-day-border dark:border-night-border flex gap-3">
                    <button
                        onClick={handleSkip}
                        className="flex-1 py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-xl text-day-text-secondary dark:text-night-text-secondary font-medium"
                    >
                        Skip
                    </button>
                    <button
                        onClick={handleComplete}
                        className="flex-1 py-3 min-h-[48px] bg-gradient-to-r from-day-accent to-purple-500 dark:from-night-accent dark:to-purple-600 text-white font-semibold rounded-xl shadow-lg"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
