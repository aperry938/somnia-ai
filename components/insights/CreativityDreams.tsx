import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface CreativityDreamsProps {
    dreams: Dream[];
}

const CREATIVITY = ['create', 'art', 'paint', 'draw', 'write', 'invent', 'design', 'imagine', 'build', 'compose', 'creative'];

export const CreativityDreams: React.FC<CreativityDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const creativeDreams = dreams.filter(d =>
            d.dreamText && CREATIVITY.some(c => d.dreamText.toLowerCase().includes(c))
        );

        return {
            count: creativeDreams.length,
            percentage: Math.round((creativeDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 border border-fuchsia-500/20 dark:border-pink-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Creative Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-fuchsia-600 dark:text-pink-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with creativity</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
