import React, { useState, useEffect } from 'react';
import {
    getGlobalDreamTrends,
    getGlobalSleepStats,
    getRegionalTrends,
    getCountryTopDreams,
    fetchGlobalTrends,
    isGlobalTrendsOptedIn,
    isLocationEnabled,
    setGlobalTrendsOptIn,
    getGlobalTrendsPrefs,
    type TrendPeriod,
    type GlobalTrend,
    type CountryTopDream
} from '../../services/dreamTrendsService';
import haptics from '../../services/hapticsService';

// Share global trends as text
const shareGlobalTrends = async (
    trends: GlobalTrend[],
    stats: { avgSleepTime: string; avgQuality: number; activeDreamers: number },
    period: string,
    isRegional: boolean,
    countryName?: string
) => {
    haptics.light();

    const scopeLabel = isRegional && countryName ? countryName : 'Global';
    const trendsList = trends
        .map((t, i) => `${i + 1}. ${t.topic} (${t.percentage}%)`)
        .join('\n');

    const shareText = `${scopeLabel} Dream Trends - ${period}

Top Themes:
${trendsList}

${scopeLabel} Stats:
Average Sleep: ${stats.avgSleepTime}
Average Quality: ${stats.avgQuality}/5.0
Active Dreamers: ${stats.activeDreamers.toLocaleString()}

Shared from Somnia - Dream Journal`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: `${scopeLabel} Dream Trends`,
                text: shareText,
            });
            haptics.success();
        } catch (err) {
            // User cancelled or share failed
            if ((err as Error).name !== 'AbortError') {
                // Fall back to clipboard
                await navigator.clipboard.writeText(shareText);
                haptics.success();
            }
        }
    } else {
        // Fall back to clipboard
        await navigator.clipboard.writeText(shareText);
        haptics.success();
    }
};

const periodLabels: Record<TrendPeriod, string> = {
    'today': 'Today',
    'week': 'This Week',
    'month': 'This Month',
    'all-time': 'All Time'
};

