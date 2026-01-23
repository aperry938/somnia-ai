import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface TitleAnalysisProps {
    dreams: Dream[];
}

export const TitleAnalysis: React.FC<TitleAnalysisProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        const titled = dreams.filter(d => d.title && d.title.trim().length > 0);
        if (titled.length < 3) return null;

        const avgTitleLen = titled.reduce((s, d) => s + d.title!.length, 0) / titled.length;
        const longestTitle = titled.reduce((max, d) => d.title!.length > max.title!.length ? d : max);
        const titleWords = titled.reduce((s, d) => s + d.title!.split(/\s+/).length, 0) / titled.length;

        return {
            titled: titled.length,
            untitled: dreams.length - titled.length,
            avgTitleLen: Math.round(avgTitleLen),
            avgTitleWords: titleWords.toFixed(1),
            longestTitle: longestTitle.title!.slice(0, 30) + (longestTitle.title!.length > 30 ? '...' : '')
        };
    }, [dreams]);

    if (!stats || dreams.length === 0) return null;

    const titleRate = Math.round((stats.titled / dreams.length) * 100);

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Title Habits</h3>

            <div className="flex h-3 rounded-full overflow-hidden mb-3">
                <div className="bg-day-accent dark:bg-night-accent" style={{ width: `${titleRate}%` }} />
                <div className="bg-gray-300 dark:bg-gray-600" style={{ width: `${100 - titleRate}%` }} />
            </div>

            <div className="text-center mb-2">
                <span className="font-bold">{titleRate}%</span> dreams titled
            </div>

            <div className="text-xs space-y-1 text-day-text-secondary dark:text-night-text-secondary">
                <p>Avg title: {stats.avgTitleWords} words</p>
                <p className="truncate">Longest: {stats.longestTitle}</p>
            </div>
        </div>
    );
});
