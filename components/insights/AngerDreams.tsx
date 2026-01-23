import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface AngerDreamsProps {
    dreams: Dream[];
}

const ANGER = ['anger', 'angry', 'rage', 'furious', 'mad', 'hate', 'frustrat', 'annoyed', 'irritat', 'yell', 'scream'];

export const AngerDreams: React.FC<AngerDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (!dreams || dreams.length < 5) return null;

        const angerDreams = dreams.filter(d =>
            d.dreamText && ANGER.some(a => d.dreamText.toLowerCase().includes(a))
        );

        const percentage = dreams.length > 0
            ? Math.round((angerDreams.length / dreams.length) * 100)
            : 0;

        return {
            count: angerDreams.length,
            percentage
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Anger Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-red-500">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with anger</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
