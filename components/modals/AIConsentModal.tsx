import React, { useEffect } from 'react';

interface AIConsentModalProps {
    onConsent: () => void;
    onDecline: () => void;
}

const CONSENT_STORAGE_KEY = 'somnia_ai_consent_given';

export const hasAIConsent = (): boolean => {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
};

export const setAIConsent = (consented: boolean): void => {
    if (consented) {
        localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
    } else {
        localStorage.removeItem(CONSENT_STORAGE_KEY);
    }
};

export const AIConsentModal: React.FC<AIConsentModalProps> = ({ onConsent, onDecline }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onDecline();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onDecline]);

    const handleConsent = () => {
        setAIConsent(true);
        onConsent();
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={onDecline}
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-title"
        >
            <div
                className="w-full max-w-md bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-day-border dark:border-night-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 id="consent-title" className="font-serif text-xl font-bold text-day-text-primary dark:text-night-text-primary">AI Dream Analysis</h2>
                            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">Before we begin...</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5">
                    <p className="text-day-text-secondary dark:text-night-text-secondary mb-4">
                        To analyze your dream, Somnia will send your dream text to <strong>Google's Gemini AI</strong> for processing.
                    </p>

                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-3 text-sm">
                        <div className="flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-day-text-secondary dark:text-night-text-secondary">Your dream text and analysis context</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-day-text-secondary dark:text-night-text-secondary">Never your email, name, or personal identifiers</span>
                        </div>
                    </div>

                    <p className="text-xs text-day-text-secondary/70 dark:text-night-text-secondary/70 mt-4">
                        Per Google's API terms, prompts sent via the API are not used to train their models.{' '}
                        <a
                            href="https://ai.google.dev/gemini-api/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-day-accent dark:text-night-accent hover:underline"
                        >
                            Learn more
                        </a>
                    </p>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-day-border dark:border-night-border space-y-2">
                    <button
                        onClick={handleConsent}
                        className="w-full py-3 min-h-[48px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        I Understand, Continue
                    </button>
                    <button
                        onClick={onDecline}
                        className="w-full py-3 min-h-[48px] text-day-text-secondary dark:text-night-text-secondary font-medium rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
