import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface HopeDreamsProps {
    dreams: Dream[];
}

const HOPE = ['hope', 'wish', 'dream', 'future', 'better', 'improve', 'goal', 'aspiration', 'optimistic', 'bright'];

export const HopeDreams: React.FC<HopeDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (!dreams || dreams.length < 5) return null;

        const hopeDreams = dreams.filter(d =>
            d.dreamText && HOPE.some(h => d.dreamText.toLowerCase().includes(h))
        );

        const percentage = dreams.length > 0
            ? Math.round((hopeDreams.length / dreams.length) * 100)
            : 0;

        return {
            count: hopeDreams.length,
            percentage
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-cyan-500/10 to-sky-500/10 border border-cyan-500/20 dark:border-sky-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Hope Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-cyan-600 dark:text-sky-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with hope</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
