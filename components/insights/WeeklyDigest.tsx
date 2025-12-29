import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface WeeklyDigestProps {
    dreams: Dream[];
}

export const WeeklyDigest: React.FC<WeeklyDigestProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const recentDreams = dreams.filter(d => new Date(d.timestamp) >= sevenDaysAgo);
        const count = recentDreams.length;

        // Calculate Average Sleep Quality
        const qualityDreams = recentDreams.filter(d => d.sleepQuality !== null);
        const avgQuality = qualityDreams.length > 0
            ? qualityDreams.reduce((acc, d) => acc + (d.sleepQuality || 0), 0) / qualityDreams.length
            : 0;

        // Calculate Top Tags
        const tagCounts: Record<string, number> = {};
        recentDreams.forEach(d => {
            d.tags?.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
        const topTags = Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([tag]) => tag);

        return { count, avgQuality, topTags };
    }, [dreams]);

    if (stats.count === 0) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/40 dark:to-purple-900/40 border border-day-border dark:border-night-border rounded-xl p-6 mb-8">
            <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
                <span className="text-2xl">📅</span> Weekly Digest
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg text-center">
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary uppercase tracking-wider mb-1">Dreams Logged</p>
                    <p className="text-4xl font-light font-serif">{stats.count}</p>
                </div>
                <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg text-center">
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary uppercase tracking-wider mb-1">Avg Sleep Quality</p>
                    <div className="flex items-center justify-center gap-2">
                        <p className="text-4xl font-light font-serif">{stats.avgQuality.toFixed(1)}</p>
                        <span className="text-yellow-500 text-xl">★</span>
                    </div>
                </div>
                <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg text-center">
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary uppercase tracking-wider mb-2">Dominant Themes</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {stats.topTags.length > 0 ? (
                            stats.topTags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-day-accent/10 dark:bg-night-accent/20 text-day-accent dark:text-night-accent rounded-full text-xs font-medium">#{tag}</span>
                            ))
                        ) : (
                            <span className="text-sm text-gray-500 italic">No tags yet</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
