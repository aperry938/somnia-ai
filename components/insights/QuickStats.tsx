import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface QuickStatsProps {
    dreams: Dream[];
}

export const QuickStats: React.FC<QuickStatsProps> = React.memo(({ dreams }) => {
    // Single-pass O(n) calculation instead of O(4n) from multiple filter() calls
    // Hooks must be called before any early returns
    const stats = useMemo(() => {
        if (dreams.length === 0) {
            return { thisWeek: 0, thisMonth: 0, withImages: 0, withAnalysis: 0 };
        }

        const now = Date.now();
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

        let thisWeek = 0;
        let thisMonth = 0;
        let withImages = 0;
        let withAnalysis = 0;

        for (const dream of dreams) {
            const timestamp = new Date(dream.timestamp).getTime();
            if (timestamp >= oneWeekAgo) thisWeek++;
            if (timestamp >= oneMonthAgo) thisMonth++;
            if (dream.imageUrl) withImages++;
            if (dream.aiAnalysis) withAnalysis++;
        }

        return { thisWeek, thisMonth, withImages, withAnalysis };
    }, [dreams]);

    // Early return after hooks
    if (dreams.length === 0) return null;

    const { thisWeek, thisMonth, withImages, withAnalysis } = stats;

    return (
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Dream journal statistics">
            {[
                { label: 'Total', value: dreams.length, color: 'text-day-accent dark:text-night-accent' },
                { label: 'This Week', value: thisWeek, color: 'text-green-600 dark:text-green-400' },
                { label: 'This Month', value: thisMonth, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'AI Enhanced', value: withImages + withAnalysis, color: 'text-purple-600 dark:text-purple-400' }
            ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-2 bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-lg" role="status" aria-label={`${label}: ${value} dreams`}>
                    <p className={`text-xl font-bold ${color}`} aria-hidden="true">{value}</p>
                    <p className="text-[10px] text-day-text-secondary dark:text-night-text-secondary" aria-hidden="true">{label}</p>
                </div>
            ))}
        </div>
    );
});
