/**
 * Predictive Analytics Service
 *
 * Local, heuristic-based mood prediction using dream journal history.
 * No API calls — instant results from pattern detection on recent dreams.
 *
 * Analyzes:
 * 1. Mood frequencies over last 14 days
 * 2. Mood trend direction (improving, stable, declining)
 * 3. Day-of-week patterns
 * 4. Sleep quality correlation
 */

import { Dream, DreamMood } from '../types';
import { logger } from './logger';

export interface MoodPrediction {
    predictedMood: string;
    confidence: 'low' | 'medium' | 'high';
    factors: string[];
    sleepQualityTrend: 'improving' | 'stable' | 'declining';
    recommendation: string;
}

/** Maximum window of days to look back */
const LOOKBACK_DAYS = 14;

/** Mood labels for display */
const MOOD_LABELS: Record<DreamMood, string> = {
    joyful: 'Joyful',
    peaceful: 'Peaceful',
    anxious: 'Anxious',
    sad: 'Sad',
    fearful: 'Fearful',
    confused: 'Confused',
    neutral: 'Neutral',
    nostalgic: 'Nostalgic',
    hopeful: 'Hopeful',
    nightmare: 'Nightmare',
};

/** Mood keywords for text-based detection when explicit mood is not set */
const MOOD_KEYWORDS: Record<string, string[]> = {
    joyful: ['happy', 'joy', 'laugh', 'smile', 'excited', 'love', 'wonderful', 'amazing', 'cheerful'],
    peaceful: ['calm', 'peace', 'serene', 'quiet', 'relax', 'gentle', 'soft', 'tranquil'],
    anxious: ['anxious', 'worried', 'nervous', 'stress', 'panic', 'fear', 'scared', 'tense', 'uneasy'],
    sad: ['sad', 'cry', 'tears', 'grief', 'loss', 'miss', 'lonely', 'alone', 'depressed'],
    fearful: ['terror', 'horror', 'afraid', 'dread', 'frightened', 'scream', 'danger'],
    confused: ['confused', 'lost', 'strange', 'weird', 'bizarre', 'maze', 'searching', 'disoriented'],
    neutral: ['normal', 'ordinary', 'routine', 'mundane', 'everyday'],
    nostalgic: ['remember', 'childhood', 'memory', 'past', 'nostalgia', 'old', 'home'],
    hopeful: ['hope', 'future', 'bright', 'optimistic', 'wish', 'aspire', 'dream'],
    nightmare: ['nightmare', 'monster', 'demon', 'death', 'horror', 'trapped', 'chase'],
};

