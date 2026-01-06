import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { SleepQualityRating } from '../shared/SleepQualityRating';
import { DreamMood } from '../../types';
import { playAlertnessBoost, stopAlertnessBoost } from '../../services/audioService';

const MOODS: { value: DreamMood; emoji: string; label: string }[] = [
    { value: 'joyful', emoji: '😊', label: 'Joyful' },
    { value: 'peaceful', emoji: '😌', label: 'Peaceful' },
    { value: 'neutral', emoji: '😐', label: 'Neutral' },
    { value: 'confused', emoji: '😕', label: 'Confused' },
    { value: 'anxious', emoji: '😰', label: 'Anxious' },
    { value: 'sad', emoji: '😢', label: 'Sad' },
    { value: 'fearful', emoji: '😨', label: 'Fearful' },
];

type ScribeStep = 'record' | 'boost';

interface DreamScribeModalProps {
    onSave: (dreamText: string, sleepQuality: number | null, mood?: DreamMood) => void;
    onClose: () => void;
    initialText?: string;
}

export const DreamScribeModal: React.FC<DreamScribeModalProps> = ({ onSave, onClose, initialText = '' }) => {
    const [step, setStep] = useState<ScribeStep>('record');
    const [dreamText, setDreamText] = useState(initialText);
    const [sleepQuality, setSleepQuality] = useState<number | null>(null);
    const [mood, setMood] = useState<DreamMood | null>(null);
    const [boostActive, setBoostActive] = useState(false);
    const savedDataRef = useRef<{ text: string; quality: number | null; mood?: DreamMood } | null>(null);

    const handleFinalTranscript = useCallback((transcript: string) => {
        setDreamText(prev => (prev ? prev.trim() + ' ' : '') + transcript);
    }, []);

    const { isListening, interimTranscript, startListening, stopListening, isSupported } = useSpeechRecognition(handleFinalTranscript);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const handleSave = () => {
        if (!dreamText.trim() || isListening) return;
        // Store the data and show boost offer
        savedDataRef.current = { text: dreamText, quality: sleepQuality, mood: mood || undefined };
        setStep('boost');
    };

    const toggleBoost = () => {
        if (boostActive) {
            stopAlertnessBoost();
            setBoostActive(false);
        } else {
            // 12Hz beta waves for alertness
            playAlertnessBoost();
            setBoostActive(true);
        }
    };

    const handleFinish = (startBoost: boolean) => {
        if (savedDataRef.current) {
            onSave(savedDataRef.current.text, savedDataRef.current.quality, savedDataRef.current.mood);
        }
        if (!startBoost) {
            stopAlertnessBoost();
        }
        // If startBoost is true, leave the audio playing
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (boostActive) {
                stopAlertnessBoost();
            }
        };
    }, [boostActive]);

    const displayText = isListening
        ? (dreamText ? dreamText + ' ' : '') + interimTranscript
        : dreamText;

    // Step 1: Record dream
    if (step === 'record') {
        return (
            <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
                <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-lg animate-fadeIn max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <h2 className="font-serif text-2xl text-center mb-4">The Dream Scribe</h2>
                    <div className="relative">
                        <textarea
                            value={displayText}
                            onChange={(e) => setDreamText(e.target.value)}
                            className="w-full h-40 p-4 pr-12 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-lg focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent focus:outline-none transition-all custom-scrollbar"
                            placeholder="Speak or write your dream here..."
                            disabled={isListening}
                        ></textarea>
                        {isSupported && (
                            <button onClick={isListening ? stopListening : startListening} className={`absolute top-3 right-3 transition-colors ${isListening ? 'text-red-500' : 'text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </button>
                        )}
                    </div>
                    {isListening && (
                        <div className="flex items-center justify-center gap-2 text-sm text-red-500 mt-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span>Recording...</span>
                        </div>
                    )}

                    {/* Sleep Quality Rating */}
                    <div className="my-4">
                        <p className="text-center text-day-text-secondary dark:text-night-text-secondary mb-2">How was your sleep?</p>
                        <SleepQualityRating rating={sleepQuality} onRate={setSleepQuality} />
                    </div>

                    {/* Mood Selector */}
                    <div className="my-4">
                        <p className="text-center text-day-text-secondary dark:text-night-text-secondary mb-2">How did the dream feel?</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {MOODS.map(({ value, emoji, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setMood(mood === value ? null : value)}
                                    className={`px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1 ${mood === value
                                        ? 'bg-day-accent dark:bg-night-accent text-white scale-105'
                                        : 'bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border hover:border-day-accent dark:hover:border-night-accent'
                                        }`}
                                    title={label}
                                >
                                    <span>{emoji}</span>
                                    <span className="hidden sm:inline">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 mt-4">
                        <button onClick={onClose} className="py-2 px-6 bg-gray-200 dark:bg-gray-700 text-slate-800 dark:text-slate-200 rounded-full">Cancel</button>
                        <button
                            onClick={handleSave}
                            className="py-2 px-6 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full disabled:opacity-50"
                            disabled={!dreamText.trim() || isListening}
                        >
                            Save & Illuminate
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Wake Up Boost offer
    return (
        <div className="fixed inset-0 bg-gradient-to-b from-indigo-900/95 to-purple-900/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-sm animate-fadeIn text-white text-center">
                <div className="mb-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h3 className="font-serif text-xl mb-1">Dream Saved!</h3>
                    <p className="text-white/70 text-sm">Would you like a Wake Up Boost?</p>
                </div>

                <div className="bg-white/10 rounded-xl p-4 mb-4">
                    <p className="text-sm text-white/80 mb-3">
                        12Hz beta waves to enhance alertness and mental clarity
                    </p>
                    <button
                        onClick={toggleBoost}
                        className={`w-full py-3 rounded-xl font-medium transition-all ${boostActive
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                            : 'bg-white/20 text-white hover:bg-white/30'
                            }`}
                    >
                        {boostActive ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                Playing - Tap to Stop
                            </span>
                        ) : (
                            'Preview Wake Up Boost'
                        )}
                    </button>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => handleFinish(false)}
                        className="flex-1 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all"
                    >
                        Skip
                    </button>
                    <button
                        onClick={() => handleFinish(true)}
                        className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 rounded-xl font-medium transition-all"
                    >
                        Start Boost
                    </button>
                </div>
            </div>
        </div>
    );
};