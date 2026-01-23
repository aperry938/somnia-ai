import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DayVsNightDreamsProps {
    dreams: Dream[];
}

const DAY = ['day', 'sun', 'sunlight', 'daylight', 'bright', 'morning', 'afternoon', 'sunny'];
const NIGHT = ['night', 'moon', 'dark', 'darkness', 'midnight', 'evening', 'stars', 'shadow'];

export const DayVsNightDreams: React.FC<DayVsNightDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let day = 0, night = 0;

        dreams.forEach(d => {
            if (!d.dreamText) return;
            const text = d.dreamText.toLowerCase();
            if (DAY.some(w => text.includes(w))) day++;
            if (NIGHT.some(w => text.includes(w))) night++;
        });

        const total = day + night || 1;

        return {
            day,
            night,
            dayPct: Math.round((day / total) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Day vs Night</h3>
            <div className="flex h-4 rounded-full overflow-hidden mb-3">
                <div className="bg-yellow-400" style={{ width: `${stats.dayPct}%` }} />
                <div className="bg-indigo-700" style={{ width: `${100 - stats.dayPct}%` }} />
            </div>
            <div className="flex justify-between text-sm">
                <span><span className="font-bold text-yellow-500">{stats.day}</span> Day</span>
                <span><span className="font-bold text-indigo-500">{stats.night}</span> Night</span>
            </div>
        </div>
    );
};
