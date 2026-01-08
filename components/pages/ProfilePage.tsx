import React, { useState, useRef, useMemo } from 'react';
import { useAppContext, ArtStyle } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { exportDreamJournalToPDF, exportDreamsAsJSON, importDreamsFromJSON } from '../../services/exportService';
import { Biometrics, Page } from '../../types';
import { useToast } from '../shared/Toast';
import { calculateUserStats } from '../../services/userStatsService';
import { useClock } from '../../hooks/useClock';
import { isPremium, getRemainingCredits, getCredits, createCustomerPortalSession, isDevMode } from '../../services/secureSubscriptionService';
import { SecurePaywallModal } from '../modals/SecurePaywallModal';
import { LevelGuideModal } from '../modals/LevelGuideModal';
import { getLevelTitle } from '../../constants/gamification';

const FREE_TIER_MAX_CREDITS = 3; // Same as in secureSubscriptionService
const APP_VERSION = '1.0.0';
const ADMIN_TAP_COUNT = 7; // Taps required to unlock admin access

// Profile Info Card - expanded biometrics
const ProfileInfoCard: React.FC = () => {
    const { biometrics, setBiometrics } = useAppContext();
    const [localBiometrics, setLocalBiometrics] = useState<Biometrics>(biometrics);
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        setBiometrics(localBiometrics);
        setIsEditing(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalBiometrics(prev => ({
            ...prev,
            [name]: name === 'age' || name === 'avgSleep' || name === 'sleepGoal'
                ? (value === '' ? null : parseFloat(value))
                : value
        }));
    };

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-xl">Profile Info</h2>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} aria-label="Edit profile information" className="text-sm min-h-[44px] px-3 py-2 text-day-accent dark:text-night-accent flex items-center">
                        Edit
                    </button>
                )}
            </div>
            <p className="text-day-text-secondary dark:text-night-text-secondary text-sm mb-4">
                Help Somnia personalize your dream analysis and sleep insights.
            </p>
            {isEditing ? (
                <div className="space-y-3">
                    {/* Display Name */}
                    <div>
                        <label className="text-sm text-day-text-secondary dark:text-night-text-secondary">Display Name</label>
                        <input
                            type="text"
                            name="displayName"
                            value={localBiometrics.displayName || ''}
                            onChange={handleChange}
                            placeholder="Your name"
                            className="w-full p-3 min-h-[48px] mt-1 text-base bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm text-day-text-secondary dark:text-night-text-secondary">Age</label>
                            <input
                                type="number"
                                name="age"
                                value={localBiometrics.age || ''}
                                onChange={handleChange}
                                placeholder="Enter age"
                                className="w-full p-3 min-h-[48px] mt-1 text-base bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-day-text-secondary dark:text-night-text-secondary">Gender</label>
                            <select
                                name="gender"
                                value={localBiometrics.gender}
                                onChange={handleChange}
                                className="w-full p-3 min-h-[48px] mt-1 text-base bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md"
                            >
                                <option value="">Select...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Non-binary">Non-binary</option>
                                <option value="Other">Other</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-day-text-secondary dark:text-night-text-secondary">Occupation</label>
                        <input
                            type="text"
                            name="occupation"
                            value={localBiometrics.occupation || ''}
                            onChange={handleChange}
                            placeholder="e.g., Software Engineer, Student, Artist"
                            className="w-full p-3 min-h-[48px] mt-1 text-base bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm text-day-text-secondary dark:text-night-text-secondary">Sleep Goal (hours)</label>
                            <input
                                type="number"
                                name="sleepGoal"
                                value={localBiometrics.sleepGoal || ''}
                                onChange={handleChange}
                                placeholder="e.g., 8"
                                min="4"
                                max="12"
                                step="0.5"
                                className="w-full p-3 min-h-[48px] mt-1 text-base bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-day-text-secondary dark:text-night-text-secondary">Wake Goal</label>
                            <input
                                type="time"
                                name="wakeGoal"
                                value={localBiometrics.wakeGoal || ''}
                                onChange={handleChange}
                                className="w-full p-3 min-h-[48px] mt-1 text-base bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-day-text-secondary dark:text-night-text-secondary">Avg. Sleep (current)</label>
                        <input
                            type="number"
                            name="avgSleep"
                            value={localBiometrics.avgSleep || ''}
                            onChange={handleChange}
                            placeholder="e.g., 7"
                            step="0.5"
                            className="w-full p-3 min-h-[48px] mt-1 text-base bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md"
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => { setLocalBiometrics(biometrics); setIsEditing(false); }}
                            className="flex-1 py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-lg text-day-text-secondary dark:text-night-text-secondary flex items-center justify-center"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-bold rounded-lg flex items-center justify-center"
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 bg-white/30 dark:bg-black/20 rounded-lg">
                            <p className="text-xl font-bold">{biometrics.age || '--'}</p>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Age</p>
                        </div>
                        <div className="p-3 bg-white/30 dark:bg-black/20 rounded-lg">
                            <p className="text-xl font-bold truncate">{biometrics.gender || '--'}</p>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Gender</p>
                        </div>
                        <div className="p-3 bg-white/30 dark:bg-black/20 rounded-lg">
                            <p className="text-xl font-bold">{biometrics.avgSleep ? `${biometrics.avgSleep}h` : '--'}</p>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Avg Sleep</p>
                        </div>
                    </div>
                    {(biometrics.occupation || biometrics.sleepGoal || biometrics.wakeGoal) && (
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 bg-white/30 dark:bg-black/20 rounded-lg">
                                <p className="text-sm font-bold truncate">{biometrics.occupation || '--'}</p>
                                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Occupation</p>
                            </div>
                            <div className="p-3 bg-white/30 dark:bg-black/20 rounded-lg">
                                <p className="text-xl font-bold">{biometrics.sleepGoal ? `${biometrics.sleepGoal}h` : '--'}</p>
                                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Sleep Goal</p>
                            </div>
                            <div className="p-3 bg-white/30 dark:bg-black/20 rounded-lg">
                                <p className="text-xl font-bold">{biometrics.wakeGoal || '--'}</p>
                                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Wake Goal</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Membership Card
const MembershipCard: React.FC<{ onNavigateToTerms?: () => void }> = ({ onNavigateToTerms }) => {
    const { user, session, isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const premium = isPremium();
    const credits = getRemainingCredits();
    const maxCredits = FREE_TIER_MAX_CREDITS;
    const [showPaywall, setShowPaywall] = useState(false);
    const [isManaging, setIsManaging] = useState(false);

    const handleManageSubscription = async () => {
        if (!session?.access_token) {
            showToast('Please sign in to manage your subscription', 'error');
            return;
        }

        setIsManaging(true);
        const result = await createCustomerPortalSession(session.access_token);
        setIsManaging(false);

        if (result.error) {
            showToast(result.error, 'error');
            return;
        }

        if (result.url) {
            window.location.href = result.url;
        }
    };

    const handleUpgrade = () => {
        if (!isAuthenticated) {
            showToast('Please sign in to upgrade', 'error');
            return;
        }
        setShowPaywall(true);
    };

    return (
        <>
            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
                <h2 className="font-serif text-xl mb-2">Membership</h2>

                {premium ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold text-amber-700 dark:text-amber-300">Premium Member</p>
                                <p className="text-sm text-amber-600 dark:text-amber-400">Full access to all features</p>
                            </div>
                        </div>
                        <button
                            onClick={handleManageSubscription}
                            disabled={isManaging}
                            className="w-full py-2 border border-day-border dark:border-night-border rounded-lg text-day-text-secondary dark:text-night-text-secondary text-sm hover:bg-white/10 dark:hover:bg-black/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isManaging ? (
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                            ) : null}
                            Manage Subscription
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-white/30 dark:bg-black/20 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold">Free Plan</p>
                                <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">Limited AI features</p>
                            </div>
                        </div>
                        <button
                            onClick={handleUpgrade}
                            className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                            </svg>
                            Upgrade to Premium
                        </button>
                    </div>
                )}
            </div>

            {/* Paywall Modal */}
            {user && (
                <SecurePaywallModal
                    isOpen={showPaywall}
                    onClose={() => setShowPaywall(false)}
                    userId={user.id}
                    onNavigateToTerms={onNavigateToTerms}
                />
            )}
        </>
    );
};

// Theme preference card
const ThemePreferenceCard: React.FC = () => {
    const { themeOverride, setThemeOverride } = useAppContext();
    const { theme } = useClock();

    const themeIcons: Record<string, React.ReactNode> = {
        auto: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
        day: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
        night: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
    };

    const options = [
        { value: 'auto', label: 'Auto' },
        { value: 'day', label: 'Light' },
        { value: 'night', label: 'Dark' },
    ] as const;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
            <h2 className="font-serif text-xl mb-2">Theme</h2>
            <p className="text-day-text-secondary dark:text-night-text-secondary text-sm mb-4">
                Currently: {theme === 'night' ? 'Dark' : 'Light'} mode
            </p>
            <div className="grid grid-cols-3 gap-2">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setThemeOverride(opt.value)}
                        aria-pressed={themeOverride === opt.value}
                        aria-label={`${opt.label} theme`}
                        className={`p-3 min-h-[64px] rounded-lg border-2 transition-all flex flex-col items-center justify-center ${themeOverride === opt.value
                            ? 'border-day-accent dark:border-night-accent bg-day-accent/10 dark:bg-night-accent/10 text-day-accent dark:text-night-accent'
                            : 'border-day-border dark:border-night-border hover:border-day-accent/50 dark:hover:border-night-accent/50 text-day-text-secondary dark:text-night-text-secondary'
                            }`}
                    >
                        <div className="mb-1" aria-hidden="true">{themeIcons[opt.value]}</div>
                        <p className="text-sm font-medium">{opt.label}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};


