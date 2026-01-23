import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface AnxietyDreamsProps {
    dreams: Dream[];
}

const ANXIETY = ['anxiety', 'anxious', 'worry', 'stress', 'nervous', 'panic', 'overwhelm', 'pressure', 'deadline', 'late'];

export const AnxietyDreams: React.FC<AnxietyDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (!dreams || dreams.length < 5) return null;

        const anxietyDreams = dreams.filter(d =>
            d.dreamText && ANXIETY.some(a => d.dreamText.toLowerCase().includes(a))
        );

        const percentage = dreams.length > 0
            ? Math.round((anxietyDreams.length / dreams.length) * 100)
            : 0;

        return {
            count: anxietyDreams.length,
            percentage
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Anxiety Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with anxiety</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
