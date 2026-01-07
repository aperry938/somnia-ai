import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { isPremium, isDevMode, setDevMode, isDevPremium, setDevPremium } from '../../services/secureSubscriptionService';
import { getSyncQueue, getPendingCount } from '../../services/syncService';
import { calculateUserStats } from '../../services/userStatsService';
import { getErrorLogs, clearErrorLogs, exportErrorDebugInfo } from '../../services/errorService';

// Analytics data types
interface AnalyticsData {
    totalDreams: number;
    totalSleepEntries: number;
    totalAlarms: number;
    averageSleepQuality: number;
    dreamingRate: number;
    activeStreak: number;
    bestStreak: number;
    syncQueueSize: number;
    pendingSyncs: number;
    storageUsed: string;
    sessionDuration: number;
}

const StatCard: React.FC<{ label: string; value: string | number; sublabel?: string; color?: string }> = ({
    label, value, sublabel, color = 'day-accent'
}) => (
    <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg border border-day-border dark:border-night-border">
        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold text-${color} dark:text-night-accent`}>{value}</p>
        {sublabel && <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">{sublabel}</p>}
    </div>
);

const ToggleRow: React.FC<{ label: string; value: boolean; onChange: (val: boolean) => void; description?: string }> = ({
    label, value, onChange, description
}) => (
    <div className="flex items-center justify-between py-3 border-b border-day-border/50 dark:border-night-border/50 last:border-0">
        <div>
            <p className="font-medium" id={`toggle-label-${label.replace(/\s+/g, '-').toLowerCase()}`}>{label}</p>
            {description && <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">{description}</p>}
        </div>
        <button
            onClick={() => onChange(!value)}
            aria-pressed={value}
            aria-labelledby={`toggle-label-${label.replace(/\s+/g, '-').toLowerCase()}`}
            className={`w-12 h-8 min-h-[32px] rounded-full transition-colors relative ${
                value ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'
            }`}
        >
            <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-transform ${
                value ? 'translate-x-6' : 'translate-x-1'
            }`} />
        </button>
    </div>
);

