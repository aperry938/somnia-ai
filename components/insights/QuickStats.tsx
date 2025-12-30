import React from 'react';
import { Dream } from '../../types';

interface QuickStatsProps {
    dreams: Dream[];
}

export const QuickStats: React.FC<QuickStatsProps> = ({ dreams }) => {
    if (dreams.length === 0) return null;

    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const thisWeek = dreams.filter(d => new Date(d.timestamp) >= oneWeekAgo).length;
    const thisMonth = dreams.filter(d => new Date(d.timestamp) >= oneMonthAgo).length;
    const withImages = dreams.filter(d => d.aiGeneratedImage).length;
    const withAnalysis = dreams.filter(d => d.aiAnalysis).length;

    return (
        <div className="grid grid-cols-4 gap-2">
            {[
                { label: 'Total', value: dreams.length, color: 'text-day-accent dark:text-night-accent' },
                { label: 'This Week', value: thisWeek, color: 'text-green-600 dark:text-green-400' },
                { label: 'This Month', value: thisMonth, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'AI Enhanced', value: withImages + withAnalysis, color: 'text-purple-600 dark:text-purple-400' }
            ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-2 bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-lg">
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-day-text-secondary dark:text-night-text-secondary">{label}</p>
                </div>
            ))}
        </div>
    );
};
