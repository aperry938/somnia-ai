import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { SleepQualityRating } from '../shared/SleepQualityRating';
import { DreamMood } from '../../types';
import { playAlertnessBoost, stopAlertnessBoost } from '../../services/audioService';
import haptics from '../../services/hapticsService';
import { MOOD_ICONS, MOOD_LABELS } from '../../constants/uiIcons';

const MOOD_OPTIONS: DreamMood[] = ['joyful', 'peaceful', 'neutral', 'confused', 'anxious', 'sad', 'fearful'];

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
    const dreamSavedRef = useRef(false);

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
        haptics.dreamSaved();
        // Store the data and show boost offer
        savedDataRef.current = { text: dreamText, quality: sleepQuality, mood: mood || undefined };
        setStep('boost');
    };

    const toggleBoost = () => {
        haptics.boostStart();
        if (boostActive) {
            stopAlertnessBoost();
            setBoostActive(false);
        } else {
            // 12Hz beta waves for alertness
            playAlertnessBoost();
            setBoostActive(true);
        }
    };

    const handleSkip = () => {
        haptics.light();
        // Save dream and close without boost
        stopAlertnessBoost();
        if (savedDataRef.current && !dreamSavedRef.current) {
            dreamSavedRef.current = true;
            onSave(savedDataRef.current.text, savedDataRef.current.quality, savedDataRef.current.mood);
        }
    };

    const handleStartMyDay = () => {
        haptics.success();
        // User is done - boost keeps playing if active, just close modal
        if (savedDataRef.current && !dreamSavedRef.current) {
            dreamSavedRef.current = true;
            onSave(savedDataRef.current.text, savedDataRef.current.quality, savedDataRef.current.mood);
        }
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

    // Step 1: Record dream - Purple alarm theme
    if (step === 'record') {
        return (
            <div className="fixed inset-0 bg-gradient-to-b from-indigo-900/95 to-purple-900/95 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-lg animate-fadeIn max-h-[90vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
                    <h2 className="font-serif text-2xl text-center mb-4">The Dream Scribe</h2>
                    <div className="relative">
                        <textarea
                            value={displayText}
                            onChange={(e) => setDreamText(e.target.value)}
                            className="w-full h-40 p-4 pr-12 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none transition-all custom-scrollbar text-white placeholder-white/50"
                            placeholder="Speak or write your dream here..."
                            disabled={isListening}
                        ></textarea>
                        {isSupported && (
                            <button onClick={isListening ? stopListening : startListening} className={`absolute top-3 right-3 transition-colors ${isListening ? 'text-red-400' : 'text-white/60 hover:text-white'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </button>
                        )}
                    </div>
                    {isListening && (
                        <div className="flex items-center justify-center gap-2 text-sm text-red-400 mt-2">
                            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                            <span>Recording...</span>
                        </div>
                    )}

                    {/* Sleep Quality Rating */}
                    <div className="my-4">
                        <p className="text-center text-white/70 mb-2">How was your sleep?</p>
                        <SleepQualityRating rating={sleepQuality} onRate={setSleepQuality} />
                    </div>

                    {/* Mood Selector */}
                    <div className="my-4">
                        <p className="text-center text-white/70 mb-2">How did the dream feel?</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {MOOD_OPTIONS.map((value) => (
                                <button
                                    key={value}
                                    onClick={() => { haptics.selection(); setMood(mood === value ? null : value); }}
                                    className={`px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5 ${mood === value
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white scale-105'
                                        : 'bg-white/10 border border-white/20 text-white/80 hover:border-white/40'
                                        }`}
                                    title={MOOD_LABELS[value]}
                                >
                                    {MOOD_ICONS[value]}
                                    <span className="hidden sm:inline">{MOOD_LABELS[value]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 mt-4">
                        <button onClick={onClose} className="py-2 px-6 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all">Cancel</button>
                        <button
                            onClick={handleSave}
                            className="py-2 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-full disabled:opacity-50 transition-all"
                            disabled={!dreamText.trim() || isListening}
                        >
                            Save & Illuminate
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2 & 3 Combined: Wake Up Boost offer with "Start My Day"
    // Clear layout: Good Morning header, Wake Up Boost card, Start My Day button
    return (
        <div className="fixed inset-0 bg-gradient-to-b from-indigo-900/95 to-purple-900/95 backdrop-blur-md flex flex-col items-center justify-center p-4 z-50">
            {/* Good Morning Header */}
            <h2 className="font-serif text-3xl text-white mb-6">Good Morning</h2>

            {/* Wake Up Boost Card */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-sm animate-fadeIn text-white text-center mb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
                <h3 className="font-serif text-xl mb-2">Wake Up Boost</h3>
                <p className="text-white/60 text-sm mb-4">12Hz Beta waves for gentle alertness and cognitive readiness</p>

                {/* Start/Stop Wake Up Boost button */}
                <button
                    onClick={toggleBoost}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${boostActive
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                        : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                >
                    {boostActive ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            Boost Active - Tap to Stop
                        </span>
                    ) : (
                        'Start Wake Up Boost'
                    )}
                </button>
            </div>

            {/* Start My Day button - goes to homepage */}
            <button
                onClick={handleStartMyDay}
                className="w-full max-w-sm py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl text-lg shadow-lg hover:shadow-xl transition-all"
            >
                Start My Day
            </button>
        </div>
    );
};