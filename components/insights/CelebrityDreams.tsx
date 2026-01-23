import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface CelebrityDreamsProps {
    dreams: Dream[];
}

const CELEBRITY = ['celebrity', 'famous', 'star', 'actor', 'singer', 'musician', 'president', 'politician', 'athlete', 'hero'];

export const CelebrityDreams: React.FC<CelebrityDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const celebDreams = dreams.filter(d =>
            CELEBRITY.some(c => d.dreamText.toLowerCase().includes(c))
        );

        return {
            count: celebDreams.length,
            percentage: Math.round((celebDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 dark:border-amber-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Celebrity Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 dark:text-amber-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with celebrities</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
