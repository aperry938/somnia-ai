// components/modals/TechniqueInfoModal.tsx
import React, { useEffect } from 'react';
import { LucidDreamTechnique } from '../../constants/lucidDreaming';

interface TechniqueInfoModalProps {
    technique: LucidDreamTechnique | null;
    onClose: () => void;
}

const DIFFICULTY_COLORS = {
    beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
    intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    advanced: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const TECHNIQUE_DETAILS: Record<string, { tips: string[]; timing: string; duration: string }> = {
    mild: {
        tips: [
            'Practice right before sleep when your mind is relaxed',
            'Use the same intention phrase each night for consistency',
            'Combine with dream journaling for best results',
            'Visualize a recent dream and imagine becoming lucid in it'
        ],
        timing: 'Every night before sleep',
        duration: '5-10 minutes'
    },
    wbtb: {
        tips: [
            'Do not look at screens during the wake period',
            'Keep lights dim to maintain melatonin levels',
            'Read about lucid dreaming during the wake period',
            'Set a gentle alarm that won\'t fully wake you'
        ],
        timing: '5-6 hours after falling asleep',
        duration: '20-60 minute wake period'
    },
    wild: {
        tips: [
            'Best attempted during a WBTB session, not at bedtime',
            'Focus on hypnagogic imagery (swirling colors, shapes)',
            'Don\'t try too hard - let the dream come to you',
            'Practice meditation to improve awareness skills'
        ],
        timing: 'During WBTB or afternoon naps',
        duration: 'Varies - typically 15-30 minutes'
    }
};

export const TechniqueInfoModal: React.FC<TechniqueInfoModalProps> = ({ technique, onClose }) => {
    // Handle Escape key to close modal
    useEffect(() => {
        if (!technique) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [technique, onClose]);

    if (!technique) return null;

    const details = TECHNIQUE_DETAILS[technique.id] || { tips: [], timing: 'Any time', duration: 'Varies' };
    const difficultyClass = DIFFICULTY_COLORS[technique.difficulty];

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="technique-title"
        >
            <div
                className="w-full max-w-md bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-day-border dark:border-night-border">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 id="technique-title" className="font-serif text-xl font-bold text-day-text-primary dark:text-night-text-primary">{technique.name}</h2>
                            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mt-1">{technique.description}</p>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full border ${difficultyClass}`}>
                            {technique.difficulty}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 max-h-[60vh] overflow-y-auto">
                    {/* Steps */}
                    <div className="mb-5">
                        <h3 className="font-medium text-sm text-day-accent dark:text-night-accent mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Step-by-Step
                        </h3>
                        <ol className="space-y-2">
                            {technique.steps.map((step, i) => (
                                <li key={i} className="flex gap-3 text-sm">
                                    <span className="flex-shrink-0 w-6 h-6 bg-day-accent/20 dark:bg-night-accent/20 text-day-accent dark:text-night-accent rounded-full flex items-center justify-center text-xs font-bold">
                                        {i + 1}
                                    </span>
                                    <span className="text-day-text-secondary dark:text-night-text-secondary">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </div>

                    {/* Timing Info */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Best Time</p>
                            <p className="text-sm font-medium">{details.timing}</p>
                        </div>
                        <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Duration</p>
                            <p className="text-sm font-medium">{details.duration}</p>
                        </div>
                    </div>

                    {/* Tips */}
                    <div>
                        <h3 className="font-medium text-sm text-day-accent dark:text-night-accent mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            Pro Tips
                        </h3>
                        <ul className="space-y-2">
                            {details.tips.map((tip, i) => (
                                <li key={i} className="flex gap-2 text-sm text-day-text-secondary dark:text-night-text-secondary">
                                    <span className="text-day-accent dark:text-night-accent">•</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-day-border dark:border-night-border">
                    <button
                        onClick={onClose}
                        aria-label="Close technique info"
                        className="w-full py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};
