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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Weekly Digest
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
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