/** Recommendations based on predicted mood and sleep quality trend */
const RECOMMENDATIONS: Record<string, Record<string, string>> = {
    improving: {
        joyful: 'Your patterns are on an upswing. Keep the momentum going with your current routine.',
        peaceful: 'Sleep quality is improving and your dreams reflect that calm. A good night ahead.',
        anxious: 'Though anxiety appears in your dreams, your sleep quality is trending up. Try a brief wind-down routine.',
        sad: 'Sleep is getting better despite some heavy dreams. Journaling before bed may help process these feelings.',
        fearful: 'Your sleep quality is improving. Grounding exercises before sleep can help reduce unsettling dreams.',
        confused: 'Things are looking up. A consistent bedtime could help bring more clarity to your dreams.',
        neutral: 'Steady improvement. Your routine seems to be working well.',
        nostalgic: 'Good trajectory. Let those reflective dreams inform your waking life gently.',
        hopeful: 'Everything is aligning well. Your optimism is reflected in improving sleep.',
        nightmare: 'Sleep quality is improving even through difficult dreams. Keep up your pre-sleep routine.',
    },
    stable: {
        joyful: 'Consistent positive dreams. Your sleep routine is serving you well.',
        peaceful: 'A steady, peaceful pattern. Maintain your current habits.',
        anxious: 'Anxiety patterns are persistent. Consider adding a relaxation exercise before bed.',
        sad: 'Persistent sadness in dreams. A guided meditation or calming soundscape may help shift the pattern.',
        fearful: 'Recurring fearful themes suggest unresolved stress. A brief mindfulness session before sleep could help.',
        confused: 'Steady but confused dreams. Try writing down your thoughts before bed for clarity.',
        neutral: 'Your dream life is stable. A great foundation to build on.',
        nostalgic: 'Consistent nostalgic themes. These reflective periods can be valuable for self-understanding.',
        hopeful: 'A stable, hopeful outlook. Good conditions for quality sleep tonight.',
        nightmare: 'Recurring difficult dreams. Progressive muscle relaxation before bed may help.',
    },
    declining: {
        joyful: 'Despite positive dreams, sleep quality is dipping. Check your sleep environment and habits.',
        peaceful: 'Your dreams are calm but sleep quality is slipping. Review your bedtime routine.',
        anxious: 'Rising anxiety in dreams paired with declining sleep. Prioritize wind-down time tonight.',
        sad: 'A tough stretch. Be gentle with yourself and consider a calming soundscape for sleep.',
        fearful: 'Difficult patterns emerging. A guided breathing exercise before bed may help stabilize things.',
        confused: 'Increasing confusion in dreams may reflect daytime stress. Try to simplify your evening routine.',
        neutral: 'Sleep quality is trending down. Small adjustments to your routine could help reverse this.',
        nostalgic: 'Quality dipping alongside reflective dreams. Ground yourself in the present before bed.',
        hopeful: 'Quality declining despite hopeful dreams. Focus on sleep hygiene fundamentals.',
        nightmare: 'A difficult period. Reach out to your support system and prioritize self-care tonight.',
    },
};

/**
 * Detect the mood of a dream, using the explicit mood field first,
 * then falling back to keyword analysis of dream text.
 */
function detectMood(dream: Dream): string | null {
    // Use explicit mood if available
    if (dream.mood) return dream.mood;

    // Fall back to keyword analysis
    const text = (dream.dreamText || '').toLowerCase();
    if (!text) return null;

    let bestMood: string | null = null;
    let bestScore = 0;

    for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
        let score = 0;
        for (const kw of keywords) {
            if (text.includes(kw)) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            bestMood = mood;
        }
    }

    return bestScore >= 1 ? bestMood : null;
}

/**
 * Compute the sleep quality trend from a list of dreams.
 * Compares the average of the recent half to the earlier half.
 */
