import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface ConflictDreamsProps {
    dreams: Dream[];
}

const CONFLICT = ['fight', 'argue', 'attack', 'war', 'battle', 'conflict', 'chase', 'run', 'escape', 'enemy', 'angry', 'yell', 'scream'];

export const ConflictDreams: React.FC<ConflictDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const conflictDreams = dreams.filter(d =>
            d.dreamText && CONFLICT.some(c => d.dreamText.toLowerCase().includes(c))
        );

        return {
            count: conflictDreams.length,
            percentage: Math.round((conflictDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Conflict Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-red-500">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with conflict</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
