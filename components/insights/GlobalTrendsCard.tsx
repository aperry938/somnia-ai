import React, { useState, useEffect } from 'react';
import {
    getGlobalDreamTrends,
    getGlobalSleepStats,
    fetchGlobalTrends,
    isGlobalTrendsOptedIn,
    setGlobalTrendsOptIn,
    type TrendPeriod
} from '../../services/dreamTrendsService';

const periodLabels: Record<TrendPeriod, string> = {
    'today': 'Today',
    'week': 'This Week',
    'month': 'This Month',
    'all-time': 'All Time'
};

export const GlobalTrendsCard: React.FC = () => {
    const [period, setPeriod] = useState<TrendPeriod>('week');
    const [isOptedIn, setIsOptedIn] = useState(isGlobalTrendsOptedIn);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch fresh data when period changes and user is opted in
    useEffect(() => {
        if (isOptedIn) {
            setIsLoading(true);
            fetchGlobalTrends(period).finally(() => setIsLoading(false));
        }
    }, [period, isOptedIn]);

    const trends = getGlobalDreamTrends(period);
    const stats = getGlobalSleepStats(period);

    const handleOptIn = async () => {
        setIsLoading(true);
        await setGlobalTrendsOptIn(true);
        setIsOptedIn(true);
        await fetchGlobalTrends(period);
        setIsLoading(false);
    };

    // Show opt-in prompt if user hasn't opted in
    if (!isOptedIn) {
        return (
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-lg border border-indigo-500/30 p-6 rounded-xl text-white">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="font-serif text-xl font-bold">Global Dream Stream</h2>
                        <p className="text-sm text-indigo-200/70">See what the world is dreaming</p>
                    </div>
                </div>

                <div className="bg-black/20 rounded-lg p-4 mb-4">
                    <p className="text-sm text-indigo-100/90 mb-3">
                        Join the collective dreamscape to see trending themes, moods, and patterns from dreamers worldwide.
                    </p>
                    <ul className="text-xs text-indigo-200/70 space-y-2">
                        <li className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Your dream content stays private - only anonymized themes are shared</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>See how your dreams compare to global trends</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>You can opt out anytime from Settings</span>
                        </li>
                    </ul>
                </div>

                <button
                    onClick={handleOptIn}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Joining...</span>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Join Global Dream Stream</span>
                        </>
                    )}
                </button>
            </div>
        );
    }

    // Show trends for opted-in users
    return (
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-lg border border-indigo-500/30 p-6 rounded-xl text-white">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Global Dream Stream
                </h2>
                <div className="text-xs bg-indigo-500/20 px-2 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1">
                    {isLoading && (
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    )}
                    {stats.activeDreamers.toLocaleString()} Dreamers
                </div>
            </div>

            {/* Time Period Filter */}
            <div className="flex gap-1 mb-5 bg-black/20 p-1 rounded-lg" role="group" aria-label="Time period filter">
                {(Object.keys(periodLabels) as TrendPeriod[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        aria-pressed={period === p}
                        aria-label={`Show ${periodLabels[p]} trends`}
                        className={`flex-1 px-2 py-2 min-h-[40px] text-xs font-medium rounded-md transition-all flex items-center justify-center ${
                            period === p
                                ? 'bg-indigo-500 text-white shadow-lg'
                                : 'text-indigo-200 hover:bg-indigo-500/30'
                        }`}
                    >
                        {periodLabels[p]}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-indigo-200 uppercase tracking-wider">
                    Trending Themes
                </h3>
                <div className="space-y-3">
                    {trends.map((trend) => (
                        <div key={trend.topic} className="relative">
                            <div className="flex justify-between text-sm mb-1">
                                <span>{trend.topic}</span>
                                <span className={trend.change === 'up' ? 'text-green-400' : trend.change === 'down' ? 'text-red-400' : 'text-gray-400'}>
                                    {trend.percentage}% {trend.change === 'up' ? '↑' : trend.change === 'down' ? '↓' : '-'}
                                </span>
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-2" role="progressbar" aria-valuenow={trend.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${trend.topic}: ${trend.percentage}%`}>
                                <div
                                    className={`h-2 rounded-full transition-all duration-500 ${trend.sentiment === 'positive' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                                            trend.sentiment === 'negative' ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                                                'bg-gradient-to-r from-blue-400 to-indigo-500'
                                        }`}
                                    style={{ width: `${trend.percentage}%` }}
                                    aria-hidden="true"
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-indigo-500/30 grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-xs text-indigo-300">Global Avg Sleep</p>
                    <p className="font-mono text-lg font-bold">{stats.avgSleepTime}</p>
                </div>
                <div>
                    <p className="text-xs text-indigo-300">Global Avg Quality</p>
                    <p className="font-mono text-lg font-bold">{stats.avgQuality} / 5.0</p>
                </div>
            </div>
        </div>
    );
};
