import React, { useState, useEffect } from 'react';
import { Dream, MLSentiment } from '../../types';
import { analyzeMLSentiment } from '../../services/mlAnalyticsService';
import { isPremium } from '../../services/secureSubscriptionService';
import { PremiumBadge } from '../shared/PremiumBadge';

interface MLSentimentCardProps {
    dream: Dream;
}

// Emotion color mapping
const EMOTION_COLORS: Record<string, string> = {
    joy: 'bg-yellow-500',
    happiness: 'bg-yellow-400',
    peace: 'bg-green-400',
    calm: 'bg-teal-400',
    wonder: 'bg-purple-400',
    excitement: 'bg-orange-400',
    fear: 'bg-red-500',
    anxiety: 'bg-red-400',
    sadness: 'bg-blue-500',
    melancholy: 'bg-blue-400',
    anger: 'bg-red-600',
    confusion: 'bg-gray-400',
    nostalgia: 'bg-amber-400',
    hope: 'bg-emerald-400',
    love: 'bg-pink-400',
};

const getEmotionColor = (emotion: string): string => {
    const key = emotion.toLowerCase();
    return EMOTION_COLORS[key] || 'bg-indigo-400';
};

export const MLSentimentCard: React.FC<MLSentimentCardProps> = ({ dream }) => {
    const [sentiment, setSentiment] = useState<MLSentiment | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const userIsPremium = isPremium();

    const handleAnalyze = async () => {
        if (!userIsPremium) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await analyzeMLSentiment(dream.dreamText);
            setSentiment(result);
        } catch (e) {
            setError('Failed to analyze sentiment');
        } finally {
            setIsLoading(false);
        }
    };

    // Valence/Arousal to position (for emotion wheel visualization)
    const getEmotionPosition = (valence: number, arousal: number) => ({
        left: `${50 + valence * 40}%`,
        top: `${50 - arousal * 40}%`
    });

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl">ML Sentiment Analysis</h3>
                {!userIsPremium && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        PRO
                    </span>
                )}
            </div>

            {sentiment ? (
                <div className="space-y-4 animate-fadeIn">
                    {/* Nuance Badge */}
                    <div className="text-center">
                        <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-full text-purple-300 font-medium italic">
                            "{sentiment.nuance}"
                        </span>
                    </div>

                    {/* Valence/Arousal Wheel */}
                    <div className="relative w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-green-500/20 via-gray-500/10 to-red-500/20 border border-white/10">
                        {/* Quadrant labels */}
                        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] text-day-text-secondary dark:text-night-text-secondary">Intense</span>
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-day-text-secondary dark:text-night-text-secondary">Calm</span>
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-day-text-secondary dark:text-night-text-secondary">-</span>
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-day-text-secondary dark:text-night-text-secondary">+</span>

                        {/* Position marker */}
                        <div
                            className="absolute w-4 h-4 bg-day-accent dark:bg-night-accent rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
                            style={getEmotionPosition(sentiment.valence, sentiment.arousal)}
                        />
                    </div>

                    {/* Emotions List */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-day-text-secondary dark:text-night-text-secondary">Detected Emotions</h4>
                        <div className="flex flex-wrap gap-2">
                            {sentiment.emotions.slice(0, 5).map((e, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10"
                                >
                                    <div className={`w-2 h-2 rounded-full ${getEmotionColor(e.emotion)}`} />
                                    <span className="text-sm capitalize">{e.emotion}</span>
                                    <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                        {Math.round(e.intensity * 100)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Confidence */}
                    <div className="flex items-center gap-2 text-xs text-day-text-secondary dark:text-night-text-secondary">
                        <span>Confidence:</span>
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                                style={{ width: `${sentiment.confidence * 100}%` }}
                            />
                        </div>
                        <span>{Math.round(sentiment.confidence * 100)}%</span>
                    </div>
                </div>
            ) : error ? (
                <div className="text-center py-4">
                    <p className="text-red-400 mb-2">{error}</p>
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <PremiumBadge feature="ml_sentiment" className="w-full">
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !userIsPremium}
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Analyze Sentiment
                            </>
                        )}
                    </button>
                </PremiumBadge>
            )}
        </div>
    );
};
