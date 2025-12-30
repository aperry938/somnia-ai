import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface AverageRecallTimeProps {
    dreams: Dream[];
}

export const AverageRecallTime: React.FC<AverageRecallTimeProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const hourCounts: number[] = new Array(24).fill(0);
        const hourTotals: number[] = new Array(24).fill(0);

        dreams.forEach(d => {
            const hour = new Date(d.timestamp).getHours();
            hourCounts[hour]++;
            hourTotals[hour] += d.dreamText.split(/\s+/).length;
        });

        // Find peak recall hour
        let peakHour = 0;
        let maxCount = 0;
        hourCounts.forEach((count, hour) => {
            if (count > maxCount) {
                maxCount = count;
                peakHour = hour;
            }
        });

        // Calculate average words per entry by time of day
        const morningAvg = hourTotals.slice(5, 12).reduce((a, b) => a + b, 0) / (hourCounts.slice(5, 12).reduce((a, b) => a + b, 0) || 1);
        const afternoonAvg = hourTotals.slice(12, 17).reduce((a, b) => a + b, 0) / (hourCounts.slice(12, 17).reduce((a, b) => a + b, 0) || 1);
        const nightAvg = hourTotals.slice(17, 24).reduce((a, b) => a + b, 0) / (hourCounts.slice(17, 24).reduce((a, b) => a + b, 0) || 1);

        const peakTime = `${peakHour > 12 ? peakHour - 12 : peakHour}:00 ${peakHour >= 12 ? 'PM' : 'AM'}`;

        return { peakTime, peakHour, morningAvg: Math.round(morningAvg), afternoonAvg: Math.round(afternoonAvg), nightAvg: Math.round(nightAvg) };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Best Recall Time</h3>

            <div className="text-center mb-4">
                <div className="text-2xl font-bold text-day-accent dark:text-night-accent">{stats.peakTime}</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">When you log most dreams</div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                    <div className="font-bold">{stats.morningAvg}</div>
                    <div className="text-day-text-secondary dark:text-night-text-secondary">AM words</div>
                </div>
                <div>
                    <div className="font-bold">{stats.afternoonAvg}</div>
                    <div className="text-day-text-secondary dark:text-night-text-secondary">Midday</div>
                </div>
                <div>
                    <div className="font-bold">{stats.nightAvg}</div>
                    <div className="text-day-text-secondary dark:text-night-text-secondary">PM words</div>
                </div>
            </div>
        </div>
    );
};
