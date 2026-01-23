import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface AdventureDreamsProps {
    dreams: Dream[];
}

const ADVENTURE = ['adventure', 'explore', 'travel', 'journey', 'discover', 'quest', 'mission', 'expedition', 'treasure', 'hero'];

export const AdventureDreams: React.FC<AdventureDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const adventureDreams = dreams.filter(d =>
            ADVENTURE.some(a => d.dreamText.toLowerCase().includes(a))
        );

        return {
            count: adventureDreams.length,
            percentage: Math.round((adventureDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 dark:border-yellow-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Adventure Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-amber-600 dark:text-yellow-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with adventure</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
