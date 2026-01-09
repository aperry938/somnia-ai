import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface EmotionalJourneyProps {
    dreams: Dream[];
}

const EMOTION_CATEGORIES = {
    positive: ['happy', 'joy', 'love', 'peace', 'calm', 'excited', 'wonderful', 'amazing', 'beautiful'],
    negative: ['sad', 'angry', 'fear', 'scary', 'anxious', 'worried', 'upset', 'frustrated', 'terrible'],
    neutral: ['normal', 'usual', 'ordinary', 'simple', 'plain']
};

export const EmotionalJourney: React.FC<EmotionalJourneyProps> = ({ dreams }) => {
    const journey = useMemo(() => {
        if (dreams.length < 10) return null;

        const data = dreams.slice(0, 14).reverse().map((d, i) => {
            const text = d.dreamText.toLowerCase();
            let score = 0;
            EMOTION_CATEGORIES.positive.forEach(kw => { if (text.includes(kw)) score += 1; });
            EMOTION_CATEGORIES.negative.forEach(kw => { if (text.includes(kw)) score -= 1; });
            return { index: i, score, date: new Date(d.timestamp) };
        });

        const avgScore = data.reduce((s, d) => s + d.score, 0) / data.length;
        const lastScore = data[data.length - 1]?.score ?? 0;
        const firstScore = data[0]?.score ?? 0;
        const trend = lastScore > firstScore ? 'improving' : lastScore < firstScore ? 'declining' : 'stable';

        return { data, avgScore, trend };
    }, [dreams]);

    if (!journey) return null;

    const maxAbs = Math.max(...journey.data.map(d => Math.abs(d.score)), 1);

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Emotional Journey</h3>

            <div className="relative h-20">
                <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-300 dark:bg-gray-600" />
                <div className="flex items-center justify-between h-full">
                    {journey.data.map(({ index, score }) => (
                        <div
                            key={index}
                            className="flex flex-col items-center"
                            style={{ transform: `translateY(${(-score / maxAbs) * 35}px)` }}
                        >
                            <div className={`w-2 h-2 rounded-full ${score > 0 ? 'bg-green-500' : score < 0 ? 'bg-red-500' : 'bg-gray-400'}`} />
                        </div>
                    ))}
                </div>
            </div>

            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary mt-2">
                Trend: <span className={journey.trend === 'improving' ? 'text-green-500' : journey.trend === 'declining' ? 'text-red-500' : 'text-gray-500'}>{journey.trend}</span>
            </p>
        </div>
    );
};
