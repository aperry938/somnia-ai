import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamLengthInsightsProps {
    dreams: Dream[];
}

/**
 * Analyze dream narrative lengths and show insights about journaling patterns.
 */
export const DreamLengthInsights: React.FC<DreamLengthInsightsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 3) return null;

        const lengths = dreams.map(d => (d.dreamText || '').split(/\s+/).filter(w => w).length);
        const total = lengths.reduce((sum, l) => sum + l, 0);
        const avg = Math.round(total / lengths.length);
        const max = Math.max(...lengths);
        const min = Math.min(...lengths);

        // Find longest dream
        const longestIdx = lengths.indexOf(max);
        const longestDream = dreams[longestIdx];

        // Recent trend (last 7 vs previous 7)
        const recent = lengths.slice(0, 7);
        const previous = lengths.slice(7, 14);
        const recentAvg = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
        const prevAvg = previous.length > 0 ? previous.reduce((a, b) => a + b, 0) / previous.length : 0;
        const trend = prevAvg > 0 ? Math.round(((recentAvg - prevAvg) / prevAvg) * 100) : 0;

        return {
            avg,
            max,
            min,
            total,
            longestDream,
            trend,
            isImproving: trend > 0
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Dream Length Insights
            </h3>

            <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div>
                    <p className="text-2xl font-bold text-day-accent dark:text-night-accent">{stats.avg}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Avg Words</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.max}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Longest</p>
                </div>
                <div>
                    <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Total Words</p>
                </div>
            </div>

            {/* Trend indicator */}
            {stats.trend !== 0 && (
                <div className={`flex items-center justify-center gap-1 text-sm ${stats.isImproving ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stats.isImproving ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                    </svg>
                    <span>{Math.abs(stats.trend)}% {stats.isImproving ? 'more' : 'less'} detail recently</span>
                </div>
            )}

            {/* Longest dream */}
            {stats.longestDream && (
                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary text-center mt-3">
                    Longest: "{stats.longestDream.title || 'Untitled'}" ({stats.max} words)
                </p>
            )}
        </div>
    );
};
