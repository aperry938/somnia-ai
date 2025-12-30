import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface SeasonalPatternProps {
    dreams: Dream[];
}

const SEASONS = ['Winter', 'Spring', 'Summer', 'Fall'];
const getSeasonFromMonth = (month: number): number => {
    if (month >= 2 && month <= 4) return 1; // Spring
    if (month >= 5 && month <= 7) return 2; // Summer
    if (month >= 8 && month <= 10) return 3; // Fall
    return 0; // Winter
};

export const SeasonalPattern: React.FC<SeasonalPatternProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 10) return null;

        const seasonCounts = [0, 0, 0, 0];
        const seasonWords = [0, 0, 0, 0];

        dreams.forEach(d => {
            const month = new Date(d.timestamp).getMonth();
            const season = getSeasonFromMonth(month);
            seasonCounts[season]++;
            seasonWords[season] += d.dreamText.split(/\s+/).length;
        });

        const seasonAvgWords = seasonCounts.map((c, i) => c > 0 ? Math.round(seasonWords[i] / c) : 0);
        const maxIndex = seasonAvgWords.indexOf(Math.max(...seasonAvgWords));

        return { seasonCounts, seasonAvgWords, mostVividSeason: SEASONS[maxIndex] };
    }, [dreams]);

    if (!stats) return null;

    const maxCount = Math.max(...stats.seasonCounts, 1);

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Seasonal Patterns</h3>

            <div className="grid grid-cols-4 gap-2">
                {SEASONS.map((season, i) => (
                    <div key={season} className="text-center">
                        <div
                            className="h-12 bg-day-accent/20 dark:bg-night-accent/20 rounded mb-1 flex items-end justify-center"
                        >
                            <div
                                className="w-full bg-day-accent dark:bg-night-accent rounded"
                                style={{ height: `${(stats.seasonCounts[i] / maxCount) * 100}%` }}
                            />
                        </div>
                        <div className="text-xs">{season}</div>
                        <div className="text-[10px] text-day-text-secondary dark:text-night-text-secondary">{stats.seasonCounts[i]}</div>
                    </div>
                ))}
            </div>

            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary mt-3">
                Most vivid dreams in <span className="font-bold text-day-accent dark:text-night-accent">{stats.mostVividSeason}</span>
            </p>
        </div>
    );
};
