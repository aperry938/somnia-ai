import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface SleepQualityTrendProps {
    dreams: Dream[];
}

export const SleepQualityTrend: React.FC<SleepQualityTrendProps> = ({ dreams }) => {
    const trend = useMemo(() => {
        const withQuality = dreams.filter(d => d.sleepQuality !== null && d.sleepQuality !== undefined);
        if (withQuality.length < 5) return null;

        const recent = withQuality.slice(0, 7);
        const previous = withQuality.slice(7, 14);

        const recentAvg = recent.reduce((s, d) => s + (d.sleepQuality || 0), 0) / recent.length;
        const prevAvg = previous.length > 0
            ? previous.reduce((s, d) => s + (d.sleepQuality || 0), 0) / previous.length
            : recentAvg;

        const change = recentAvg - prevAvg;
        const overall = withQuality.reduce((s, d) => s + (d.sleepQuality || 0), 0) / withQuality.length;

        // Build sparkline data (last 14 entries)
        const sparkData = withQuality.slice(0, 14).reverse().map(d => d.sleepQuality || 0);

        return {
            recentAvg: recentAvg.toFixed(1),
            change,
            overall: overall.toFixed(1),
            sparkData,
            isImproving: change > 0
        };
    }, [dreams]);

    if (!trend) return null;

    const maxVal = Math.max(...trend.sparkData, 5);

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Sleep Quality Trend
            </h3>

            <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                    <p className="text-3xl font-bold text-day-accent dark:text-night-accent">{trend.recentAvg}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Recent Avg</p>
                </div>
                <div className={`flex items-center gap-1 text-sm ${trend.isImproving ? 'text-green-600' : trend.change < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend.isImproving ? "M5 15l7-7 7 7" : trend.change < 0 ? "M19 9l-7 7-7-7" : "M5 12h14"} />
                    </svg>
                    {Math.abs(trend.change).toFixed(1)}
                </div>
                <div className="text-center">
                    <p className="text-xl font-bold">{trend.overall}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Overall</p>
                </div>
            </div>

            {/* Sparkline */}
            <div className="flex items-end gap-1 h-12">
                {trend.sparkData.map((val, i) => (
                    <div
                        key={i}
                        className="flex-1 bg-day-accent/60 dark:bg-night-accent/60 rounded-t"
                        style={{ height: `${(val / maxVal) * 100}%` }}
                    />
                ))}
            </div>
            <p className="text-[10px] text-day-text-secondary dark:text-night-text-secondary text-center mt-1">Last 14 entries</p>
        </div>
    );
};
