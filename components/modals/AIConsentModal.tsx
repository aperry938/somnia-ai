import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useBackButton } from '../../hooks/useBackButton';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { setAIConsent } from '../../services/aiConsentService';

// Re-export for backward compatibility
export { hasAIConsent, setAIConsent } from '../../services/aiConsentService';

interface AIConsentModalProps {
    onConsent: () => void;
    onDecline: () => void;
}

// Animation variants with 'as const' to preserve literal types for Framer Motion
const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
} as const;

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
    },
};

const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
        scale: 1,
        rotate: 0,
        transition: { type: 'spring' as const, stiffness: 200, damping: 15, delay: 0.1 },
    },
};

export const AIConsentModal: React.FC<AIConsentModalProps> = ({ onConsent, onDecline }) => {
    // Hardware back button support
    useBackButton(true, onDecline);

    // Focus trap for accessibility
    const modalRef = useRef<HTMLDivElement>(null);
    useFocusTrap(true, modalRef);

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
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 pt-4 pb-[calc(6.5rem+var(--safe-area-inset-bottom))] sm:pb-4 z-50"
            onClick={onDecline}
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-title"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div
                ref={modalRef}
                className="w-full max-w-sm bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                variants={modalVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header */}
                <div className="p-5 text-center">
                    <motion.div
                        className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
                        variants={iconVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </motion.div>
                    <h2 id="consent-title" className="font-serif text-xl font-bold text-day-text-primary dark:text-night-text-primary">
                        Ready to Analyze
                    </h2>
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mt-2">
                        Your dream will be processed by Google's AI to generate your personalized analysis.
                    </p>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-day-border dark:border-night-border space-y-2">
                    <motion.button
                        onClick={handleConsent}
                        className="w-full py-3 min-h-[48px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl transition-shadow"
                        whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)' }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                        Continue
                    </motion.button>
                    <motion.button
                        onClick={onDecline}
                        className="w-full py-2 min-h-[44px] text-day-text-secondary dark:text-night-text-secondary text-sm hover:text-day-text-primary dark:hover:text-night-text-primary transition-colors"
                        whileTap={{ scale: 0.98 }}
                    >
                        Not now
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};
