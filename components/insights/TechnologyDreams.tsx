import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface TechnologyDreamsProps {
    dreams: Dream[];
}

const TECH = ['phone', 'computer', 'internet', 'app', 'robot', 'machine', 'screen', 'video', 'game', 'technology', 'digital', 'virtual'];

export const TechnologyDreams: React.FC<TechnologyDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const techDreams = dreams.filter(d =>
            TECH.some(t => (d.dreamText || '').toLowerCase().includes(t))
        );

        return {
            count: techDreams.length,
            percentage: Math.round((techDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Tech Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-cyan-500">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with technology</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
