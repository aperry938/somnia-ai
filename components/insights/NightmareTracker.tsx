import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface NightmareTrackerProps {
    dreams: Dream[];
}

const NIGHTMARE_KEYWORDS = ['nightmare', 'scary', 'terrifying', 'horror', 'afraid', 'fear', 'monster', 'chase', 'attacked', 'scream', 'panic', 'dark', 'trapped', 'evil', 'death'];

export const NightmareTracker: React.FC<NightmareTrackerProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const nightmares = dreams.filter(d => {
            const text = (d.dreamText || '').toLowerCase();
            return NIGHTMARE_KEYWORDS.some(kw => text.includes(kw));
        });

        const rate = Math.round((nightmares.length / dreams.length) * 100);
        const recentNightmares = nightmares.slice(0, 3);

        return { count: nightmares.length, rate, recentNightmares };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-red-500/10 to-gray-500/10 border border-red-500/20 dark:border-gray-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Nightmare Tracker
            </h3>

            <div className="flex items-center justify-between mb-3">
                <div className="text-center">
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.count}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Nightmares</p>
                </div>
                <div className="text-center">
                    <p className="text-3xl font-bold">{stats.rate}%</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Rate</p>
                </div>
            </div>

            {stats.recentNightmares.length > 0 && (
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                    Recent: {stats.recentNightmares.map(d => d.title || 'Untitled').join(', ')}
                </div>
            )}
        </div>
    );
});
