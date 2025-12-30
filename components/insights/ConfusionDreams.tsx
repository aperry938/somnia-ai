import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface ConfusionDreamsProps {
    dreams: Dream[];
}

const CONFUSION = ['confuse', 'confused', 'confusion', 'lost', 'maze', 'puzzled', 'unclear', "don't understand", 'bewildered', 'disoriented'];

export const ConfusionDreams: React.FC<ConfusionDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const confusionDreams = dreams.filter(d =>
            CONFUSION.some(c => d.dreamText.toLowerCase().includes(c))
        );

        return {
            count: confusionDreams.length,
            percentage: Math.round((confusionDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Confusion Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-amber-500">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with confusion</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
