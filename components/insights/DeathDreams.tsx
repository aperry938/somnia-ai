import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DeathDreamsProps {
    dreams: Dream[];
}

const DEATH = ['death', 'dead', 'die', 'dying', 'funeral', 'grave', 'cemetery', 'ghost', 'afterlife', 'heaven', 'hell'];

export const DeathDreams: React.FC<DeathDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const deathDreams = dreams.filter(d =>
            DEATH.some(t => d.dreamText.toLowerCase().includes(t))
        );

        return {
            count: deathDreams.length,
            percentage: Math.round((deathDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Death/Afterlife Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-gray-600">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with death themes</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
