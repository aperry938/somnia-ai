import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamCalendarProps {
    dreams: Dream[];
    onDayClick?: (date: Date, dreams: Dream[]) => void;
}

/**
 * Heatmap-style calendar showing dream frequency by day.
 * Shows the last 3 months of activity.
 */
export const DreamCalendar: React.FC<DreamCalendarProps> = React.memo(({ dreams, onDayClick }) => {
    const { weeks, dreamsByDate, months } = useMemo(() => {
        const now = new Date();
        const daysToShow = 91; // ~3 months
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - daysToShow);
        // Align to Sunday
        startDate.setDate(startDate.getDate() - startDate.getDay());

        // Count dreams per date
        const dreamsByDate = new Map<string, Dream[]>();
        dreams.forEach(d => {
            const dateKey = new Date(d.timestamp).toDateString();
            if (!dreamsByDate.has(dateKey)) dreamsByDate.set(dateKey, []);
            dreamsByDate.get(dateKey)!.push(d);
        });

        // Build weeks grid
        const weeks: Date[][] = [];
        const months: { label: string; colSpan: number }[] = [];
        let currentWeek: Date[] = [];
        let currentMonth = '';
        let currentMonthCols = 0;

        for (let i = 0; i <= daysToShow + 7; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);

            if (day > now) break;

            const monthLabel = day.toLocaleDateString(undefined, { month: 'short' });
            if (monthLabel !== currentMonth) {
                if (currentMonth && currentMonthCols > 0) {
                    months.push({ label: currentMonth, colSpan: currentMonthCols });
                }
                currentMonth = monthLabel;
                currentMonthCols = 0;
            }

            currentWeek.push(new Date(day));

            if (day.getDay() === 6) {
                weeks.push(currentWeek);
                currentWeek = [];
                currentMonthCols++;
            }
        }
        if (currentWeek.length) weeks.push(currentWeek);
        if (currentMonth) months.push({ label: currentMonth, colSpan: currentMonthCols || 1 });

        return { weeks, dreamsByDate, months };
    }, [dreams]);

    const getIntensity = (count: number): string => {
        if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
        if (count === 1) return 'bg-day-accent/30 dark:bg-night-accent/30';
        if (count === 2) return 'bg-day-accent/60 dark:bg-night-accent/60';
        return 'bg-day-accent dark:bg-night-accent';
    };

    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Dream Activity
            </h3>

            {/* Month labels */}
            <div className="flex text-xs text-day-text-secondary dark:text-night-text-secondary mb-1 ml-5">
                {months.map((m, i) => (
                    <div key={i} style={{ width: `${m.colSpan * 14}px` }} className="flex-shrink-0">
                        {m.label}
                    </div>
                ))}
            </div>

            <div className="flex gap-1">
                {/* Day labels */}
                <div className="flex flex-col gap-[2px] text-[10px] text-day-text-secondary dark:text-night-text-secondary">
                    {dayLabels.map((label, i) => (
                        <div key={i} className="h-3 w-4 flex items-center justify-center">
                            {i % 2 === 1 ? label : ''}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="flex gap-[2px] overflow-x-auto">
                    {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-[2px]">
                            {week.map((day, di) => {
                                const dateKey = day.toDateString();
                                const dayDreams = dreamsByDate.get(dateKey) || [];
                                const count = dayDreams.length;
                                const isToday = day.toDateString() === new Date().toDateString();

                                return (
                                    <button
                                        key={di}
                                        onClick={() => onDayClick?.(day, dayDreams)}
                                        className={`w-3 h-3 rounded-[2px] ${getIntensity(count)} ${isToday ? 'ring-1 ring-day-accent dark:ring-night-accent' : ''} transition-colors hover:opacity-80`}
                                        title={`${day.toLocaleDateString()}: ${count} dream${count !== 1 ? 's' : ''}`}
                                        aria-label={`${day.toLocaleDateString()}: ${count} dream${count !== 1 ? 's' : ''}${isToday ? ', today' : ''}`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 text-xs text-day-text-secondary dark:text-night-text-secondary" role="img" aria-label="Legend: color intensity indicates number of dreams logged per day">
                <span>Less</span>
                <div className="flex gap-[2px]" aria-hidden="true">
                    <div className={`w-3 h-3 rounded-[2px] ${getIntensity(0)}`} />
                    <div className={`w-3 h-3 rounded-[2px] ${getIntensity(1)}`} />
                    <div className={`w-3 h-3 rounded-[2px] ${getIntensity(2)}`} />
                    <div className={`w-3 h-3 rounded-[2px] ${getIntensity(3)}`} />
                </div>
                <span>More</span>
            </div>
        </div>
    );
});
