import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface RomanticDreamsProps {
    dreams: Dream[];
}

const ROMANTIC = ['love', 'kiss', 'romance', 'date', 'wedding', 'marry', 'partner', 'boyfriend', 'girlfriend', 'heart', 'passion'];

export const RomanticDreams: React.FC<RomanticDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const romanticDreams = dreams.filter(d =>
            ROMANTIC.some(r => d.dreamText.toLowerCase().includes(r))
        );

        return {
            count: romanticDreams.length,
            percentage: Math.round((romanticDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 dark:border-rose-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Romantic Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-pink-600 dark:text-rose-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with romance</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