export const GlobalTrendsCard: React.FC = () => {
    const [period, setPeriod] = useState<TrendPeriod>('week');
    const [isOptedIn, setIsOptedIn] = useState(isGlobalTrendsOptedIn);
    const [hasLocation, setHasLocation] = useState(isLocationEnabled);
    const [isLoading, setIsLoading] = useState(false);
    const [includeLocation, setIncludeLocation] = useState(true); // Default to checked
    const [showRegional, setShowRegional] = useState(false);

    // Fetch fresh data when period changes and user is opted in
    useEffect(() => {
        if (isOptedIn) {
            setIsLoading(true);
            fetchGlobalTrends(period).finally(() => setIsLoading(false));
        }
    }, [period, isOptedIn]);

    const trends = getGlobalDreamTrends(period);
    const regionalTrends = getRegionalTrends(period);
    const countryTopDreams = getCountryTopDreams();
    const stats = getGlobalSleepStats(period);
    const prefs = getGlobalTrendsPrefs();

    const handleOptIn = async () => {
        setIsLoading(true);
        const newPrefs = await setGlobalTrendsOptIn(true, includeLocation);
        setIsOptedIn(true);
        setHasLocation(newPrefs.locationEnabled);
        await fetchGlobalTrends(period);
        setIsLoading(false);
    };

    const displayTrends = showRegional && regionalTrends ? regionalTrends : trends;
    const countryName = prefs.location?.country;

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

                {/* Location opt-in toggle */}
                <label className="flex items-start gap-3 p-3 bg-black/20 rounded-lg mb-4 cursor-pointer hover:bg-black/30 transition-colors">
                    <input
                        type="checkbox"
                        checked={includeLocation}
                        onChange={(e) => setIncludeLocation(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-indigo-400 bg-indigo-900/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                    />
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm font-medium text-indigo-100">Include my location</span>
                        </div>
                        <p className="text-xs text-indigo-200/60 mt-1">
                            See trends from dreamers in your country. Your exact location is never shared.
                        </p>
                    </div>
                </label>

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
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => shareGlobalTrends(
                            displayTrends,
                            stats,
                            periodLabels[period],
                            showRegional && hasLocation,
                            countryName
                        )}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 transition-colors"
                        aria-label="Share trends"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
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
            </div>

            {/* Time Period Filter */}
            <div className="flex gap-1 mb-4 bg-black/20 p-1 rounded-lg" role="group" aria-label="Time period filter">
                {(Object.keys(periodLabels) as TrendPeriod[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        aria-pressed={period === p}
                        aria-label={`Show ${periodLabels[p]} trends`}
                        className={`flex-1 px-2 py-2 min-h-[44px] text-xs font-medium rounded-md transition-all flex items-center justify-center ${
                            period === p
                                ? 'bg-indigo-500 text-white shadow-lg'
                                : 'text-indigo-200 hover:bg-indigo-500/30'
                        }`}
                    >
                        {periodLabels[p]}
                    </button>
                ))}
            </div>

            {/* Global/Regional Toggle (only if location enabled) */}
            {hasLocation && regionalTrends && (
                <div className="flex gap-1 mb-5 bg-black/20 p-1 rounded-lg" role="group" aria-label="Trend scope">
                    <button
                        onClick={() => setShowRegional(false)}
                        aria-pressed={!showRegional}
                        className={`flex-1 px-3 py-2 min-h-[44px] text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                            !showRegional
                                ? 'bg-purple-500 text-white shadow-lg'
                                : 'text-purple-200 hover:bg-purple-500/30'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Global
                    </button>
                    <button
                        onClick={() => setShowRegional(true)}
                        aria-pressed={showRegional}
                        className={`flex-1 px-3 py-2 min-h-[44px] text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                            showRegional
                                ? 'bg-purple-500 text-white shadow-lg'
                                : 'text-purple-200 hover:bg-purple-500/30'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {countryName || 'Country'}
                    </button>
                </div>
            )}

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                    {showRegional && hasLocation ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            Trending in {countryName || 'Your Country'}
                        </>
                    ) : (
                        'Trending Themes'
                    )}
                </h3>
                <div className="space-y-3">
                    {displayTrends.map((trend: GlobalTrend) => (
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

                {/* Sentiment Color Legend */}
                <div className="mt-4 pt-3 border-t border-indigo-500/20">
                    <p className="text-xs text-indigo-300/60 mb-2">Bar colors indicate typical sentiment:</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500"></div>
                            <span className="text-indigo-200/80">Positive</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                            <span className="text-indigo-200/80">Neutral</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 to-rose-500"></div>
                            <span className="text-indigo-200/80">Negative</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-indigo-500/30 grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-xs text-indigo-300">
                        {showRegional ? countryName || 'Country' : 'Global'} Avg Sleep
                    </p>
                    <p className="font-mono text-lg font-bold">{stats.avgSleepTime}</p>
                </div>
                <div>
                    <p className="text-xs text-indigo-300">
                        {showRegional ? countryName || 'Country' : 'Global'} Avg Quality
                    </p>
                    <p className="font-mono text-lg font-bold">{stats.avgQuality} / 5.0</p>
                </div>
            </div>

            {/* Top Dream by Country */}
            {countryTopDreams && countryTopDreams.length > 0 && (
                <div className="mt-5 pt-4 border-t border-indigo-500/30">
                    <h3 className="text-sm font-semibold text-indigo-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Top Dream by Country
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-indigo-500/30">
                        {countryTopDreams.slice(0, 8).map((item: CountryTopDream) => (
                            <div
                                key={item.countryCode}
                                className="flex-shrink-0 bg-black/20 rounded-lg p-3 min-w-[140px] border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
                            >
                                <p className="text-xs text-indigo-300/70 mb-1 truncate">{item.country}</p>
                                <p className="text-sm font-medium text-white truncate">{item.topDream}</p>
                                <p className="text-xs text-indigo-400/60 mt-1">{item.dreamers.toLocaleString()} dreamers</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Location indicator */}
            {hasLocation && countryName && (
                <div className="mt-3 text-center">
                    <span className="text-xs text-indigo-300/60 flex items-center justify-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        Connected from {countryName}
                    </span>
                </div>
            )}
        </div>
    );
};
