import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface NatureDreamsProps {
    dreams: Dream[];
}

const NATURE = ['tree', 'forest', 'flower', 'plant', 'garden', 'grass', 'leaf', 'rain', 'sun', 'moon', 'star', 'cloud', 'wind', 'snow'];

export const NatureDreams: React.FC<NatureDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const natureDreams = dreams.filter(d =>
            NATURE.some(n => (d.dreamText || '').toLowerCase().includes(n))
        );

        return {
            count: natureDreams.length,
            percentage: Math.round((natureDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 dark:border-emerald-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Nature Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-emerald-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with nature</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
