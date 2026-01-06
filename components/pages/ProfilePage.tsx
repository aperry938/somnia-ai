import React, { useState, useRef, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { exportDreamJournalToPDF, exportDreamsAsJSON, importDreamsFromJSON } from '../../services/exportService';
import { Biometrics } from '../../types';
import { useToast } from '../shared/Toast';
import { calculateUserStats } from '../../services/userStatsService';
import { useClock } from '../../hooks/useClock';

// Biometrics editing card
const BiometricsCard: React.FC = () => {
    const { biometrics, setBiometrics } = useAppContext();
    const [localBiometrics, setLocalBiometrics] = useState<Biometrics>(biometrics);
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        setBiometrics(localBiometrics);
        setIsEditing(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalBiometrics(prev => ({
            ...prev,
            [name]: name === 'age' || name === 'avgSleep' ? (value === '' ? null : parseInt(value)) : value
        }));
    };

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-xl">Biometrics</h2>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="text-sm text-day-accent dark:text-night-accent">
                        Edit
                    </button>
                )}
            </div>
            <p className="text-day-text-secondary dark:text-night-text-secondary text-sm mb-4">
                Help Somnia personalize your dream analysis and sleep insights.
            </p>
            {isEditing ? (
                <div className="space-y-3">
                    <div>
                        <label className="text-sm text-day-text-secondary dark:text-night-text-secondary">Age</label>
                        <input
                            type="number"
                            name="age"
                            value={localBiometrics.age || ''}
                            onChange={handleChange}
                            placeholder="Enter your age"
                            className="w-full p-2 mt-1 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-day-text-secondary dark:text-night-text-secondary">Gender</label>
                        <input
                            type="text"
                            name="gender"
                            value={localBiometrics.gender}
                            onChange={handleChange}
                            placeholder="e.g., Female, Male, Non-binary"
                            className="w-full p-2 mt-1 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-day-text-secondary dark:text-night-text-secondary">Avg. Sleep (hours)</label>
                        <input
                            type="number"
                            name="avgSleep"
                            value={localBiometrics.avgSleep || ''}
                            onChange={handleChange}
                            placeholder="e.g., 7"
                            className="w-full p-2 mt-1 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md"
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => { setLocalBiometrics(biometrics); setIsEditing(false); }}
                            className="flex-1 py-2 border border-day-border dark:border-night-border rounded-lg text-day-text-secondary dark:text-night-text-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-2 bg-day-accent dark:bg-night-accent text-white font-bold rounded-lg"
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-white/30 dark:bg-black/20 rounded-lg">
                        <p className="text-2xl font-bold">{biometrics.age || '--'}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Age</p>
                    </div>
                    <div className="p-3 bg-white/30 dark:bg-black/20 rounded-lg">
                        <p className="text-2xl font-bold">{biometrics.gender || '--'}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Gender</p>
                    </div>
                    <div className="p-3 bg-white/30 dark:bg-black/20 rounded-lg">
                        <p className="text-2xl font-bold">{biometrics.avgSleep ? `${biometrics.avgSleep}h` : '--'}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Avg. Sleep</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// Theme preference card
const ThemePreferenceCard: React.FC = () => {
    const { themeOverride, setThemeOverride } = useAppContext();
    const { theme } = useClock();

    const options = [
        { value: 'auto', label: 'Auto', description: 'Changes with sunrise/sunset' },
        { value: 'day', label: 'Light', description: 'Always use light theme' },
        { value: 'night', label: 'Dark', description: 'Always use dark theme' },
    ] as const;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
            <h2 className="font-serif text-xl mb-2">Theme</h2>
            <p className="text-day-text-secondary dark:text-night-text-secondary text-sm mb-4">
                Choose how Somnia looks. Currently: {theme === 'night' ? 'Dark' : 'Light'}
            </p>
            <div className="grid grid-cols-3 gap-2">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setThemeOverride(opt.value)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                            themeOverride === opt.value
                                ? 'border-day-accent dark:border-night-accent bg-day-accent/10 dark:bg-night-accent/10'
                                : 'border-day-border dark:border-night-border hover:border-day-accent/50 dark:hover:border-night-accent/50'
                        }`}
                    >
                        <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                            opt.value === 'day' ? 'bg-amber-100 text-amber-600' :
                            opt.value === 'night' ? 'bg-indigo-900 text-indigo-300' :
                            'bg-gradient-to-r from-amber-100 to-indigo-900'
                        }`}>
                            {opt.value === 'day' && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            )}
                            {opt.value === 'night' && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                            {opt.value === 'auto' && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            )}
                        </div>
                        <p className="text-sm font-medium">{opt.label}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

