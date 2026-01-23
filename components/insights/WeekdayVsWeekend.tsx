import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface WeekdayVsWeekendProps {
    dreams: Dream[];
}

export const WeekdayVsWeekend: React.FC<WeekdayVsWeekendProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 7) return null;

        let weekdayCount = 0, weekendCount = 0;
        let weekdayWords = 0, weekendWords = 0;

        dreams.forEach(d => {
            if (!d.timestamp || !d.dreamText) return;
            const date = new Date(d.timestamp);
            if (isNaN(date.getTime())) return;
            const day = date.getDay();
            const words = d.dreamText.split(/\s+/).length;
            if (day === 0 || day === 6) {
                weekendCount++;
                weekendWords += words;
            } else {
                weekdayCount++;
                weekdayWords += words;
            }
        });

        const weekdayAvg = weekdayCount > 0 ? Math.round(weekdayWords / weekdayCount) : 0;
        const weekendAvg = weekendCount > 0 ? Math.round(weekendWords / weekendCount) : 0;

        return {
            weekdayCount,
            weekendCount,
            weekdayAvg,
            weekendAvg,
            moreDetailOn: weekendAvg > weekdayAvg ? 'Weekends' : weekdayAvg > weekendAvg ? 'Weekdays' : 'Equal'
        };
    }, [dreams]);

    if (!stats) return null;

    const total = stats.weekdayCount + stats.weekendCount;

    if (total === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Weekday vs Weekend</h3>

            <div className="flex h-4 rounded-full overflow-hidden mb-3">
                <div className="bg-blue-500" style={{ width: `${(stats.weekdayCount / total) * 100}%` }} />
                <div className="bg-purple-500" style={{ width: `${(stats.weekendCount / total) * 100}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                    <div className="text-xl font-bold text-blue-500">{stats.weekdayCount}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Weekday ({stats.weekdayAvg} avg words)</div>
                </div>
                <div>
                    <div className="text-xl font-bold text-purple-500">{stats.weekendCount}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Weekend ({stats.weekendAvg} avg words)</div>
                </div>
            </div>

            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary mt-2">
                More detail on: <span className="font-bold">{stats.moreDetailOn}</span>
            </p>
        </div>
    );
});
