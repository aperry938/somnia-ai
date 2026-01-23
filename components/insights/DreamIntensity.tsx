import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamIntensityProps {
    dreams: Dream[];
}

const INTENSITY_KEYWORDS = {
    high: ['intense', 'vivid', 'extremely', 'overwhelm', 'powerful', 'incredible', 'amazing', 'terrifying', 'absolutely', 'completely'],
    medium: ['clear', 'distinct', 'noticeable', 'fairly', 'quite', 'rather', 'somewhat'],
    low: ['vague', 'hazy', 'unclear', 'faint', 'barely', 'slightly', 'dim', 'muted', 'fuzzy']
};

export const DreamIntensity: React.FC<DreamIntensityProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 3) return null;

        let high = 0, medium = 0, low = 0;

        dreams.forEach(d => {
            const text = (d.dreamText || '').toLowerCase();
            if (INTENSITY_KEYWORDS.high.some(kw => text.includes(kw))) high++;
            else if (INTENSITY_KEYWORDS.low.some(kw => text.includes(kw))) low++;
            else medium++;
        });

        const total = dreams.length;
        const highPct = Math.round((high / total) * 100);
        const lowPct = Math.round((low / total) * 100);
        // Ensure percentages sum to 100 by calculating medium as remainder
        const mediumPct = 100 - highPct - lowPct;

        // Determine dominant: compare raw counts, not percentages
        let dominant: 'High' | 'Medium' | 'Low' = 'Medium';
        if (high >= medium && high >= low) dominant = 'High';
        else if (low >= medium && low >= high) dominant = 'Low';

        return {
            high: highPct,
            medium: Math.max(0, mediumPct), // Ensure non-negative due to rounding
            low: lowPct,
            dominant
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Intensity</h3>

            <div className="text-center mb-3">
                <span className={`text-2xl font-bold ${stats.dominant === 'High' ? 'text-red-500' : stats.dominant === 'Low' ? 'text-blue-500' : 'text-yellow-500'}`}>
                    {stats.dominant}
                </span>
                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Typical intensity</p>
            </div>

            <div className="flex h-4 rounded-full overflow-hidden">
                <div className="bg-red-500" style={{ width: `${stats.high}%` }} title={`High: ${stats.high}%`} />
                <div className="bg-yellow-500" style={{ width: `${stats.medium}%` }} title={`Medium: ${stats.medium}%`} />
                <div className="bg-blue-500" style={{ width: `${stats.low}%` }} title={`Low: ${stats.low}%`} />
            </div>

            <div className="flex justify-between text-xs mt-1 text-day-text-secondary dark:text-night-text-secondary">
                <span>High {stats.high}%</span>
                <span>Medium {stats.medium}%</span>
                <span>Low {stats.low}%</span>
            </div>
        </div>
    );
};
