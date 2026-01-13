import React, { useState, useCallback, useEffect } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { DreamMood } from '../../types';
import haptics from '../../services/hapticsService';
import { MOOD_ICONS, MOOD_LABELS } from '../../constants/uiIcons';

const MOOD_OPTIONS: DreamMood[] = ['joyful', 'peaceful', 'neutral', 'confused', 'anxious', 'sad', 'fearful', 'nightmare'];

interface AddDreamToEntryModalProps {
    sleepEntryId: number;
    sleepDate: string;
    onSave: (sleepEntryId: number, dreamText: string, mood?: DreamMood) => void;
    onClose: () => void;
}

export const AddDreamToEntryModal: React.FC<AddDreamToEntryModalProps> = ({
    sleepEntryId,
    sleepDate,
    onSave,
    onClose
}) => {
    const [dreamText, setDreamText] = useState('');
    const [mood, setMood] = useState<DreamMood | null>(null);

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

    const handleSave = () => {
        if (!dreamText.trim() || isListening) return;
        haptics.dreamSaved();
        onSave(sleepEntryId, dreamText, mood || undefined);
        onClose();
    };

    const displayText = isListening
        ? (dreamText ? dreamText + ' ' : '') + interimTranscript
        : dreamText;

    const displayDate = new Date(sleepDate + 'T12:00:00').toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 pt-4 pb-[calc(1rem+var(--safe-area-inset-bottom))] z-50" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="add-dream-entry-title">
            <div
                className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-lg animate-fadeIn max-h-[calc(90vh-var(--safe-area-inset-bottom))] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="add-dream-entry-title" className="font-serif text-2xl text-center mb-2">Add Dream</h2>
                <p className="text-center text-day-text-secondary dark:text-night-text-secondary text-sm mb-4">
                    For sleep on {displayDate}
                </p>

                {/* Dream Text */}
                <div className="relative mb-4">
                    <textarea
                        value={displayText}
                        onChange={(e) => setDreamText(e.target.value)}
                        className="w-full h-32 p-4 pr-12 text-base bg-white/50 dark:bg-black/30 border border-day-border dark:border-night-border rounded-lg focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent focus:outline-none transition-all custom-scrollbar"
                        placeholder="Describe your dream..."
                        aria-label="Dream description"
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
                </div>
                {isListening && (
                    <div className="flex items-center justify-center gap-2 text-sm text-red-500 mb-4">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span>Recording...</span>
                    </div>
                )}

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

                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleSave}
                        className="w-full py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-bold rounded-full disabled:opacity-50 transition-all flex items-center justify-center"
                        disabled={!dreamText.trim() || isListening}
                    >
                        Save Dream
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 min-h-[44px] text-day-text-secondary dark:text-night-text-secondary hover:text-day-text dark:hover:text-night-text transition-colors text-sm flex items-center justify-center"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
