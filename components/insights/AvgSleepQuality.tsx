import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface AvgSleepQualityProps {
    dreams: Dream[];
}

export const AvgSleepQuality: React.FC<AvgSleepQualityProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        const withQuality = dreams.filter(d => d.sleepQuality !== null && d.sleepQuality !== undefined);
        if (withQuality.length < 3) return null;

        const avg = withQuality.reduce((s, d) => s + (d.sleepQuality || 0), 0) / withQuality.length;

        return {
            avg: avg.toFixed(1),
            count: withQuality.length,
            rating: avg >= 4 ? 'Great' : avg >= 3 ? 'Good' : avg >= 2 ? 'Fair' : 'Poor'
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Avg Sleep Quality</h3>
            <div className="text-center">
                <div className="text-4xl font-bold text-day-accent dark:text-night-accent">{stats.avg}</div>
                <div className={`text-sm ${stats.rating === 'Great' ? 'text-green-500' : stats.rating === 'Good' ? 'text-blue-500' : stats.rating === 'Fair' ? 'text-yellow-500' : 'text-red-500'}`}>{stats.rating}</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-1">From {stats.count} nights</div>
            </div>
        </div>
    );
};