// Export/Import card
const DataManagementCard: React.FC = () => {
    const { dreams, importDreams } = useAppContext();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const imported = await importDreamsFromJSON(file, dreams);
            importDreams(imported);
            showToast(`Imported ${imported.length} dreams!`);
        } catch (error) {
            showToast('Failed to import dreams', 'error');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
            <h2 className="font-serif text-xl mb-2">Export Journal</h2>
            <p className="text-day-text-secondary dark:text-night-text-secondary text-sm mb-4">
                Save your dream journal for safekeeping or printing.
            </p>
            <div className="flex gap-3">
                <button
                    onClick={() => exportDreamJournalToPDF(dreams)}
                    disabled={dreams.length === 0}
                    className="flex-1 py-2.5 bg-day-accent dark:bg-night-accent text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print / PDF
                </button>
                <button
                    onClick={() => exportDreamsAsJSON(dreams)}
                    disabled={dreams.length === 0}
                    className="flex-1 py-2.5 border-2 border-day-accent dark:border-night-accent text-day-accent dark:text-night-accent font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    JSON Backup
                </button>
            </div>

            {/* Import Section */}
            <div className="mt-4 pt-4 border-t border-day-border dark:border-night-border">
                <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleImport}
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 border-2 border-dashed border-day-border dark:border-night-border text-day-text-secondary dark:text-night-text-secondary font-medium rounded-lg hover:border-day-accent dark:hover:border-night-accent transition-colors flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import from JSON Backup
                </button>
            </div>
        </div>
    );
};

export const ProfilePage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const { dreams } = useAppContext();
    const stats = useMemo(() => calculateUserStats(dreams), [dreams]);

    // Level titles based on progress
    const getLevelTitle = (level: number): string => {
        const titles = [
            'Dreamer',           // 1
            'Novice',            // 2
            'Apprentice',        // 3
            'Journeyer',         // 4
            'Explorer',          // 5
            'Seeker',            // 6
            'Mystic',            // 7
            'Sage',              // 8
            'Oneironaut',        // 9
            'Dream Master',      // 10+
        ];
        return titles[Math.min(level - 1, titles.length - 1)];
    };

    return (
        <div className="max-w-2xl mx-auto pb-8">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-day-accent to-purple-500 dark:from-night-accent dark:to-purple-600 flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <h1 className="font-serif text-3xl mb-1">Profile</h1>
                <p className="text-day-text-secondary dark:text-night-text-secondary">
                    Level {stats.level} {getLevelTitle(stats.level)}
                </p>
            </div>

            {/* Stats Overview */}
            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl mb-6">
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div>
                        <p className="text-3xl font-bold text-day-accent dark:text-night-accent">{stats.level}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Level</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold">{stats.currentStreak}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Day Streak</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold">{stats.totalDreams}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams</p>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-xs text-day-text-secondary dark:text-night-text-secondary mb-1">
                        <span>Progress to Level {stats.level + 1}</span>
                        <span>{Math.round(stats.nextLevelProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-day-accent to-purple-500 dark:from-night-accent dark:to-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${stats.nextLevelProgress}%` }}
                        />
                    </div>
                    <p className="text-center text-xs text-day-text-secondary dark:text-night-text-secondary mt-2">
                        {Math.ceil((100 - stats.nextLevelProgress) / 20)} dreams to next level
                    </p>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-amber-500">{stats.bestStreak}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Best Streak</p>
                </div>
                <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-emerald-500">
                        {dreams.filter(d => d.sleepQuality && d.sleepQuality >= 4).length}
                    </p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Great Sleep Nights</p>
                </div>
            </div>

            <div className="space-y-6">
                <BiometricsCard />
                <ThemePreferenceCard />
                <DataManagementCard />
            </div>
        </div>
    );
};
