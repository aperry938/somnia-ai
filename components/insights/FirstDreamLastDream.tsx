import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface FirstDreamLastDreamProps {
    dreams: Dream[];
}

export const FirstDreamLastDream: React.FC<FirstDreamLastDreamProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 2) return null;

        const sorted = [...dreams].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        const daysSince = Math.floor((Date.now() - new Date(first.timestamp).getTime()) / (1000 * 60 * 60 * 24));
        const dreamsPerMonth = dreams.length / (daysSince / 30) || 0;

        return {
            first: { title: first.title || 'Untitled', date: new Date(first.timestamp).toLocaleDateString() },
            last: { title: last.title || 'Untitled', date: new Date(last.timestamp).toLocaleDateString() },
            daysSince,
            dreamsPerMonth: dreamsPerMonth.toFixed(1)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Your Journey</h3>

            <div className="space-y-3">
                <div className="p-2 bg-white/30 dark:bg-black/20 rounded-lg">
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary mb-1">First Dream</div>
                    <div className="font-medium truncate">{stats.first.title}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">{stats.first.date}</div>
                </div>
                <div className="p-2 bg-white/30 dark:bg-black/20 rounded-lg">
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary mb-1">Latest Dream</div>
                    <div className="font-medium truncate">{stats.last.title}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">{stats.last.date}</div>
                </div>
            </div>

            <div className="text-center mt-3 text-sm">
                <span className="font-bold text-day-accent dark:text-night-accent">{stats.daysSince}</span> days journaling
                <br />
                <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">{stats.dreamsPerMonth} dreams/month average</span>
            </div>
        </div>
    );
};
