import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface PositiveNegativeRatioProps {
    dreams: Dream[];
}

const POSITIVE_KEYWORDS = ['happy', 'joy', 'love', 'peace', 'calm', 'beautiful', 'wonderful', 'fun', 'exciting', 'amazing', 'success', 'win', 'laugh', 'smile', 'comfort'];
const NEGATIVE_KEYWORDS = ['sad', 'angry', 'fear', 'scary', 'anxious', 'worried', 'nightmare', 'dark', 'death', 'chase', 'attack', 'fail', 'lose', 'cry', 'pain'];

export const PositiveNegativeRatio: React.FC<PositiveNegativeRatioProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let positive = 0, negative = 0;

        dreams.forEach(d => {
            const text = d.dreamText.toLowerCase();
            if (POSITIVE_KEYWORDS.some(kw => text.includes(kw))) positive++;
            if (NEGATIVE_KEYWORDS.some(kw => text.includes(kw))) negative++;
        });

        const total = positive + negative || 1;
        const ratio = positive / (negative || 1);

        return {
            positive,
            negative,
            positivePercent: Math.round((positive / total) * 100),
            negativePercent: Math.round((negative / total) * 100),
            ratio: ratio.toFixed(1),
            sentiment: ratio > 1.5 ? 'Positive' : ratio < 0.67 ? 'Negative' : 'Balanced'
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Sentiment</h3>

            <div className="text-center mb-3">
                <span className={`text-xl font-bold ${stats.sentiment === 'Positive' ? 'text-green-500' : stats.sentiment === 'Negative' ? 'text-red-500' : 'text-blue-500'}`}>
                    {stats.sentiment}
                </span>
                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">{stats.ratio}:1 positive ratio</p>
            </div>

            <div className="flex h-4 rounded-full overflow-hidden">
                <div className="bg-green-500" style={{ width: `${stats.positivePercent}%` }} />
                <div className="bg-red-500" style={{ width: `${stats.negativePercent}%` }} />
            </div>

            <div className="flex justify-between text-xs mt-1 text-day-text-secondary dark:text-night-text-secondary">
                <span>Positive ({stats.positive})</span>
                <span>Negative ({stats.negative})</span>
            </div>
        </div>
    );
};
