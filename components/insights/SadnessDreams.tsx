import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface SadnessDreamsProps {
    dreams: Dream[];
}

const SADNESS = ['sad', 'cry', 'crying', 'tears', 'grief', 'mourn', 'loss', 'miss', 'lonely', 'depressed', 'heartbreak'];

export const SadnessDreams: React.FC<SadnessDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (!dreams || dreams.length < 5) return null;

        const sadDreams = dreams.filter(d =>
            d.dreamText && SADNESS.some(s => d.dreamText.toLowerCase().includes(s))
        );

        const percentage = dreams.length > 0
            ? Math.round((sadDreams.length / dreams.length) * 100)
            : 0;

        return {
            count: sadDreams.length,
            percentage
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Sadness Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-blue-500">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with sadness</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
