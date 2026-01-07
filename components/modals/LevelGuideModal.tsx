import React, { useEffect } from 'react';
import { LEVEL_TITLES, DREAMS_PER_LEVEL, getLevelTitle } from '../../constants/gamification';

interface LevelGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLevel: number;
    totalDreams: number;
}

const LEVEL_DESCRIPTIONS: Record<number, string> = {
    1: 'Beginning your journey',
    2: 'Becoming conscious of patterns',
    3: 'Sharpening your recall',
    4: 'The goal state of dream awareness',
    5: 'High definition dream clarity',
    6: 'Cutting through the noise',
    7: 'Extracting meaningful data',
    8: 'Peak dream performance',
    9: 'Total dream control',
    10: 'Complete synthesis of mind',
};

export const LevelGuideModal: React.FC<LevelGuideModalProps> = ({ isOpen, onClose, currentLevel, totalDreams }) => {
    // Handle escape key to close modal
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const levels = Object.entries(LEVEL_TITLES).map(([level, title]) => ({
        level: parseInt(level),
        title,
        description: LEVEL_DESCRIPTIONS[parseInt(level)],
        dreamsRequired: (parseInt(level) - 1) * DREAMS_PER_LEVEL,
    }));

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="level-guide-title"
        >
            <div
                className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 id="level-guide-title" className="font-serif text-2xl">Level Guide</h2>
                    <button
                        onClick={onClose}
                        aria-label="Close level guide"
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-4">
                    Earn 1 level for every {DREAMS_PER_LEVEL} dreams logged. You have {totalDreams} dreams.
                </p>

                <div className="space-y-2">
                    {levels.map(({ level, title, description, dreamsRequired }) => {
                        const isUnlocked = currentLevel >= level;
                        const isCurrent = currentLevel === level;

                        return (
                            <div
                                key={level}
                                className={`p-3 rounded-xl border transition-all ${isCurrent
                                        ? 'bg-day-accent/10 dark:bg-night-accent/10 border-day-accent dark:border-night-accent'
                                        : isUnlocked
                                            ? 'bg-white/50 dark:bg-white/5 border-day-border dark:border-night-border'
                                            : 'bg-gray-100/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 opacity-60'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? 'text-day-accent dark:text-night-accent' : 'text-day-text-secondary dark:text-night-text-secondary'
                                            }`}>
                                            Lvl {level}
                                        </span>
                                        <span className={`font-serif text-lg ${isUnlocked ? 'text-day-text-primary dark:text-night-text-primary' : 'text-gray-400'
                                            }`}>
                                            {title}
                                        </span>
                                        {isCurrent && (
                                            <span className="text-xs bg-day-accent dark:bg-night-accent text-white px-2 py-0.5 rounded-full">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    {isUnlocked ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    )}
                                </div>
                                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                    {description}
                                    {!isUnlocked && (
                                        <span className="ml-2 text-day-accent dark:text-night-accent">
                                            • {dreamsRequired} dreams required
                                        </span>
                                    )}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-5 py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-medium rounded-full hover:opacity-90 transition-opacity flex items-center justify-center"
                >
                    Close
                </button>
            </div>
        </div>
    );
};
