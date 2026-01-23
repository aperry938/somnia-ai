import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface SleepQualityVsDreamsProps {
    dreams: Dream[];
}

export const SleepQualityVsDreams: React.FC<SleepQualityVsDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        const withQuality = dreams.filter(d => d.sleepQuality !== null && d.sleepQuality !== undefined);
        if (withQuality.length < 5) return null;

        const qualityGroups: { low: number[]; medium: number[]; high: number[] } = { low: [], medium: [], high: [] };

        withQuality.forEach(d => {
            const words = d.dreamText.split(/\s+/).length;
            if (d.sleepQuality! <= 2) qualityGroups.low.push(words);
            else if (d.sleepQuality! <= 4) qualityGroups.medium.push(words);
            else qualityGroups.high.push(words);
        });

        const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

        return {
            lowAvg: avg(qualityGroups.low),
            mediumAvg: avg(qualityGroups.medium),
            highAvg: avg(qualityGroups.high),
            lowCount: qualityGroups.low.length,
            mediumCount: qualityGroups.medium.length,
            highCount: qualityGroups.high.length
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Sleep Quality vs Dream Detail</h3>

            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-red-500/10 rounded-lg">
                    <div className="text-lg font-bold text-red-500">{stats.lowAvg}</div>
                    <div className="text-[10px] text-day-text-secondary dark:text-night-text-secondary">Poor Sleep</div>
                    <div className="text-[10px] text-day-text-secondary dark:text-night-text-secondary">({stats.lowCount})</div>
                </div>
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <div className="text-lg font-bold text-yellow-500">{stats.mediumAvg}</div>
                    <div className="text-[10px] text-day-text-secondary dark:text-night-text-secondary">OK Sleep</div>
                    <div className="text-[10px] text-day-text-secondary dark:text-night-text-secondary">({stats.mediumCount})</div>
                </div>
                <div className="p-2 bg-green-500/10 rounded-lg">
                    <div className="text-lg font-bold text-green-500">{stats.highAvg}</div>
                    <div className="text-[10px] text-day-text-secondary dark:text-night-text-secondary">Good Sleep</div>
                    <div className="text-[10px] text-day-text-secondary dark:text-night-text-secondary">({stats.highCount})</div>
                </div>
            </div>

            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary mt-2">Avg words per dream</p>
        </div>
    );
});
