import React, { useMemo } from 'react';
import { Dream, DreamMood } from '../../types';

interface MoodTrackerProps {
    dreams: Dream[];
}

// SVG icon components for moods
const MoodIcon: React.FC<{ mood: DreamMood; className?: string }> = ({ mood, className = "h-5 w-5" }) => {
    const icons: Record<DreamMood, React.ReactNode> = {
        joyful: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        peaceful: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
        ),
        anxious: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        sad: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        fearful: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        confused: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        neutral: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h8M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };
    return <>{icons[mood]}</>;
};

const MOOD_CONFIG: Record<DreamMood, { label: string; color: string }> = {
    joyful: { label: 'Joyful', color: 'bg-yellow-400' },
    peaceful: { label: 'Peaceful', color: 'bg-green-400' },
    anxious: { label: 'Anxious', color: 'bg-orange-400' },
    sad: { label: 'Sad', color: 'bg-blue-400' },
    fearful: { label: 'Fearful', color: 'bg-purple-500' },
    confused: { label: 'Confused', color: 'bg-gray-400' },
    neutral: { label: 'Neutral', color: 'bg-slate-400' },
};

const ALL_MOODS: DreamMood[] = ['joyful', 'peaceful', 'anxious', 'sad', 'fearful', 'confused', 'neutral'];

/**
 * Visualizes emotional patterns across dreams over time.
 * Shows mood distribution and recent mood trend.
 */
export const MoodTracker: React.FC<MoodTrackerProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        const dreamsWithMood = dreams.filter(d => d.mood);
        if (dreamsWithMood.length < 3) return null;

        // Count mood occurrences
        const counts: Record<DreamMood, number> = {
            joyful: 0, peaceful: 0, anxious: 0, sad: 0, fearful: 0, confused: 0, neutral: 0
        };

        dreamsWithMood.forEach(d => {
            if (d.mood) counts[d.mood]++;
        });

        // Calculate percentages
        const total = dreamsWithMood.length;
        const distribution = ALL_MOODS.map(mood => ({
            mood,
            count: counts[mood],
            percent: Math.round((counts[mood] / total) * 100)
        })).filter(m => m.count > 0).sort((a, b) => b.count - a.count);

        // Get dominant mood
        const dominant = distribution[0]?.mood || 'neutral';

        // Recent trend (last 7 dreams with mood)
        const recent = dreamsWithMood
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 7);

        return {
            total,
            distribution,
            dominant,
            recent
        };
    }, [dreams]);

    if (!stats) {
        // Show helpful empty state for new users
        return (
            <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 dark:border-purple-500/30 rounded-xl p-4">
                <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Dream Mood Patterns
                </h3>
                <div className="text-center py-4 text-day-text-secondary dark:text-night-text-secondary">
                    <p className="text-sm">Log 3+ dreams with mood to unlock patterns</p>
                    <p className="text-xs mt-1 opacity-70">Select a mood when recording dreams</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 dark:border-purple-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Dream Mood Patterns
            </h3>

            {/* Dominant Mood */}
            <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 text-day-accent dark:text-night-accent">
                    <MoodIcon mood={stats.dominant} className="h-10 w-10" />
                </div>
                <div className="text-sm mt-1">
                    Dominant mood: <span className="font-medium">{MOOD_CONFIG[stats.dominant].label}</span>
                </div>
            </div>

            {/* Distribution Bars */}
            <div className="space-y-2 mb-4">
                {stats.distribution.slice(0, 4).map(({ mood, count, percent }) => (
                    <div key={mood}>
                        <div className="flex justify-between text-xs mb-0.5">
                            <span className="flex items-center gap-1">
                                <MoodIcon mood={mood} className="h-4 w-4" />
                                <span>{MOOD_CONFIG[mood].label}</span>
                            </span>
                            <span className="text-day-text-secondary dark:text-night-text-secondary">
                                {count} ({percent}%)
                            </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${MOOD_CONFIG[mood].color} rounded-full transition-all`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Trend */}
            <div className="flex justify-center gap-1 pt-2 border-t border-day-border dark:border-night-border">
                <span className="text-xs text-day-text-secondary dark:text-night-text-secondary mr-2">Recent:</span>
                {stats.recent.map((dream, i) => (
                    <span
                        key={dream.id}
                        className="w-5 h-5 hover:scale-125 transition-transform cursor-default text-day-accent dark:text-night-accent"
                        style={{ opacity: 1 - (i * 0.1) }}
                        title={`${new Date(dream.timestamp).toLocaleDateString()}: ${MOOD_CONFIG[dream.mood!].label}`}
                    >
                        <MoodIcon mood={dream.mood!} className="h-5 w-5" />
                    </span>
                ))}
            </div>

            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary mt-2">
                Based on {stats.total} dreams with mood data
            </p>
        </div>
    );
};
