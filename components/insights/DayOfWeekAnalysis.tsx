import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DayOfWeekAnalysisProps {
    dreams: Dream[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DayOfWeekAnalysis: React.FC<DayOfWeekAnalysisProps> = ({ dreams }) => {
    const dayStats = useMemo(() => {
        if (dreams.length < 7) return null;

        const counts = [0, 0, 0, 0, 0, 0, 0];
        dreams.forEach(d => {
            const day = new Date(d.timestamp).getDay();
            counts[day]++;
        });

        const max = Math.max(...counts);
        const bestDay = DAYS[counts.indexOf(max)];

        return { counts, max, bestDay };
    }, [dreams]);

    if (!dayStats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dreams by Day</h3>

            <div className="flex items-end gap-1 h-20 justify-between">
                {dayStats.counts.map((count, i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                        <div
                            className={`w-full rounded-t ${i === dayStats.counts.indexOf(dayStats.max) ? 'bg-day-accent dark:bg-night-accent' : 'bg-gray-300 dark:bg-gray-600'}`}
                            style={{ height: `${dayStats.max > 0 ? (count / dayStats.max) * 100 : 0}%`, minHeight: count > 0 ? '4px' : '0' }}
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-between text-[10px] text-day-text-secondary dark:text-night-text-secondary mt-1">
                {DAYS.map(d => <span key={d}>{d}</span>)}
            </div>

            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary mt-3">
                You dream most on <span className="font-bold text-day-accent dark:text-night-accent">{dayStats.bestDay}</span>
            </p>
        </div>
    );
};
