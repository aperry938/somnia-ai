// components/modals/RealityCheckInfoModal.tsx
import React, { useEffect } from 'react';
import { REALITY_CHECKS } from '../../constants/lucidDreaming';

interface RealityCheckInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RealityCheckInfoModal: React.FC<RealityCheckInfoModalProps> = ({ isOpen, onClose }) => {
    // Handle Escape key to close modal
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reality-check-title"
        >
            <div
                className="w-full max-w-md bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-day-border dark:border-night-border">
                    <h2 id="reality-check-title" className="font-serif text-xl font-bold text-day-text-primary dark:text-night-text-primary">Reality Checks</h2>
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mt-1">
                        Train your mind to question reality throughout the day
                    </p>
                </div>

                {/* Content */}
                <div className="p-5 max-h-[60vh] overflow-y-auto">
                    {/* What are Reality Checks */}
                    <div className="mb-5 p-4 bg-day-accent/10 dark:bg-night-accent/10 rounded-xl">
                        <h3 className="font-medium text-sm text-day-accent dark:text-night-accent mb-2">What are Reality Checks?</h3>
                        <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                            Reality checks are tests you perform throughout the day to determine if you're dreaming.
                            By making this a habit, you'll eventually do them in dreams and become lucid!
                        </p>
                    </div>

                    {/* All Reality Checks */}
                    <h3 className="font-medium text-sm text-day-accent dark:text-night-accent mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        All Reality Checks
                    </h3>
                    <div className="space-y-3">
                        {REALITY_CHECKS.map((check, i) => (
                            <div key={i} className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                                <p className="font-medium text-sm text-day-text-primary dark:text-night-text-primary">{check.check}</p>
                                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-1">{check.description}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tips */}
                    <div className="mt-5 p-4 bg-amber-500/10 dark:bg-amber-500/10 rounded-xl border border-amber-500/20">
                        <h3 className="font-medium text-sm text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            Pro Tips
                        </h3>
                        <ul className="space-y-1 text-sm text-day-text-secondary dark:text-night-text-secondary">
                            <li>• Do reality checks 10-20 times daily</li>
                            <li>• Always question: "Am I dreaming?"</li>
                            <li>• Pair with triggers (doorways, mirrors)</li>
                            <li>• Be mindful, not mechanical</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-day-border dark:border-night-border">
                    <button
                        onClick={onClose}
                        aria-label="Close reality check info"
                        className="w-full py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};
