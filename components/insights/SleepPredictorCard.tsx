import React, { useState, useEffect } from 'react';
import { Dream, SleepPrediction, SleepAids, Biometrics } from '../../types';
import { predictSleepQuality } from '../../services/mlAnalyticsService';
import { isPremium } from '../../services/secureSubscriptionService';
import { PremiumBadge } from '../shared/PremiumBadge';

interface SleepPredictorCardProps {
    sleepAids?: SleepAids;
    biometrics?: Biometrics;
    recentDreams: Dream[];
}

export const SleepPredictorCard: React.FC<SleepPredictorCardProps> = ({
    sleepAids,
    biometrics,
    recentDreams
}) => {
    const [prediction, setPrediction] = useState<SleepPrediction | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const userIsPremium = isPremium();

    const handlePredict = async () => {
        if (!userIsPremium) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await predictSleepQuality(sleepAids, biometrics, recentDreams);
            setPrediction(result);
        } catch (e) {
            setError('Failed to generate prediction');
        } finally {
            setIsLoading(false);
        }
    };

    // Quality score to color
    const getQualityColor = (quality: number) => {
        if (quality >= 4) return 'text-green-400';
        if (quality >= 3) return 'text-yellow-400';
        if (quality >= 2) return 'text-orange-400';
        return 'text-red-400';
    };

    const getQualityLabel = (quality: number) => {
        if (quality >= 4.5) return 'Excellent';
        if (quality >= 3.5) return 'Good';
        if (quality >= 2.5) return 'Fair';
        if (quality >= 1.5) return 'Poor';
        return 'Very Poor';
    };

    return (
        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-serif text-xl">Tonight's Prediction</h3>
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                        AI-estimated sleep quality
                    </p>
                </div>
                {!userIsPremium && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        PRO
                    </span>
                )}
            </div>

            {prediction ? (
                <div className="space-y-4 animate-fadeIn">
                    {/* Main prediction */}
                    <div className="text-center py-4">
                        <div className={`text-6xl font-bold ${getQualityColor(prediction.predictedQuality)}`}>
                            {prediction.predictedQuality.toFixed(1)}
                        </div>
                        <div className="text-lg text-day-text-secondary dark:text-night-text-secondary">
                            {getQualityLabel(prediction.predictedQuality)}
                        </div>
                        <div className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-1">
                            {Math.round(prediction.confidence * 100)}% confidence
                        </div>
                    </div>

                    {/* Rationale */}
                    <p className="text-sm text-center text-day-text-secondary dark:text-night-text-secondary italic">
                        "{prediction.rationale}"
                    </p>

                    {/* Factors */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Contributing Factors</h4>
                        {prediction.factors.slice(0, 4).map((factor, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 text-sm"
                            >
                                <span className={`w-2 h-2 rounded-full ${factor.impact === 'positive' ? 'bg-green-500' :
                                        factor.impact === 'negative' ? 'bg-red-500' : 'bg-gray-500'
                                    }`} />
                                <span className="flex-1">{factor.factor}</span>
                                <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                    {factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : '○'}
                                    {Math.round(factor.weight * 100)}%
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Recommendations */}
                    {prediction.recommendations.length > 0 && (
                        <div className="bg-white/5 rounded-lg p-3">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Improve Tonight
                            </h4>
                            <ul className="space-y-1">
                                {prediction.recommendations.slice(0, 3).map((rec, i) => (
                                    <li key={i} className="text-xs text-day-text-secondary dark:text-night-text-secondary flex items-start gap-2">
                                        <span className="text-green-400 mt-0.5">•</span>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Re-predict button */}
                    <button
                        onClick={handlePredict}
                        disabled={isLoading}
                        className="w-full py-2 text-sm text-day-accent dark:text-night-accent hover:underline"
                    >
                        Refresh Prediction
                    </button>
                </div>
            ) : error ? (
                <div className="text-center py-4">
                    <p className="text-red-400 mb-2">{error}</p>
                    <button
                        onClick={handlePredict}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <PremiumBadge feature="sleep_prediction" className="w-full">
                    <button
                        onClick={handlePredict}
                        disabled={isLoading || !userIsPremium}
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Predicting...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                                Predict Tonight's Sleep
                            </>
                        )}
                    </button>
                </PremiumBadge>
            )}
        </div>
    );
};