export const AdminPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const { dreams, sleepEntries, alarms } = useAppContext();
    const { user, isAuthenticated } = useAuth();
    const [devMode, setDevModeState] = useState(isDevMode());
    const [devPremium, setDevPremiumState] = useState(isDevPremium());
    const [sessionStart] = useState(() => Date.now());
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [errorLogs, setErrorLogs] = useState(() => getErrorLogs());
    const [showErrorLogs, setShowErrorLogs] = useState(false);

    // Update session duration every second
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const stats = useMemo(() => calculateUserStats(dreams), [dreams]);

    const analytics: AnalyticsData = useMemo(() => {
        // Calculate average sleep quality
        const qualityScores = dreams.filter(d => d.sleepQuality !== null).map(d => d.sleepQuality as number);
        const avgQuality = qualityScores.length > 0
            ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
            : 0;

        // Calculate dreaming rate (dreams per sleep entry)
        const dreamingRate = sleepEntries.length > 0
            ? (dreams.length / sleepEntries.length) * 100
            : 0;

        // Calculate storage usage
        let storageBytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('somnia_')) {
                storageBytes += (localStorage.getItem(key) || '').length * 2; // UTF-16
            }
        }
        const storageUsed = storageBytes < 1024
            ? `${storageBytes} B`
            : storageBytes < 1024 * 1024
                ? `${(storageBytes / 1024).toFixed(1)} KB`
                : `${(storageBytes / (1024 * 1024)).toFixed(2)} MB`;

        return {
            totalDreams: dreams.length,
            totalSleepEntries: sleepEntries.length,
            totalAlarms: alarms.length,
            averageSleepQuality: Math.round(avgQuality * 10) / 10,
            dreamingRate: Math.round(dreamingRate),
            activeStreak: stats.currentStreak,
            bestStreak: stats.bestStreak,
            syncQueueSize: getSyncQueue().length,
            pendingSyncs: getPendingCount(),
            storageUsed,
            sessionDuration: Math.floor((currentTime - sessionStart) / 1000),
        };
    }, [dreams, sleepEntries, alarms, stats, currentTime, sessionStart]);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleDevMode = () => {
        const newValue = !devMode;
        setDevMode(newValue);
        setDevModeState(newValue);
    };

    const toggleDevPremium = () => {
        const newValue = !devPremium;
        setDevPremium(newValue);
        setDevPremiumState(newValue);
    };

    const clearAllData = () => {
        if (confirm('This will clear ALL app data. Are you sure?')) {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('somnia_')) {
                    keys.push(key);
                }
            }
            keys.forEach(key => localStorage.removeItem(key));
            window.location.reload();
        }
    };

    const exportDebugLog = () => {
        const debugInfo = exportErrorDebugInfo();
        const debugData = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            online: navigator.onLine,
            analytics,
            user: isAuthenticated ? { id: user?.id, email: user?.email } : null,
            isPremium: isPremium(),
            isDevMode: devMode,
            errorLogs: JSON.parse(debugInfo),
            localStorage: Object.fromEntries(
                Array.from({ length: localStorage.length }, (_, i) => {
                    const key = localStorage.key(i);
                    if (key?.startsWith('somnia_') && !key.includes('token') && !key.includes('session')) {
                        return [key, localStorage.getItem(key)?.substring(0, 100) + '...'];
                    }
                    return null;
                }).filter(Boolean) as [string, string][]
            ),
        };

        const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `somnia-debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClearErrorLogs = () => {
        clearErrorLogs();
        setErrorLogs([]);
    };

    return (
        <div className="max-w-2xl mx-auto pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-serif text-3xl">Admin Dashboard</h1>
                    <p className="text-day-text-secondary dark:text-night-text-secondary text-sm">
                        App analytics and developer tools
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-mono ${
                        isPremium() ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                    }`}>
                        {isPremium() ? 'PREMIUM' : 'FREE'}
                    </span>
                    {devMode && (
                        <span className="px-2 py-1 rounded text-xs font-mono bg-amber-500/20 text-amber-600 dark:text-amber-400">
                            DEV
                        </span>
                    )}
                </div>
            </div>

            {/* Analytics Overview */}
            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl mb-4">
                <h2 className="font-serif text-xl mb-4">Analytics Overview</h2>
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <StatCard label="Dreams" value={analytics.totalDreams} />
                    <StatCard label="Sleep Entries" value={analytics.totalSleepEntries} />
                    <StatCard label="Alarms" value={analytics.totalAlarms} />
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <StatCard label="Avg Quality" value={analytics.averageSleepQuality} sublabel="out of 5" />
                    <StatCard label="Dream Rate" value={`${analytics.dreamingRate}%`} sublabel="per entry" />
                    <StatCard label="Streak" value={analytics.activeStreak} sublabel={`Best: ${analytics.bestStreak}`} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <StatCard label="Sync Queue" value={analytics.syncQueueSize} sublabel={`${analytics.pendingSyncs} pending`} />
                    <StatCard label="Storage" value={analytics.storageUsed} />
                    <StatCard label="Session" value={formatDuration(analytics.sessionDuration)} />
                </div>
            </div>

            {/* User Info */}
            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl mb-4">
                <h2 className="font-serif text-xl mb-4">User Info</h2>
                <div className="space-y-2 text-sm font-mono">
                    <p><span className="text-day-text-secondary dark:text-night-text-secondary">Auth:</span> {isAuthenticated ? 'Signed In' : 'Anonymous'}</p>
                    {user && <p><span className="text-day-text-secondary dark:text-night-text-secondary">Email:</span> {user.email}</p>}
                    {user && <p><span className="text-day-text-secondary dark:text-night-text-secondary">User ID:</span> {user.id.substring(0, 8)}...</p>}
                    <p><span className="text-day-text-secondary dark:text-night-text-secondary">Premium:</span> {isPremium() ? 'Yes' : 'No'}</p>
                    <p><span className="text-day-text-secondary dark:text-night-text-secondary">Level:</span> {stats.level}</p>
                </div>
            </div>

            {/* Developer Controls */}
            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl mb-4">
                <h2 className="font-serif text-xl mb-4">Developer Controls</h2>
                <ToggleRow
                    label="Developer Mode"
                    value={devMode}
                    onChange={toggleDevMode}
                    description="Enable developer tools and debugging"
                />
                <ToggleRow
                    label="Simulate Premium"
                    value={devPremium}
                    onChange={toggleDevPremium}
                    description="Test premium features without subscription"
                />
            </div>

            {/* Debug Actions */}
            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl mb-4">
                <h2 className="font-serif text-xl mb-4">Debug Actions</h2>
                <div className="space-y-3">
                    <button
                        onClick={exportDebugLog}
                        aria-label="Export debug log"
                        className="w-full py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-lg text-day-text-secondary dark:text-night-text-secondary font-medium flex items-center justify-center gap-2 hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Debug Log
                    </button>
                    <button
                        onClick={clearAllData}
                        aria-label="Clear all app data"
                        className="w-full py-3 min-h-[48px] border border-red-300 dark:border-red-800 rounded-lg text-red-500 dark:text-red-400 font-medium flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear All App Data
                    </button>
                </div>
            </div>

            {/* Error Logs */}
            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-xl">Error Logs</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                            {errorLogs.length} logged
                        </span>
                        <button
                            onClick={() => setShowErrorLogs(!showErrorLogs)}
                            aria-label={showErrorLogs ? 'Hide error logs' : 'Show error logs'}
                            className="text-xs px-3 py-2 min-h-[44px] border border-day-border dark:border-night-border rounded hover:bg-white/10 dark:hover:bg-black/10"
                        >
                            {showErrorLogs ? 'Hide' : 'Show'}
                        </button>
                        {errorLogs.length > 0 && (
                            <button
                                onClick={handleClearErrorLogs}
                                aria-label="Clear error logs"
                                className="text-xs px-3 py-2 min-h-[44px] border border-red-300 dark:border-red-800 text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
                {showErrorLogs && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {errorLogs.length === 0 ? (
                            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary text-center py-4">
                                No errors logged
                            </p>
                        ) : (
                            errorLogs.slice().reverse().map((log) => (
                                <div
                                    key={log.id}
                                    className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono text-red-600 dark:text-red-400 uppercase">
                                            {log.category}
                                        </span>
                                        <span className="text-day-text-secondary dark:text-night-text-secondary">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-red-700 dark:text-red-300 break-words">
                                        {log.message}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Environment Info */}
            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
                <h2 className="font-serif text-xl mb-4">Environment</h2>
                <div className="space-y-1 text-xs font-mono text-day-text-secondary dark:text-night-text-secondary">
                    <p>Platform: {navigator.platform}</p>
                    <p>Language: {navigator.language}</p>
                    <p>Online: {navigator.onLine ? 'Yes' : 'No'}</p>
                    <p>Screen: {window.innerWidth}x{window.innerHeight}</p>
                    <p>Pixel Ratio: {window.devicePixelRatio}</p>
                </div>
            </div>
        </div>
    );
};
