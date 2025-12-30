import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface SleepDurationChartProps {
    dreams: Dream[];
}

/**
 * Visualize sleep duration patterns from dream entry times.
 * Infers approximate bed/wake times from dream timestamps.
 */
export const SleepDurationChart: React.FC<SleepDurationChartProps> = ({ dreams }) => {
    const data = useMemo(() => {
        if (dreams.length < 3) return null;

        // Group by hour of entry (assuming entry is near wake time)
        const hourCounts = new Array(24).fill(0);
        const dayOfWeek = new Array(7).fill(0);

        dreams.forEach(dream => {
            const date = new Date(dream.timestamp);
            hourCounts[date.getHours()]++;
            dayOfWeek[date.getDay()]++;
        });

        // Find peak wake time (most common hour)
        const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

        // Find most active day
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const peakDay = dayOfWeek.indexOf(Math.max(...dayOfWeek));

        // Calculate 7-day average
        const last7 = dreams.slice(0, 7);
        const avgHour = last7.reduce((sum, d) => sum + new Date(d.timestamp).getHours(), 0) / last7.length;

        return {
            hourCounts,
            peakHour,
            peakDay: dayNames[peakDay],
            avgWakeTime: avgHour,
            totalEntries: dreams.length
        };
    }, [dreams]);

    if (!data) return null;

    const maxCount = Math.max(...data.hourCounts);

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Wake Time Patterns
            </h3>

            <div className="grid grid-cols-2 gap-4 text-center mb-4">
                <div>
                    <p className="text-2xl font-bold text-day-accent dark:text-night-accent">
                        {data.peakHour > 12 ? `${data.peakHour - 12}PM` : data.peakHour === 0 ? '12AM' : `${data.peakHour}AM`}
                    </p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Peak Entry Time</p>
                </div>
                <div>
                    <p className="text-2xl font-bold">{data.peakDay}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Most Active Day</p>
                </div>
            </div>

            {/* 24-hour histogram */}
            <div className="flex items-end gap-[2px] h-16 mb-2">
                {data.hourCounts.map((count, hour) => (
                    <div
                        key={hour}
                        className="flex-1 bg-day-accent/30 dark:bg-night-accent/30 rounded-t transition-all hover:bg-day-accent dark:hover:bg-night-accent"
                        style={{ height: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%' }}
                        title={`${hour}:00 - ${count} entries`}
                    />
                ))}
            </div>
            <div className="flex justify-between text-[10px] text-day-text-secondary dark:text-night-text-secondary">
                <span>12AM</span>
                <span>6AM</span>
                <span>12PM</span>
                <span>6PM</span>
                <span>12AM</span>
            </div>
        </div>
    );
};
