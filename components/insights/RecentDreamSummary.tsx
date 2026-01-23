import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface RecentDreamSummaryProps {
    dreams: Dream[];
}

export const RecentDreamSummary: React.FC<RecentDreamSummaryProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 3) return null;

        const recent = dreams.slice(0, 7);
        const avgWords = recent.reduce((s, d) => s + (d.dreamText || '').split(/\s+/).filter(w => w.length > 0).length, 0) / recent.length;
        const withAnalysis = recent.filter(d => d.aiAnalysis).length;
        const dreamsWithQuality = recent.filter(d => d.sleepQuality != null && d.sleepQuality > 0);
        const avgQuality = dreamsWithQuality.length > 0
            ? dreamsWithQuality.reduce((s, d) => s + (d.sleepQuality || 0), 0) / dreamsWithQuality.length
            : null;

        return {
            count: recent.length,
            avgWords: Math.round(avgWords),
            analyzed: withAnalysis,
            avgQuality: avgQuality !== null ? avgQuality.toFixed(1) : '-'
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-day-accent/10 to-day-accent/5 dark:from-night-accent/10 dark:to-night-accent/5 border border-day-accent/20 dark:border-night-accent/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">This Week</h3>

            <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                    <div className="text-2xl font-bold text-day-accent dark:text-night-accent">{stats.count}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams Logged</div>
                </div>
                <div>
                    <div className="text-2xl font-bold">{stats.avgWords}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Avg Words</div>
                </div>
                <div>
                    <div className="text-2xl font-bold">{stats.analyzed}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">AI Analyzed</div>
                </div>
                <div>
                    <div className="text-2xl font-bold">{stats.avgQuality}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Avg Sleep</div>
                </div>
            </div>
        </div>
    );
});