function computeSleepQualityTrend(dreams: Dream[]): 'improving' | 'stable' | 'declining' {
    const withQuality = dreams.filter(d => d.sleepQuality !== null && d.sleepQuality !== undefined);
    if (withQuality.length < 4) return 'stable';

    const mid = Math.floor(withQuality.length / 2);
    const recentHalf = withQuality.slice(0, mid);
    const olderHalf = withQuality.slice(mid);

    const recentAvg = recentHalf.reduce((s, d) => s + (d.sleepQuality || 0), 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((s, d) => s + (d.sleepQuality || 0), 0) / olderHalf.length;

    const diff = recentAvg - olderAvg;
    if (diff > 0.3) return 'improving';
    if (diff < -0.3) return 'declining';
    return 'stable';
}

/**
 * Predict tomorrow's mood based on dream journal history.
 *
 * @param dreams - All dreams, sorted newest first
 * @returns MoodPrediction or null if insufficient data
 */
export function predictTomorrowsMood(dreams: Dream[]): MoodPrediction | null {
    if (!Array.isArray(dreams)) {
        logger.warn('[Predictive] Invalid dreams array');
        return null;
    }

    if (dreams.length < 3) return null;

    try {
        // Filter to last 14 days
        const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
        const recentDreams = dreams.filter(d => new Date(d.timestamp).getTime() >= cutoff);

        if (recentDreams.length < 3) return null;

        const factors: string[] = [];

        // 1. Extract mood frequencies
        const moodCounts: Record<string, number> = {};
        for (const dream of recentDreams) {
            const mood = detectMood(dream);
            if (mood) {
                moodCounts[mood] = (moodCounts[mood] || 0) + 1;
            }
        }

        const sortedMoods = Object.entries(moodCounts)
            .sort((a, b) => b[1] - a[1]);

        if (sortedMoods.length === 0) return null;

        const topMood = sortedMoods[0]![0];
        const topMoodCount = sortedMoods[0]![1];
        const topMoodLabel = MOOD_LABELS[topMood as DreamMood] || topMood;

        factors.push(
            `${topMoodLabel} has been your dominant mood (${topMoodCount} of ${recentDreams.length} dreams)`
        );

        // 2. Detect mood trend (compare first half vs second half)
        const dreamsWithMood = recentDreams
            .map(d => ({ dream: d, mood: detectMood(d) }))
            .filter(d => d.mood !== null);

        if (dreamsWithMood.length >= 4) {
            const mid = Math.floor(dreamsWithMood.length / 2);
            const recentMoods = dreamsWithMood.slice(0, mid);
            const olderMoods = dreamsWithMood.slice(mid);

            const positiveMoods = new Set(['joyful', 'peaceful', 'hopeful', 'nostalgic']);
            const recentPositiveRate = recentMoods.filter(d => positiveMoods.has(d.mood!)).length / recentMoods.length;
            const olderPositiveRate = olderMoods.filter(d => positiveMoods.has(d.mood!)).length / olderMoods.length;

            const rateDiff = recentPositiveRate - olderPositiveRate;
            if (rateDiff > 0.15) {
                factors.push('Your emotional tone has been trending more positive recently');
            } else if (rateDiff < -0.15) {
                factors.push('Your emotional tone has been trending less positive recently');
            } else {
                factors.push('Your emotional patterns have been consistent');
            }
        }

        // 3. Day-of-week pattern
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDay = tomorrow.getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const sameDayDreams = dreams
            .filter(d => new Date(d.timestamp).getDay() === tomorrowDay)
            .slice(0, 10);

        if (sameDayDreams.length >= 3) {
            const dayMoodCounts: Record<string, number> = {};
            for (const dream of sameDayDreams) {
                const mood = detectMood(dream);
                if (mood) {
                    dayMoodCounts[mood] = (dayMoodCounts[mood] || 0) + 1;
                }
            }
            const dayTopMood = Object.entries(dayMoodCounts)
                .sort((a, b) => b[1] - a[1])[0];

            if (dayTopMood) {
                const dayMoodLabel = MOOD_LABELS[dayTopMood[0] as DreamMood] || dayTopMood[0];
                factors.push(
                    `On ${dayNames[tomorrowDay] ?? 'this day'}, you tend to feel ${dayMoodLabel.toLowerCase()}`
                );
            }
        }

        // 4. Sleep quality correlation
        const sleepQualityTrend = computeSleepQualityTrend(recentDreams);
        if (sleepQualityTrend === 'improving') {
            factors.push('Your sleep quality has been improving');
        } else if (sleepQualityTrend === 'declining') {
            factors.push('Your sleep quality has been declining');
        }

        // 5. Confidence based on data quantity
        let confidence: 'low' | 'medium' | 'high';
        if (recentDreams.length > 10) {
            confidence = 'high';
        } else if (recentDreams.length >= 5) {
            confidence = 'medium';
        } else {
            confidence = 'low';
        }

        // 6. Get recommendation
        const trendKey = sleepQualityTrend;
        const moodKey = topMood;
        const recommendation =
            RECOMMENDATIONS[trendKey]?.[moodKey] ||
            'Keep logging your dreams for more personalized insights.';

        return {
            predictedMood: topMoodLabel,
            confidence,
            factors,
            sleepQualityTrend,
            recommendation,
        };
    } catch (error) {
        logger.error('[Predictive] Error predicting mood:', error);
        return null;
    }
}
