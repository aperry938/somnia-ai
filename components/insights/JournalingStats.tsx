import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface JournalingStatsProps {
    dreams: Dream[];
}

export const JournalingStats: React.FC<JournalingStatsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length === 0) return null;

        const dates = dreams.map(d => new Date(d.timestamp));
        const firstDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const daysSinceStart = Math.ceil((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

        const totalWords = dreams.reduce((sum, d) => sum + d.dreamText.split(/\s+/).filter(w => w).length, 0);
        const avgWords = Math.round(totalWords / dreams.length);

        const withAnalysis = dreams.filter(d => d.aiAnalysis).length;
        const analysisRate = Math.round((withAnalysis / dreams.length) * 100);

        const withTags = dreams.filter(d => d.tags && d.tags.length > 0).length;
        const tagRate = Math.round((withTags / dreams.length) * 100);

        return {
            total: dreams.length,
            daysSinceStart,
            avgPerWeek: ((dreams.length / daysSinceStart) * 7).toFixed(1),
            totalWords,
            avgWords,
            analysisRate,
            tagRate
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Journaling Statistics
            </h3>

            <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-white/30 dark:bg-black/20 rounded-lg">
                    <p className="text-2xl font-bold text-day-accent dark:text-night-accent">{stats.total}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Total Dreams</p>
                </div>
                <div className="text-center p-2 bg-white/30 dark:bg-black/20 rounded-lg">
                    <p className="text-2xl font-bold">{stats.avgPerWeek}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Per Week</p>
                </div>
                <div className="text-center p-2 bg-white/30 dark:bg-black/20 rounded-lg">
                    <p className="text-2xl font-bold">{stats.totalWords.toLocaleString()}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Total Words</p>
                </div>
                <div className="text-center p-2 bg-white/30 dark:bg-black/20 rounded-lg">
                    <p className="text-2xl font-bold">{stats.avgWords}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Avg Words</p>
                </div>
            </div>

            <div className="mt-3 flex justify-around text-xs text-day-text-secondary dark:text-night-text-secondary">
                <span>{stats.analysisRate}% analyzed</span>
                <span>•</span>
                <span>{stats.tagRate}% tagged</span>
                <span>•</span>
                <span>{stats.daysSinceStart} days journaling</span>
            </div>
        </div>
    );
});
