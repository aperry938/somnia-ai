import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface JournalingGapsProps {
    dreams: Dream[];
}

export const JournalingGaps: React.FC<JournalingGapsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const sorted = [...dreams].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        let maxGap = 0;
        let totalGaps = 0;

        for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i];
            const previous = sorted[i - 1];
            if (current && previous) {
                const gap = (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / (1000 * 60 * 60 * 24);
                totalGaps += gap;
                if (gap > maxGap) maxGap = gap;
            }
        }

        const avgGap = totalGaps / (sorted.length - 1);

        return { maxGap: Math.round(maxGap), avgGap: avgGap.toFixed(1) };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Journaling Gaps</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                    <div className="text-2xl font-bold text-orange-500">{stats.maxGap}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Longest gap (days)</div>
                </div>
                <div>
                    <div className="text-2xl font-bold">{stats.avgGap}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Avg gap (days)</div>
                </div>
            </div>
        </div>
    );
};
