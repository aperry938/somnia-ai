import React, { useMemo, useState } from 'react';
import { Dream } from '../../types';
import { getAllAchievementsWithStatus, checkAchievements } from '../../services/achievementService';
import { calculateUserStats } from '../../services/userStatsService';

interface AchievementsCardProps {
    dreams: Dream[];
}

interface AchievementWithStatus {
    id: string;
    name: string;
    description: string;
    key: string;
    earned: boolean;
    earnedAt: string | null;
}

// Achievement icons for each type
const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
    FIRST_DREAM: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
    ),
    TEN_DREAMS: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
    ),
    FIFTY_DREAMS: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
    ),
    WEEK_STREAK: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.657 7.343A8 8 0 0117.657 18.657z" />
        </svg>
    ),
    MONTH_STREAK: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
    ),
    LUCID_TAGGER: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    ),
};

export const AchievementsCard: React.FC<AchievementsCardProps> = ({ dreams }) => {
    const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithStatus | null>(null);

    // Check for new achievements on each render
    const stats = useMemo(() => calculateUserStats(dreams), [dreams]);

    // Check achievements (will earn new ones if criteria met)
    useMemo(() => {
        checkAchievements(dreams, stats);
    }, [dreams, stats]);

    const achievements = useMemo(() => getAllAchievementsWithStatus(), [dreams]);
    const earnedCount = achievements.filter(a => a.earned).length;

    return (
        <>
            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-serif text-2xl">Achievements</h2>
                    <span className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                        {earnedCount}/{achievements.length} unlocked
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {achievements.map(achievement => (
                        <button
                            key={achievement.key}
                            onClick={() => setSelectedAchievement(achievement as AchievementWithStatus)}
                            className={`relative p-3 rounded-lg text-center transition-all cursor-pointer hover:scale-105 ${achievement.earned
                                    ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-300 dark:border-amber-700'
                                    : 'bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 opacity-50 hover:opacity-75'
                                }`}
                        >
                            <div className={`flex justify-center mb-2 ${achievement.earned
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-gray-400 dark:text-gray-600'
                                }`}>
                                {ACHIEVEMENT_ICONS[achievement.key] || (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                )}
                            </div>
                            <p className="text-xs font-medium truncate">{achievement.name}</p>
                            {achievement.earned && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Achievement Detail Modal */}
            {selectedAchievement && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
                    onClick={() => setSelectedAchievement(null)}
                >
                    <div
                        className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                            selectedAchievement.earned
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                        }`}>
                            <div className="text-white scale-150">
                                {ACHIEVEMENT_ICONS[selectedAchievement.key] || (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <h3 className="font-serif text-xl mb-2">{selectedAchievement.name}</h3>
                        <p className="text-day-text-secondary dark:text-night-text-secondary mb-4">
                            {selectedAchievement.description}
                        </p>
                        {selectedAchievement.earned ? (
                            <div className="flex items-center justify-center gap-2 text-green-500 text-sm mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Unlocked!</span>
                            </div>
                        ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
                                Keep logging dreams to unlock this achievement
                            </p>
                        )}
                        <button
                            onClick={() => setSelectedAchievement(null)}
                            className="w-full py-2 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
