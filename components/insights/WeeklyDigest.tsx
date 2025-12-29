import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface WeeklyStat {
    value: string | number;
    label: string;
    trend: number; // percentage change vs last week
    trendLabel: 'up' | 'down' | 'neutral';
}

export const WeeklyDigest: React.FC<{ dreams: Dream[] }> = ({ dreams }) => {
    const stats = useMemo(() => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Filter dreams by week
        const thisWeekDreams = dreams.filter(d => new Date(d.timestamp) >= oneWeekAgo);
        const lastWeekDreams = dreams.filter(d => {
            const date = new Date(d.timestamp);
            return date < oneWeekAgo && date >= twoWeeksAgo;
        });

        // 1. Dream Count
        const currentCount = thisWeekDreams.length;
        const previousCount = lastWeekDreams.length;
        const countTrend = previousCount === 0 ? 100 : Math.round(((currentCount - previousCount) / previousCount) * 100);

        // 2. Sleep Quality Avg
        const getAvgQuality = (ds: Dream[]) => {
            const withQuality = ds.filter(d => d.sleepQuality !== undefined);
            if (withQuality.length === 0) return 0;
            return Math.round(withQuality.reduce((acc, d) => acc + (d.sleepQuality || 0), 0) / withQuality.length);
        };
        const currentQuality = getAvgQuality(thisWeekDreams);
        const previousQuality = getAvgQuality(lastWeekDreams);
        const qualityTrend = previousQuality === 0 ? 0 : Math.round(((currentQuality - previousQuality) / previousQuality) * 100);

        // 3. Top Tag
        const getTopTag = (ds: Dream[]) => {
            const counts = new Map<string, number>();
            ds.forEach(d => d.tags?.forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
            const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
            return sorted.length > 0 ? sorted[0][0] : '-';
        };
        const currentTopTag = getTopTag(thisWeekDreams);

        return {
            count: {
                value: currentCount,
                label: 'Dreams Logged',
                trend: countTrend,
                trendLabel: countTrend > 0 ? 'up' : countTrend < 0 ? 'down' : 'neutral'
            },
            quality: {
                value: currentQuality || '-',
                label: 'Avg Sleep Quality',
                trend: qualityTrend,
                trendLabel: qualityTrend > 0 ? 'up' : qualityTrend < 0 ? 'down' : 'neutral'
            },
            topTag: currentTopTag
        };
    }, [dreams]);

    if (stats.count.value === 0) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-lg border border-indigo-500/20 rounded-xl p-5 mb-6">
            <h2 className="font-serif text-xl mb-4 flex items-center gap-2">
                <span className="text-2xl">📅</span> Weekly Digest
            </h2>
            <div className="grid grid-cols-3 gap-4">
                {/* Count */}
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{stats.count.value}</p>
                    <p className="text-xs opacity-70 mb-1">{stats.count.label}</p>
                    {stats.count.trend !== 0 && stats.count.trend !== 100 && (
                        <p className={`text-[10px] ${stats.count.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.count.trend > 0 ? '↑' : '↓'} {Math.abs(stats.count.trend)}% vs last wk
                        </p>
                    )}
                </div>

                {/* Quality */}
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{stats.quality.value}<span className="text-sm font-normal opacity-50">/5</span></p>
                    <p className="text-xs opacity-70 mb-1">{stats.quality.label}</p>
                    {stats.quality.trend !== 0 && (
                        <p className={`text-[10px] ${stats.quality.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.quality.trend > 0 ? '↑' : '↓'} {Math.abs(stats.quality.trend)}%
                        </p>
                    )}
                </div>

                {/* Top Tag */}
                <div className="bg-white/5 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                    <p className="text-lg font-bold truncate w-full px-1 capitalize">{stats.topTag}</p>
                    <p className="text-xs opacity-70">Top Theme</p>
                </div>
            </div>
        </div>
    );
};
