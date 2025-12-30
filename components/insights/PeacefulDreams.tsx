import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface PeacefulDreamsProps {
    dreams: Dream[];
}

const PEACEFUL = ['peace', 'calm', 'relax', 'serene', 'quiet', 'gentle', 'soft', 'warm', 'safe', 'comfort', 'beautiful', 'happy', 'joy'];

export const PeacefulDreams: React.FC<PeacefulDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const peacefulDreams = dreams.filter(d =>
            PEACEFUL.some(p => d.dreamText.toLowerCase().includes(p))
        );

        return {
            count: peacefulDreams.length,
            percentage: Math.round((peacefulDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-sky-500/10 to-cyan-500/10 border border-sky-500/20 dark:border-cyan-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Peaceful Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-sky-600 dark:text-cyan-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with peace</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
