import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface FearDreamsProps {
    dreams: Dream[];
}

const FEAR = ['fear', 'afraid', 'scary', 'scare', 'terrify', 'horror', 'monster', 'danger', 'threat', 'panic', 'nightmare'];

export const FearDreams: React.FC<FearDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (!dreams || dreams.length < 5) return null;

        const fearDreams = dreams.filter(d =>
            d.dreamText && FEAR.some(f => d.dreamText.toLowerCase().includes(f))
        );

        const percentage = dreams.length > 0
            ? Math.round((fearDreams.length / dreams.length) * 100)
            : 0;

        return {
            count: fearDreams.length,
            percentage
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Fear Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with fear</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
