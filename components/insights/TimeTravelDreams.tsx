import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface TimeTravelDreamsProps {
    dreams: Dream[];
}

const TIME_KEYWORDS = ['future', 'past', 'yesterday', 'tomorrow', 'years ago', 'time travel', 'old', 'young', 'childhood', 'when I was'];

export const TimeTravelDreams: React.FC<TimeTravelDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const timeDreams = dreams.filter(d =>
            TIME_KEYWORDS.some(kw => d.dreamText.toLowerCase().includes(kw))
        );

        return {
            count: timeDreams.length,
            percentage: Math.round((timeDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Time Travel Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-day-accent dark:text-night-accent">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with time elements</div>
                <div className="text-sm mt-2">{stats.count} dreams</div>
            </div>
        </div>
    );
};
