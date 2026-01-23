import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamTimeOfDayProps {
    dreams: Dream[];
}

const TIME_KEYWORDS: Record<string, { keywords: string[]; gradient: string }> = {
    'Dawn': { keywords: ['dawn', 'sunrise', 'early morning', 'waking up', 'morning light'], gradient: 'from-orange-300 to-pink-300' },
    'Day': { keywords: ['daytime', 'afternoon', 'noon', 'midday', 'bright', 'sunlight'], gradient: 'from-yellow-300 to-orange-300' },
    'Dusk': { keywords: ['dusk', 'sunset', 'evening', 'twilight', 'late afternoon'], gradient: 'from-purple-400 to-orange-400' },
    'Night': { keywords: ['night', 'midnight', 'dark', 'moon', 'stars', 'nighttime', 'late'], gradient: 'from-indigo-600 to-purple-800' }
};

export const DreamTimeOfDay: React.FC<DreamTimeOfDayProps> = React.memo(({ dreams }) => {
    const times = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { time: string; count: number; gradient: string }[] = [];

        Object.entries(TIME_KEYWORDS).forEach(([time, { keywords, gradient }]) => {
            let count = 0;
            dreams.forEach(d => {
                if (!d.dreamText) return;
                const text = d.dreamText.toLowerCase();
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            if (count > 0) counts.push({ time, count, gradient });
        });

        return counts.sort((a, b) => b.count - a.count);
    }, [dreams]);

    if (times.length === 0) return null;

    const total = times.reduce((s, t) => s + t.count, 0);

    if (total === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Time of Day</h3>

            <div className="flex h-6 rounded-full overflow-hidden">
                {times.map(({ time, count, gradient }) => (
                    <div
                        key={time}
                        className={`bg-gradient-to-r ${gradient}`}
                        style={{ width: `${(count / total) * 100}%` }}
                        title={`${time}: ${count}`}
                    />
                ))}
            </div>

            <div className="flex justify-between mt-2 text-xs text-day-text-secondary dark:text-night-text-secondary">
                {times.map(({ time, count }) => (
                    <span key={time}>{time} ({count})</span>
                ))}
            </div>
        </div>
    );
});
