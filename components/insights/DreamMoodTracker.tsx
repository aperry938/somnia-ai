import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface MoodTrackerProps {
    dreams: Dream[];
}

const MOOD_KEYWORDS: Record<string, string[]> = {
    'Joyful': ['happy', 'joy', 'laugh', 'smile', 'excited', 'celebration', 'love', 'wonderful', 'amazing', 'beautiful', 'great'],
    'Anxious': ['anxious', 'worried', 'nervous', 'stress', 'panic', 'fear', 'scared', 'afraid', 'terror', 'chase', 'running away', 'late', 'exam'],
    'Peaceful': ['calm', 'peace', 'serene', 'quiet', 'relax', 'gentle', 'soft', 'float', 'drift', 'meadow', 'beach', 'sunset'],
    'Confused': ['confused', 'lost', 'strange', 'weird', 'bizarre', 'maze', 'searching', 'unknown', 'unfamiliar', 'disoriented'],
    'Sad': ['sad', 'cry', 'tears', 'grief', 'loss', 'miss', 'lonely', 'alone', 'dark', 'cold', 'abandon'],
    'Adventurous': ['adventure', 'explore', 'discover', 'journey', 'quest', 'flying', 'travel', 'mountain', 'forest', 'ocean', 'sky'],
    'Nightmare': ['nightmare', 'monster', 'demon', 'death', 'dying', 'killed', 'murder', 'blood', 'horror', 'trapped', 'scream', 'attacked', 'evil', 'haunted', 'ghost', 'hell']
};

const MOOD_COLORS: Record<string, string> = {
    'Joyful': 'from-yellow-400 to-orange-400',
    'Anxious': 'from-red-400 to-pink-500',
    'Peaceful': 'from-blue-400 to-cyan-400',
    'Confused': 'from-purple-400 to-indigo-500',
    'Sad': 'from-gray-400 to-slate-500',
    'Adventurous': 'from-green-400 to-emerald-500',
    'Nightmare': 'from-red-600 to-rose-800'
};

/**
 * Analyze dream text and detect mood keywords.
 */
const analyzeMood = (dreamText: string): Record<string, number> => {
    const text = dreamText.toLowerCase();
    const moods: Record<string, number> = {};

    Object.entries(MOOD_KEYWORDS).forEach(([mood, keywords]) => {
        let count = 0;
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = text.match(regex);
            if (matches) count += matches.length;
        });
        if (count > 0) moods[mood] = count;
    });

    return moods;
};

export const DreamMoodTracker: React.FC<MoodTrackerProps> = ({ dreams }) => {
    const moodData = useMemo(() => {
        if (dreams.length === 0) return { moods: {}, total: 0, dominant: null };

        const aggregated: Record<string, number> = {};

        dreams.forEach(dream => {
            const moods = analyzeMood(dream.dreamText);
            Object.entries(moods).forEach(([mood, count]) => {
                aggregated[mood] = (aggregated[mood] || 0) + count;
            });
        });

        const total = Object.values(aggregated).reduce((sum, n) => sum + n, 0);
        const sorted = Object.entries(aggregated).sort((a, b) => b[1] - a[1]);
        const dominant = sorted[0]?.[0] ?? null;

        return { moods: aggregated, total, dominant };
    }, [dreams]);

    if (dreams.length < 3 || moodData.total === 0) {
        return null;
    }

    const sortedMoods = Object.entries(moodData.moods)
        .sort((a, b) => b[1] - a[1]);

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Dream Mood Patterns
            </h3>

            {moodData.dominant && (
                <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-3">
                    Dominant mood: <span className="font-medium text-day-text-primary dark:text-night-text-primary">{moodData.dominant}</span>
                </p>
            )}

            <div className="space-y-2">
                {sortedMoods.slice(0, 5).map(([mood, count]) => {
                    const percentage = Math.round((count / moodData.total) * 100);
                    return (
                        <div key={mood}>
                            <div className="flex justify-between text-sm mb-1">
                                <span>{mood}</span>
                                <span className="text-day-text-secondary dark:text-night-text-secondary">{percentage}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${mood} mood: ${percentage}%`}>
                                <div
                                    className={`h-full bg-gradient-to-r ${MOOD_COLORS[mood] || 'from-gray-400 to-gray-500'} transition-all duration-500`}
                                    style={{ width: `${percentage}%` }}
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary text-center mt-3">
                Based on keyword analysis across {dreams.length} dreams
            </p>
        </div>
    );
};
