import React, { useMemo } from 'react';
import { Dream } from '../../types';
import { predictTomorrowsMood, MoodPrediction } from '../../services/predictiveService';

interface PredictiveInsightCardProps {
    dreams: Dream[];
}

/** Map mood labels to representative display values */
const MOOD_DISPLAY: Record<string, { color: string; bg: string }> = {
    Joyful: { color: 'text-amber-500', bg: 'bg-amber-500/10' },
    Peaceful: { color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    Anxious: { color: 'text-orange-500', bg: 'bg-orange-500/10' },
    Sad: { color: 'text-blue-500', bg: 'bg-blue-500/10' },
    Fearful: { color: 'text-red-500', bg: 'bg-red-500/10' },
    Confused: { color: 'text-purple-500', bg: 'bg-purple-500/10' },
    Neutral: { color: 'text-gray-500', bg: 'bg-gray-500/10' },
    Nostalgic: { color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    Hopeful: { color: 'text-teal-500', bg: 'bg-teal-500/10' },
    Nightmare: { color: 'text-red-600', bg: 'bg-red-600/10' },
};

const CONFIDENCE_BARS: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
};

const TREND_ICON: Record<string, { path: string; color: string; label: string }> = {
    improving: {
        path: 'M5 15l7-7 7 7',
        color: 'text-green-500',
        label: 'Improving',
    },
    stable: {
        path: 'M5 12h14',
        color: 'text-gray-500',
        label: 'Stable',
    },
    declining: {
        path: 'M19 9l-7 7-7-7',
        color: 'text-red-500',
        label: 'Declining',
    },
};

export const PredictiveInsightCard: React.FC<PredictiveInsightCardProps> = React.memo(({ dreams }) => {
    const prediction: MoodPrediction | null = useMemo(
        () => predictTomorrowsMood(dreams),
        [dreams]
    );

    // Not enough data state
    if (!prediction) {
        // Count dreams in last 14 days
        const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const recentCount = dreams.filter(d => new Date(d.timestamp).getTime() >= cutoff).length;

        if (recentCount < 3 || dreams.length < 3) {
            return (
                <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
                    <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Mood Prediction
                    </h3>
                    <div className="text-center py-4">
                        <p className="text-day-text-secondary dark:text-night-text-secondary text-sm">
                            Not enough data yet
                        </p>
                        <p className="text-xs text-day-text-secondary/60 dark:text-night-text-secondary/60 mt-1">
                            Log at least 3 dreams in the last 14 days for predictions
                        </p>
                    </div>
                </div>
            );
        }

        return null;
    }

    const moodStyle = MOOD_DISPLAY[prediction.predictedMood] || { color: 'text-day-accent dark:text-night-accent', bg: 'bg-day-accent/10 dark:bg-night-accent/10' };
    const confidenceFill = CONFIDENCE_BARS[prediction.confidence] || 1;
    const trend = TREND_ICON[prediction.sleepQualityTrend] || TREND_ICON.stable;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Mood Prediction
            </h3>

            {/* Predicted Mood */}
            <div className={`rounded-lg p-3 mb-3 ${moodStyle.bg}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Tomorrow's predicted mood</p>
                        <p className={`text-xl font-bold ${moodStyle.color}`}>{prediction.predictedMood}</p>
                    </div>
                    {/* Sleep Quality Trend */}
                    <div className="flex items-center gap-1" aria-label={`Sleep quality trend: ${trend?.label ?? 'stable'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${trend?.color ?? 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend?.path ?? 'M5 12h14'} />
                        </svg>
                        <span className={`text-xs ${trend?.color ?? 'text-gray-500'}`}>{trend?.label ?? 'Stable'}</span>
                    </div>
                </div>
            </div>

            {/* Confidence Meter */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">Confidence:</span>
                <div className="flex gap-1" aria-label={`Confidence: ${prediction.confidence}`}>
                    {[1, 2, 3].map(i => (
                        <div
                            key={i}
                            className={`w-6 h-1.5 rounded-full ${
                                i <= confidenceFill
                                    ? 'bg-day-accent dark:bg-night-accent'
                                    : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                        />
                    ))}
                </div>
                <span className="text-xs text-day-text-secondary dark:text-night-text-secondary capitalize">{prediction.confidence}</span>
            </div>

            {/* Contributing Factors */}
            {prediction.factors.length > 0 && (
                <div className="mb-3">
                    <p className="text-xs font-medium text-day-text-secondary dark:text-night-text-secondary mb-1.5">Contributing factors</p>
                    <ul className="space-y-1" role="list">
                        {prediction.factors.map((factor, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-day-text-secondary dark:text-night-text-secondary">
                                <span className="text-day-accent dark:text-night-accent mt-0.5 flex-shrink-0" aria-hidden="true">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                {factor}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Recommendation */}
            <div className="bg-white/30 dark:bg-black/20 rounded-lg p-2.5">
                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary italic">
                    {prediction.recommendation}
                </p>
            </div>
        </div>
    );
});
