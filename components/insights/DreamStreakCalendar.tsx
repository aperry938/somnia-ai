import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamStreakCalendarProps {
    dreams: Dream[];
}

/**
 * Visual streak calendar showing consecutive journaling days.
 * Similar to GitHub contribution graph but for dream journaling.
 */
export const DreamStreakCalendar: React.FC<DreamStreakCalendarProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length === 0) return null;

        // Get unique dates
        const dates = new Set<string>();
        dreams.forEach(d => {
            dates.add(new Date(d.timestamp).toDateString());
        });

        // Calculate current streak
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);

            if (dates.has(checkDate.toDateString())) {
                currentStreak++;
            } else if (i > 0) {
                break;
            }
        }

        // Calculate longest streak
        let longestStreak = 0;
        let tempStreak = 0;
        const sortedDates = Array.from(dates).map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());

        for (let i = 0; i < sortedDates.length; i++) {
            if (i === 0) {
                tempStreak = 1;
            } else {
                const diff = (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
                if (diff === 1) {
                    tempStreak++;
                } else {
                    longestStreak = Math.max(longestStreak, tempStreak);
                    tempStreak = 1;
                }
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        // Build last 30 days grid
        const last30: { date: Date; hasDream: boolean }[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            last30.push({
                date: d,
                hasDream: dates.has(d.toDateString())
            });
        }

        return {
            currentStreak,
            longestStreak,
            totalDays: dates.size,
            last30
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 dark:border-red-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
                Dream Streak
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.currentStreak}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Current</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.longestStreak}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Longest</p>
                </div>
                <div>
                    <p className="text-2xl font-bold">{stats.totalDays}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Total Days</p>
                </div>
            </div>

            {/* Last 30 days grid */}
            <div className="flex flex-wrap gap-1 justify-center">
                {stats.last30.map((day, i) => (
                    <div
                        key={i}
                        className={`w-4 h-4 rounded-sm ${day.hasDream
                            ? 'bg-orange-500 dark:bg-red-500'
                            : 'bg-gray-200 dark:bg-gray-700'}`}
                        title={`${day.date.toLocaleDateString()} - ${day.hasDream ? 'Logged' : 'Missed'}`}
                    />
                ))}
            </div>

            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary text-center mt-2">
                Last 30 days
            </p>
        </div>
    );
};
