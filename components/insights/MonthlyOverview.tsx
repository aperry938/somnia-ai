import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface MonthlyOverviewProps {
    dreams: Dream[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MonthlyOverview: React.FC<MonthlyOverviewProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 10) return null;

        const monthCounts: Record<string, number> = {};
        const now = new Date();

        // Last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            monthCounts[key] = 0;
        }

        dreams.forEach(dream => {
            const d = new Date(dream.timestamp);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (key in monthCounts) {
                monthCounts[key]++;
            }
        });

        const data = Object.entries(monthCounts).map(([key, count]) => {
            const [year, month] = key.split('-').map(Number);
            return { month: MONTHS[month], year, count };
        });

        const max = Math.max(...data.map(d => d.count), 1);

        return { data, max };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Monthly Overview</h3>

            <div className="flex items-end gap-2 h-24 justify-between">
                {stats.data.map(({ month, count }, i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                        <span className="text-xs mb-1 text-day-text-secondary dark:text-night-text-secondary">{count}</span>
                        <div
                            className="w-full bg-gradient-to-t from-day-accent to-day-accent/50 dark:from-night-accent dark:to-night-accent/50 rounded-t"
                            style={{ height: `${(count / stats.max) * 100}%`, minHeight: count > 0 ? '4px' : '2px' }}
                        />
                        <span className="text-[10px] text-day-text-secondary dark:text-night-text-secondary mt-1">{month}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
