import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface JoyDreamsProps {
    dreams: Dream[];
}

const JOY = ['joy', 'happy', 'laugh', 'smile', 'celebrate', 'party', 'fun', 'exciting', 'wonderful', 'amazing', 'delight'];

export const JoyDreams: React.FC<JoyDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (!dreams || dreams.length < 5) return null;

        const joyDreams = dreams.filter(d =>
            d.dreamText && JOY.some(j => d.dreamText.toLowerCase().includes(j))
        );

        const percentage = dreams.length > 0
            ? Math.round((joyDreams.length / dreams.length) * 100)
            : 0;

        return {
            count: joyDreams.length,
            percentage
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 dark:border-orange-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Joy Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 dark:text-orange-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with joy</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
