import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface SuccessDreamsProps {
    dreams: Dream[];
}

const SUCCESS = ['success', 'win', 'achieve', 'accomplish', 'victory', 'proud', 'triumph', 'champion', 'goal', 'finish'];

export const SuccessDreams: React.FC<SuccessDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const successDreams = dreams.filter(d => {
            const text = d.dreamText?.toLowerCase() ?? '';
            return text && SUCCESS.some(s => text.includes(s));
        });

        if (successDreams.length === 0) return null;

        return {
            count: successDreams.length,
            percentage: Math.round((successDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 dark:border-green-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Success Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 dark:text-green-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with success</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
