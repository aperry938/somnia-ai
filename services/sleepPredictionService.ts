/**
 * Local Sleep Prediction Service
 *
 * Provides quick, local sleep quality predictions based on historical correlations.
 * Does NOT call AI APIs - uses simple heuristics for instant results.
 *
 * Mobile App Store Readiness:
 * - No network calls (fully local)
 * - Instant response time
 * - Memory efficient (limits history size)
 * - Input validation for all functions
 *
 * For ML-powered predictions with Gemini AI, use mlAnalyticsService.predictSleepQuality()
 */
import { Dream, SleepAids } from '../types';
import { logger } from './logger';

/** Maximum history size to process for performance */
const MAX_HISTORY_SIZE = 365;

/**
 * Local sleep prediction result (no API, instant)
 * Different from types.ts SleepPrediction which is for ML-based predictions
 */
export interface LocalSleepPrediction {
    predictedQuality: number; // 1-5 scale
    confidence: 'low' | 'medium' | 'high';
    factors: string[];
    recommendation: string;
}

/**
 * Predicts sleep quality based on historical data correlations.
 * Analyzes previous entries to find patterns between day context/sleep aids and sleep quality.
 *
 * @param currentContext - Current sleep preparation context
 * @param history - Historical dream data with sleep quality ratings
 * @returns Local prediction or null if insufficient data
 */
export const predictLocalSleepQuality = (
    currentContext: SleepAids,
    history: Dream[]
): LocalSleepPrediction | null => {
    // Input validation
    if (!currentContext || typeof currentContext !== 'object') {
        logger.warn('[SleepPrediction] Invalid currentContext');
        return null;
    }

    if (!Array.isArray(history)) {
        logger.warn('[SleepPrediction] Invalid history array');
        return null;
    }

    if (history.length < 3) return null; // Need some data

    try {
        // Limit history size for performance
        const limitedHistory = history.slice(0, MAX_HISTORY_SIZE);

        const relevantHistory = limitedHistory.filter(d =>
            d &&
            typeof d.sleepQuality === 'number' &&
            d.sleepQuality >= 1 &&
            d.sleepQuality <= 5 &&
            d.sleepAids
        );

        if (relevantHistory.length < 3) return null;

        let totalScore = 0;
        let factorCount = 0;
        const factors: string[] = [];
        let recommendation = "Maintain a consistent routine.";

        // 1. Analyze Day Rating impact
        if (currentContext.dayRating && typeof currentContext.dayRating === 'number') {
            const rating = currentContext.dayRating;
            if (rating >= 1 && rating <= 5) {
                const similarDays = relevantHistory.filter(d => d.sleepAids?.dayRating === rating);

                if (similarDays.length > 0) {
                    const avgQuality = similarDays.reduce((acc, d) => acc + (d.sleepQuality || 0), 0) / similarDays.length;
                    totalScore += avgQuality;
                    factorCount++;
                    factors.push(`On days rated ${rating}/5, you usually sleep ${avgQuality.toFixed(1)}/5.`);

                    if (rating < 3 && avgQuality < 3) {
                        recommendation = "Stressful days often impact your sleep. Try a guided relaxation tonight.";
                    }
                }
            }
        }

        // 2. Analyze Soundscape impact
        if (currentContext.sound && typeof currentContext.sound === 'string') {
            const soundName = currentContext.sound;
            const withSound = relevantHistory.filter(d => d.sleepAids?.sound === soundName);
            if (withSound.length > 0) {
                const avgQuality = withSound.reduce((acc, d) => acc + (d.sleepQuality || 0), 0) / withSound.length;
                totalScore += avgQuality;
                factorCount++;
                if (avgQuality >= 4) {
                    factors.push(`${soundName} is highly effective for you.`);
                } else {
                    factors.push(`History with ${soundName}: avg quality ${avgQuality.toFixed(1)}/5.`);
                }
            }
        }

        // Default baseline if no specific matches
        if (factorCount === 0) {
            // Just return average of last 5 nights
            const recent = relevantHistory.slice(0, 5);
            const avg = recent.reduce((acc, d) => acc + (d.sleepQuality || 0), 0) / recent.length;
            const clampedAvg = Math.max(1, Math.min(5, Math.round(avg)));
            return {
                predictedQuality: clampedAvg,
                confidence: 'low',
                factors: ['Based on recent average.'],
                recommendation: "Log more specific details (day rating, sounds) for better predictions."
            };
        }

        const predictedAvg = totalScore / factorCount;
        const clampedPrediction = Math.max(1, Math.min(5, Math.round(predictedAvg)));

        return {
            predictedQuality: clampedPrediction,
            confidence: factorCount > 1 ? 'medium' : 'low',
            factors,
            recommendation
        };
    } catch (error) {
        logger.error('[SleepPrediction] Error during prediction:', error);
        return null;
    }
};
