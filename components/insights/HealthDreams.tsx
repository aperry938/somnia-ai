import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface HealthDreamsProps {
    dreams: Dream[];
}

const HEALTH = ['health', 'sick', 'hospital', 'doctor', 'medicine', 'pain', 'injury', 'heal', 'illness', 'disease', 'body'];

export const HealthDreams: React.FC<HealthDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const healthDreams = dreams.filter(d =>
            HEALTH.some(h => d.dreamText.toLowerCase().includes(h))
        );

        return {
            count: healthDreams.length,
            percentage: Math.round((healthDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Health Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-teal-500">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams about health</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
