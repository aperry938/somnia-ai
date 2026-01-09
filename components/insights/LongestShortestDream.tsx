import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface LongestShortestDreamProps {
    dreams: Dream[];
}

export const LongestShortestDream: React.FC<LongestShortestDreamProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const withWords = dreams.map(d => ({
            ...d,
            wordCount: d.dreamText.split(/\s+/).filter(w => w).length
        }));

        const sorted = [...withWords].sort((a, b) => b.wordCount - a.wordCount);
        const longest = sorted[0];
        const shortest = sorted[sorted.length - 1];

        if (!longest || !shortest) return null;

        return {
            longest: { title: longest.title || 'Untitled', words: longest.wordCount, date: new Date(longest.timestamp).toLocaleDateString() },
            shortest: { title: shortest.title || 'Untitled', words: shortest.wordCount, date: new Date(shortest.timestamp).toLocaleDateString() }
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Extremes</h3>

            <div className="space-y-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-green-600 dark:text-green-400">Longest</span>
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">{stats.longest.words} words</span>
                    </div>
                    <div className="font-medium truncate">{stats.longest.title}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">{stats.longest.date}</div>
                </div>

                <div className="p-2 bg-orange-500/10 rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-orange-600 dark:text-orange-400">Shortest</span>
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{stats.shortest.words} words</span>
                    </div>
                    <div className="font-medium truncate">{stats.shortest.title}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">{stats.shortest.date}</div>
                </div>
            </div>
        </div>
    );
};
