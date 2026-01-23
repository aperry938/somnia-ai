import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface PowerDreamsProps {
    dreams: Dream[];
}

const POWER = ['power', 'strength', 'strong', 'superhero', 'superpower', 'magic', 'telekinesis', 'invincible', 'force', 'ability'];

export const PowerDreams: React.FC<PowerDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const powerDreams = dreams.filter(d => {
            const text = d.dreamText?.toLowerCase() ?? '';
            return text && POWER.some(p => text.includes(p));
        });

        if (powerDreams.length === 0) return null;

        return {
            count: powerDreams.length,
            percentage: Math.round((powerDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 dark:border-violet-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Power Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600 dark:text-violet-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with power</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