// Notifications Card
const NotificationsCard: React.FC = () => {
    const [settings, setSettings] = useState(() => {
        const defaultSettings = {
            dreamReminder: true,
            sleepReminder: true,
            weeklyDigest: true,
            achievements: true,
            realityChecks: false
        };
        try {
            const saved = localStorage.getItem('somnia_notification_settings');
            return saved ? JSON.parse(saved) : defaultSettings;
        } catch {
            return defaultSettings;
        }
    });

    const updateSetting = (key: string, value: boolean) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem('somnia_notification_settings', JSON.stringify(newSettings));
    };

    const toggleItems = [
        { key: 'dreamReminder', label: 'Dream Reminder', desc: 'Morning nudge to log dreams' },
        { key: 'sleepReminder', label: 'Sleep Reminder', desc: 'Bedtime notification' },
        { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of your week' },
        { key: 'achievements', label: 'Achievements', desc: 'Level ups and milestones' },
        { key: 'realityChecks', label: 'Reality Checks', desc: 'Lucid dream prompts' },
    ];

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
            <h2 className="font-serif text-xl mb-4">Notifications</h2>
            <div className="space-y-3">
                {toggleItems.map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm">{item.label}</p>
                            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">{item.desc}</p>
                        </div>
                        <button
                            onClick={() => updateSetting(item.key, !settings[item.key])}
                            role="switch"
                            aria-checked={settings[item.key]}
                            aria-label={`Toggle ${item.label}`}
                            className={`w-14 h-8 min-h-[44px] rounded-full transition-colors relative flex items-center ${settings[item.key]
                                ? 'bg-day-accent dark:bg-night-accent'
                                : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <div className={`absolute w-6 h-6 rounded-full bg-white transition-transform shadow ${settings[item.key] ? 'translate-x-7' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Sync Wearable Card - Coming Soon
const SyncWearableCard: React.FC = () => {
    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
            <div className="flex items-center justify-between mb-2">
                <h2 className="font-serif text-xl">Sync Wearable</h2>
                <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
            <p className="text-day-text-secondary dark:text-night-text-secondary text-sm mb-4">
                Connect your smartwatch or fitness tracker to automatically import sleep data, heart rate variability, and movement patterns for more accurate sleep analysis.
            </p>
            <button
                disabled
                className="w-full py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-lg text-day-text-secondary dark:text-night-text-secondary font-medium flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Connect Device
            </button>
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
            <h2 className="font-serif text-xl mb-2">Data Management</h2>
            <p className="text-day-text-secondary dark:text-night-text-secondary text-sm mb-4">
                Export or backup your dream journal.
            </p>
            <div className="flex gap-3">
                <button
                    onClick={() => exportDreamJournalToPDF(dreams)}
                    disabled={dreams.length === 0}
                    className="flex-1 py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    PDF
                </button>
                <button
                    onClick={() => exportDreamsAsJSON(dreams)}
                    disabled={dreams.length === 0}
                    className="flex-1 py-3 min-h-[48px] border-2 border-day-accent dark:border-night-accent text-day-accent dark:text-night-accent font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    JSON
                </button>
            </div>
            <div className="mt-3">
                <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleImport}
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 min-h-[48px] border border-dashed border-day-border dark:border-night-border text-day-text-secondary dark:text-night-text-secondary text-sm rounded-lg hover:border-day-accent dark:hover:border-night-accent transition-colors flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import Backup
                </button>
            </div>
        </div>
    );
};

// Account Management Card
const AccountManagementCard: React.FC = () => {
    const { showToast } = useToast();
    const { user, isAuthenticated, signOut } = useAuth();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');
    const [isSigningOut, setIsSigningOut] = useState(false);

    const handleSignOut = async () => {
        setIsSigningOut(true);
        try {
            await signOut();
            // Clear ALL user-specific data on logout
            localStorage.removeItem('somnia_skipped_auth');
            localStorage.removeItem('somnia_biometrics');
            localStorage.removeItem('somnia_ai_credits');
            localStorage.removeItem('somnia_credits_reset_date');
            localStorage.removeItem('somnia_daily_limits');
            localStorage.removeItem('somnia_auth_user');
            localStorage.removeItem('somnia_subscription_token');
            localStorage.removeItem('somnia_subscription_status');
            localStorage.removeItem('somnia_user_email');
            showToast('Signed out successfully');
            // Reload to reset app state
            window.location.reload();
        } catch (error) {
            showToast('Failed to sign out', 'error');
        } finally {
            setIsSigningOut(false);
        }
    };

    const handleDeleteAccount = () => {
        if (deleteInput !== 'DELETE') return;

        // Clear all data
        localStorage.removeItem('somnia_dreams');
        localStorage.removeItem('somnia_alarms');
        localStorage.removeItem('somnia_biometrics');
        localStorage.removeItem('somnia_onboarding_complete');
        localStorage.removeItem('somnia_notification_settings');
        localStorage.removeItem('somnia_session');

        showToast('Account data deleted', 'success');
        setShowDeleteConfirm(false);

        // Reload to reset app state
        window.location.reload();
    };

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
            <h2 className="font-serif text-xl mb-4">Account</h2>

            {/* User info if authenticated */}
            {isAuthenticated && user && (
                <div className="mb-4 p-3 bg-white/30 dark:bg-black/20 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-day-accent/20 dark:bg-night-accent/20 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-medium truncate">{user.email}</p>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Signed in</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Local only notice */}
            {!isAuthenticated && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                        Your data is stored locally on this device only.
                    </p>
                </div>
            )}

            <div className="space-y-3">
                <button
                    onClick={() => {
                        if (isAuthenticated) {
                            handleSignOut();
                        } else {
                            // Clear skip flag and reload to show auth page
                            localStorage.removeItem('somnia_skipped_auth');
                            window.location.reload();
                        }
                    }}
                    disabled={isSigningOut}
                    className="w-full py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-lg text-day-text-secondary dark:text-night-text-secondary font-medium flex items-center justify-center gap-2 hover:bg-white/10 dark:hover:bg-black/10 transition-colors disabled:opacity-50"
                >
                    {isSigningOut ? (
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    )}
                    {isAuthenticated ? 'Sign Out' : 'Sign In / Create Account'}
                </button>

                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-3 min-h-[48px] border border-red-300 dark:border-red-800 rounded-lg text-red-500 dark:text-red-400 font-medium flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Account
                    </button>
                ) : (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-red-600 dark:text-red-400 text-sm font-medium mb-2">
                            This will permanently delete all your dreams and data.
                        </p>
                        <p className="text-red-500 dark:text-red-400 text-xs mb-3">
                            Type DELETE to confirm:
                        </p>
                        <input
                            type="text"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            placeholder="DELETE"
                            className="w-full p-2 mb-3 bg-white dark:bg-black/30 border border-red-300 dark:border-red-700 rounded-md text-sm"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                                className="flex-1 py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-lg text-sm flex items-center justify-center"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteInput !== 'DELETE'}
                                className="flex-1 py-3 min-h-[48px] bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                Delete Forever
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Legal Card - Privacy and Terms links
const LegalCard: React.FC<{ onNavigateTo?: (page: 'privacy' | 'terms') => void }> = ({ onNavigateTo }) => {
    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
            <h2 className="font-serif text-xl mb-4">Legal</h2>
            <div className="flex gap-3">
                <button
                    onClick={() => onNavigateTo?.('privacy')}
                    className="flex-1 py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-lg text-day-text-secondary dark:text-night-text-secondary font-medium flex items-center justify-center gap-2 hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Privacy Policy
                </button>
                <button
                    onClick={() => onNavigateTo?.('terms')}
                    className="flex-1 py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-lg text-day-text-secondary dark:text-night-text-secondary font-medium flex items-center justify-center gap-2 hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Terms of Service
                </button>
            </div>
        </div>
    );
};

export const ProfilePage: React.FC<{ onBack?: () => void; onNavigateTo?: (page: Page) => void }> = ({ onBack, onNavigateTo }) => {
    const { dreams, biometrics } = useAppContext();
    const { showToast } = useToast();
    const stats = useMemo(() => calculateUserStats(dreams), [dreams]);
    const [versionTapCount, setVersionTapCount] = useState(0);
    const [showLevelModal, setShowLevelModal] = useState(false);
    const [adminUnlocked, setAdminUnlocked] = useState(() => {
        return localStorage.getItem('somnia_admin_unlocked') === 'true' || isDevMode();
    });
    const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup tap timeout on unmount to prevent memory leaks
    React.useEffect(() => {
        return () => {
            if (tapTimeoutRef.current) {
                clearTimeout(tapTimeoutRef.current);
            }
        };
    }, []);

    const handleVersionTap = () => {
        // Clear previous timeout
        if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
        }

        const newCount = versionTapCount + 1;
        setVersionTapCount(newCount);

        if (newCount >= ADMIN_TAP_COUNT) {
            localStorage.setItem('somnia_admin_unlocked', 'true');
            setAdminUnlocked(true);
            setVersionTapCount(0);
            showToast('Admin access unlocked!', 'success');
        } else if (newCount >= 4) {
            showToast(`${ADMIN_TAP_COUNT - newCount} taps to unlock admin`, 'info');
        }

        // Reset tap count after 2 seconds of inactivity
        tapTimeoutRef.current = setTimeout(() => {
            setVersionTapCount(0);
        }, 2000);
    };

    return (
        <div className="max-w-2xl mx-auto pb-8">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-day-accent to-purple-500 dark:from-night-accent dark:to-purple-600 flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <h1 className="font-serif text-3xl mb-1">
                    {biometrics.displayName || 'Profile'}
                </h1>
                <button
                    onClick={() => setShowLevelModal(true)}
                    className="text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent transition-colors"
                >
                    Level {stats.level} {getLevelTitle(stats.level)}
                </button>
            </div>

            {/* Stats Card */}
            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-xl mb-6">
                <div className="grid grid-cols-4 gap-3 text-center mb-3">
                    <div>
                        <p className="text-2xl font-bold text-day-accent dark:text-night-accent">{stats.level}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Level</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.currentStreak}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Streak</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-amber-500">{stats.bestStreak}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Best</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.totalDreams}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams</p>
                    </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                        className="bg-gradient-to-r from-day-accent to-purple-500 dark:from-night-accent dark:to-purple-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${stats.nextLevelProgress}%` }}
                    />
                </div>
                <p className="text-center text-xs text-day-text-secondary dark:text-night-text-secondary mt-1">
                    {Math.ceil((100 - stats.nextLevelProgress) / 20)} dreams to Level {stats.level + 1}
                </p>
            </div>

            <div className="space-y-4">
                <ProfileInfoCard />
                <MembershipCard onNavigateToTerms={onNavigateTo ? () => onNavigateTo('terms') : undefined} />
                <ThemePreferenceCard />
                <NotificationsCard />
                <SyncWearableCard />
                <DataManagementCard />
                <AccountManagementCard />
                <LegalCard onNavigateTo={onNavigateTo} />

                {/* Admin Access Card - visible once unlocked */}
                {adminUnlocked && (
                    <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-amber-500/50 dark:border-amber-400/50 p-5 rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <h2 className="font-serif text-xl text-amber-600 dark:text-amber-400">Admin Tools</h2>
                        </div>
                        <button
                            onClick={() => onNavigateTo?.('admin')}
                            className="w-full py-3 min-h-[48px] bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Open Admin Dashboard
                        </button>
                    </div>
                )}

                {/* Version Badge - tap to unlock admin */}
                <div className="text-center pt-4">
                    <button
                        onClick={handleVersionTap}
                        className="text-xs min-h-[44px] px-4 py-2 text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent transition-colors"
                    >
                        Somnia v{APP_VERSION}
                    </button>
                </div>
            </div>

            <LevelGuideModal
                isOpen={showLevelModal}
                onClose={() => setShowLevelModal(false)}
                currentLevel={stats.level}
                totalDreams={stats.totalDreams}
            />
        </div>
    );
};
