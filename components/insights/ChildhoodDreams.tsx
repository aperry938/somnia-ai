import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface ChildhoodDreamsProps {
    dreams: Dream[];
}

const CHILDHOOD = ['childhood', 'child', 'kid', 'young', 'youth', 'school', 'playground', 'toy', 'memories', 'grow up'];

export const ChildhoodDreams: React.FC<ChildhoodDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const childhoodDreams = dreams.filter(d =>
            CHILDHOOD.some(c => (d.dreamText?.toLowerCase() ?? '').includes(c))
        );

        return {
            count: childhoodDreams.length,
            percentage: Math.round((childhoodDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/20 dark:border-blue-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Childhood Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-sky-600 dark:text-blue-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams about childhood</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
