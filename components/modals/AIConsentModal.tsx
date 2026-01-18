import React, { useEffect } from 'react';
import { useBackButton } from '../../hooks/useBackButton';

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
    // Hardware back button support
    useBackButton(true, onDecline);

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
                className="w-full max-w-sm bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <h2 id="consent-title" className="font-serif text-xl font-bold text-day-text-primary dark:text-night-text-primary">
                        Ready to Analyze
                    </h2>
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mt-2">
                        Your dream will be processed by Google's AI to generate your personalized analysis.
                    </p>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-day-border dark:border-night-border space-y-2">
                    <button
                        onClick={handleConsent}
                        className="w-full py-3 min-h-[48px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
                    >
                        Continue
                    </button>
                    <button
                        onClick={onDecline}
                        className="w-full py-2 min-h-[44px] text-day-text-secondary dark:text-night-text-secondary text-sm hover:text-day-text-primary dark:hover:text-night-text-primary transition-colors"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
};
