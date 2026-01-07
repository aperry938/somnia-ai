import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { calculateUserStats } from '../../services/userStatsService';

export const DailyBriefingWidget: React.FC = () => {
    const { dreams } = useAppContext();
    const stats = useMemo(() => calculateUserStats(dreams), [dreams]);
    const [showInfo, setShowInfo] = useState(false);

    const dreamsToNextLevel = Math.ceil((100 - stats.nextLevelProgress) / 20);

    return (
        <div className="mx-auto w-full max-w-sm mb-6 animate-fadeIn">
            <div
                className="bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 rounded-xl p-3 flex items-center justify-between shadow-sm cursor-pointer hover:bg-white/15 dark:hover:bg-black/25 transition-colors"
                onClick={() => setShowInfo(!showInfo)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowInfo(!showInfo); } }}
                aria-expanded={showInfo}
                aria-label={`Level ${stats.level} Oneironaut, ${stats.currentStreak} day streak. Click for more info`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-day-accent dark:text-night-accent">Level {stats.level}</p>
                        <p className="text-sm font-serif">Oneironaut</p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-orange-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                        </svg>
                        <span className="font-bold">{stats.currentStreak} Day Streak</span>
                    </div>
                </div>
            </div>
            {/* Progress bar to next level */}
            <div className="mt-1 h-1 w-full px-1" role="progressbar" aria-valuenow={stats.nextLevelProgress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to next level: ${stats.nextLevelProgress}%`}>
                <div className="h-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-day-accent dark:bg-night-accent rounded-full transition-all duration-500" style={{ width: `${stats.nextLevelProgress}%` }}></div>
                </div>
            </div>
            {/* Expandable Info */}
            {showInfo && (
                <div className="mt-2 px-3 py-2 bg-white/5 dark:bg-black/10 rounded-lg text-xs text-day-text-secondary dark:text-night-text-secondary animate-fadeIn">
                    <p className="mb-1"><strong className="text-day-accent dark:text-night-accent">Level:</strong> Earn 1 level for every 5 dreams logged. {dreamsToNextLevel > 0 ? `${dreamsToNextLevel} more to Level ${stats.level + 1}!` : 'Level up imminent!'}</p>
                    <p><strong className="text-orange-500">Streak:</strong> Consecutive days with dream entries. Keep journaling daily!</p>
                </div>
            )}
        </div>
    );
};
