import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface SpiritualDreamsProps {
    dreams: Dream[];
}

const SPIRITUAL = ['god', 'spirit', 'soul', 'pray', 'angel', 'devil', 'meditation', 'enlighten', 'transcend', 'divine', 'sacred'];

export const SpiritualDreams: React.FC<SpiritualDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const spiritualDreams = dreams.filter(d =>
            d.dreamText && SPIRITUAL.some(s => d.dreamText.toLowerCase().includes(s))
        );

        return {
            count: spiritualDreams.length,
            percentage: Math.round((spiritualDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 dark:border-violet-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Spiritual Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-violet-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with spirituality</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
