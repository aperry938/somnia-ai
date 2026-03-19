import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useBackButton } from '../../hooks/useBackButton';
import { SleepQualityRating } from '../shared/SleepQualityRating';
import { DreamMood } from '../../types';
import haptics from '../../services/hapticsService';
import { MOOD_ICONS, MOOD_LABELS } from '../../constants/uiIcons';
import { validateDreamText, INPUT_LIMITS } from '../../services/validationService';
import { backdropVariants, modalVariants } from '../shared/AnimatedComponents';
import { useModalBodyLock } from '../../hooks/useModalBodyLock';

const MOOD_OPTIONS: DreamMood[] = ['joyful', 'peaceful', 'neutral', 'confused', 'anxious', 'sad', 'fearful', 'nightmare'];

interface AddPastDreamModalProps {
    onSave: (dreamText: string, sleepQuality: number | null, mood?: DreamMood, timestamp?: string) => void;
    onClose: () => void;
}

export const AddPastDreamModal: React.FC<AddPastDreamModalProps> = ({ onSave, onClose }) => {
    useModalBodyLock();

    const [dreamText, setDreamText] = useState('');
    const [sleepQuality, setSleepQuality] = useState<number | null>(null);
    const [mood, setMood] = useState<DreamMood | null>(null);
    const [dreamDate, setDreamDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Hardware back button support
    useBackButton(true, onClose);

    // Handle Escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleFinalTranscript = useCallback((transcript: string) => {
        setDreamText(prev => (prev ? prev.trim() + ' ' : '') + transcript);
    }, []);

    const { isListening, interimTranscript, startListening, stopListening, isSupported } = useSpeechRecognition(handleFinalTranscript);

    // Cleanup speech recognition on unmount (e.g., when back button closes modal)
    useEffect(() => {
        return () => {
            if (isListening) {
                stopListening();
            }
        };
    }, [isListening, stopListening]);

    const handleSave = async () => {
        if (!dreamText.trim() || isListening || isSaving) return;

        // Validate dream text
        const validation = validateDreamText(dreamText);
        if (!validation.valid) {
            setValidationError(validation.error || 'Invalid dream text');
            haptics.error();
            return;
        }

        setValidationError(null);
        setIsSaving(true);
        try {
            haptics.dreamSaved();
            // Create timestamp from selected date
            const timestamp = new Date(dreamDate).toISOString();
            await onSave(validation.sanitized, sleepQuality, mood || undefined, timestamp);
        } finally {
            setIsSaving(false);
        }
    };

    const displayText = isListening
        ? (dreamText ? dreamText + ' ' : '') + interimTranscript
        : dreamText;

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 pt-4 pb-[calc(2rem+var(--safe-area-inset-bottom))] z-50"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-past-dream-title"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div
                className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-lg max-h-[calc(90vh-var(--safe-area-inset-bottom))] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                variants={modalVariants}
                initial="hidden"
                animate="visible"
            >
                <h2 id="add-past-dream-title" className="font-serif text-2xl text-center mb-4">Log a Past Dream</h2>

                {/* Date Picker */}
                <div className="mb-4">
                    <label htmlFor="past-dream-date" className="block text-sm text-day-text-secondary dark:text-night-text-secondary mb-2">
                        When did you have this dream?
                    </label>
                    <input
                        id="past-dream-date"
                        type="date"
                        value={dreamDate}
                        onChange={(e) => setDreamDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full p-3 min-h-[48px] text-base bg-white/50 dark:bg-black/30 border border-day-border dark:border-night-border rounded-lg focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent focus:outline-none"
                    />
                </div>

                {/* Dream Text */}
                <div className="relative mb-4">
                    <textarea
                        id="past-dream-text"
                        value={displayText}
                        onChange={(e) => { setDreamText(e.target.value); setValidationError(null); }}
                        maxLength={INPUT_LIMITS.dreamText}
                        className={`w-full h-32 p-4 pr-12 text-base bg-white/50 dark:bg-black/30 border rounded-lg focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent focus:outline-none transition-all custom-scrollbar ${validationError ? 'border-red-400 dark:border-red-500' : 'border-day-border dark:border-night-border'}`}
                        placeholder="Describe your dream..."
                        aria-label="Dream description"
                        aria-invalid={!!validationError}
                        aria-describedby={validationError ? 'past-dream-error' : undefined}
                        disabled={isListening}
                    ></textarea>
                    {isSupported && (
                        <button
                            onClick={isListening ? stopListening : startListening}
                            className={`absolute top-2 right-2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${isListening ? 'text-red-500 bg-red-100 dark:bg-red-900/30' : 'text-day-text-secondary hover:text-day-accent hover:bg-black/5 dark:hover:bg-white/5'}`}
                            aria-label={isListening ? "Stop recording" : "Dictate dream"}
                            aria-pressed={isListening}
                            title={isListening ? "Stop recording" : "Dictate dream"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>
                    )}
                    {/* Character count */}
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary text-right mt-1">
                        {dreamText.length.toLocaleString()} / {INPUT_LIMITS.dreamText.toLocaleString()}
                    </div>
                </div>
                {/* Validation error */}
                {validationError && (
                    <div id="past-dream-error" role="alert" className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {validationError}
                    </div>
                )}
                {isListening && (
                    <div className="flex items-center justify-center gap-2 text-sm text-red-500 mb-4">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span>Recording...</span>
                    </div>
                )}

                {/* Sleep Quality Rating */}
                <div className="mb-4">
                    <p className="text-center text-day-text-secondary dark:text-night-text-secondary mb-2">How was your sleep?</p>
                    <SleepQualityRating rating={sleepQuality} onRate={setSleepQuality} />
                </div>

                {/* Mood Selector */}
                <div className="mb-6">
                    <p className="text-center text-day-text-secondary dark:text-night-text-secondary mb-2">How did the dream feel?</p>
                    <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Dream mood options">
                        {MOOD_OPTIONS.map((value) => (
                            <button
                                key={value}
                                onClick={() => { haptics.selection(); setMood(mood === value ? null : value); }}
                                aria-label={`${MOOD_LABELS[value]} mood`}
                                aria-pressed={mood === value}
                                className={`px-4 py-2 min-h-[44px] rounded-full text-sm transition-all flex items-center gap-1.5 ${mood === value
                                    ? 'bg-day-accent dark:bg-night-accent text-white scale-105'
                                    : 'bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border hover:border-day-accent dark:hover:border-night-accent'
                                    }`}
                                title={MOOD_LABELS[value]}
                            >
                                {MOOD_ICONS[value]}
                                <span className="hidden sm:inline">{MOOD_LABELS[value]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-center gap-4">
                    <motion.button
                        onClick={onClose}
                        aria-label="Cancel and close"
                        className="py-3 px-6 min-h-[44px] bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full transition-all flex items-center justify-center"
                        disabled={isSaving}
                        whileTap={{ scale: 0.98 }}
                    >
                        Cancel
                    </motion.button>
                    <motion.button
                        onClick={handleSave}
                        aria-label="Save dream"
                        className="py-3 px-6 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-bold rounded-full disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        disabled={!dreamText.trim() || isListening || isSaving}
                        whileHover={!isSaving && dreamText.trim() ? { scale: 1.02 } : undefined}
                        whileTap={!isSaving && dreamText.trim() ? { scale: 0.98 } : undefined}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                        {isSaving ? (
                            <>
                                <motion.div
                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                />
                                Saving...
                            </>
                        ) : (
                            'Save Dream'
                        )}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};
