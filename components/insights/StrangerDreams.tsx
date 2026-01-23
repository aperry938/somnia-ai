import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface StrangerDreamsProps {
    dreams: Dream[];
}

const STRANGERS = ['stranger', 'unknown', 'unfamiliar', 'someone', 'mysterious person', 'figure', 'silhouette', 'shadow person'];

export const StrangerDreams: React.FC<StrangerDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const strangerDreams = dreams.filter(d =>
            STRANGERS.some(s => d.dreamText.toLowerCase().includes(s))
        );

        return {
            count: strangerDreams.length,
            percentage: Math.round((strangerDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Stranger Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-slate-500">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with strangers</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
