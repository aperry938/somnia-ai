import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { SleepQualityRating } from '../shared/SleepQualityRating';
import { DreamMood } from '../../types';
import { playAlertnessBoost, stopAlertnessBoost, setAlertnessVolume } from '../../services/audioService';
import haptics from '../../services/hapticsService';
import { MOOD_ICONS, MOOD_LABELS } from '../../constants/uiIcons';
import { validateDreamText, containsScriptInjection } from '../../services/validationService';

const MOOD_OPTIONS: DreamMood[] = ['joyful', 'peaceful', 'neutral', 'confused', 'anxious', 'sad', 'fearful', 'nightmare'];

type ScribeStep = 'record' | 'boost';

interface DreamScribeModalProps {
    onSave: (dreamText: string, sleepQuality: number | null, mood?: DreamMood) => void;
    onClose: () => void;
    initialText?: string;
}

export const DreamScribeModal: React.FC<DreamScribeModalProps> = ({ onSave, onClose, initialText = '' }) => {
    const [step, setStep] = useState<ScribeStep>('record');
    const [dreamText, setDreamText] = useState(initialText);

    // Mount protection: Prevents ghost clicks from previous modal from triggering backdrop close
    // This fixes the race condition where tapping "Record Full Dream" in AlarmRingModal
    // would immediately close DreamScribeModal due to touch event propagation
    const [canCloseViaBackdrop, setCanCloseViaBackdrop] = useState(false);

    useEffect(() => {
        // Delay enabling backdrop close to prevent ghost clicks from previous modal
        const timer = setTimeout(() => setCanCloseViaBackdrop(true), 150);
        return () => clearTimeout(timer);
    }, []);

    // Swipe-to-dismiss
    const y = useMotionValue(0);
    const backdropOpacity = useTransform(y, [0, 200], [1, 0.3]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Use same mount protection for swipe-to-dismiss
        if (!canCloseViaBackdrop) return;
        if (info.offset.y > 100 || info.velocity.y > 500) {
            haptics.medium();
            onClose();
        }
    };
    const [sleepQuality, setSleepQuality] = useState<number | null>(null);
    const [mood, setMood] = useState<DreamMood | null>(null);
    const [boostActive, setBoostActive] = useState(false);
    const [boostTimer, setBoostTimer] = useState(0);
    const [boostVolume, setBoostVolume] = useState(0.25);
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

    const [validationError, setValidationError] = useState<string | null>(null);

    const handleSave = () => {
        if (!dreamText.trim() || isListening) return;

        // Validate and sanitize dream text
        const validation = validateDreamText(dreamText);
        if (!validation.valid) {
            setValidationError(validation.error || 'Invalid dream text');
            return;
        }

        // Check for script injection attempts
        if (containsScriptInjection(dreamText)) {
            setValidationError('Invalid characters detected in dream text');
            return;
        }

        setValidationError(null);
        haptics.dreamSaved();
        // Store the sanitized data and show boost offer
        savedDataRef.current = { text: validation.sanitized, quality: sleepQuality, mood: mood || undefined };
        setStep('boost');
    };

    const toggleBoost = () => {
        haptics.boostStart();
        if (boostActive) {
            stopAlertnessBoost();
            setBoostActive(false);
            setBoostTimer(0);
        } else {
            // 12Hz beta waves for alertness
            playAlertnessBoost(boostVolume);
            setBoostActive(true);
            setBoostTimer(0);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setBoostVolume(newVolume);
        if (boostActive) {
            setAlertnessVolume(newVolume);
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

    // Timer for boost
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (boostActive) {
            interval = setInterval(() => {
                setBoostTimer(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [boostActive]);

    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const displayText = isListening
        ? (dreamText ? dreamText + ' ' : '') + interimTranscript
        : dreamText;

    // Step 1: Record dream - Purple alarm theme
    if (step === 'record') {
        return (
            <motion.div
                className="fixed inset-0 bg-gradient-to-b from-indigo-900/95 to-purple-900/95 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
                onClick={canCloseViaBackdrop ? onClose : undefined}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dream-scribe-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <motion.div
                    className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-t-2xl sm:rounded-2xl p-6 pb-10 w-full max-w-lg max-h-[90vh] sm:max-h-[88vh] overflow-y-auto text-white"
                    onClick={(e) => e.stopPropagation()}
                    style={{ y }}
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    drag="y"
                    dragConstraints={{ top: 0 }}
                    dragElastic={{ top: 0, bottom: 0.5 }}
                    onDragEnd={handleDragEnd}
                >
                    {/* Drag indicator for mobile */}
                    <div className="flex justify-center pb-2 sm:hidden cursor-grab active:cursor-grabbing">
                        <div className="w-10 h-1 rounded-full bg-white/30" />
                    </div>
                    <h2 id="dream-scribe-title" className="font-serif text-2xl text-center mb-2">The Dream Scribe</h2>

                    {/* Compact Voice Recording Button */}
                    <div className="mb-2 text-center">
                        <button
                            onClick={isListening ? stopListening : startListening}
                            aria-label={isListening ? "Stop recording" : "Start voice recording"}
                            aria-pressed={isListening}
                            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all ${isListening
                                ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50'
                                : 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-105 shadow-lg shadow-purple-500/30'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 text-white ${isListening ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>
                        <p className={`text-xs mt-1.5 ${isListening ? 'text-red-400' : 'text-white/50'}`}>
                            {isListening ? (
                                <span className="flex items-center justify-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></span>
                                    Recording...
                                </span>
                            ) : (
                                'Tap to speak'
                            )}
                        </p>
                    </div>

                    {/* Text area for typing/displaying transcription */}
                    <textarea
                        value={displayText}
                        onChange={(e) => setDreamText(e.target.value)}
                        className="w-full h-32 p-4 text-base bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none transition-all custom-scrollbar text-white placeholder-white/50"
                        placeholder="Speak or write your dream here..."
                        aria-label="Dream description"
                        disabled={isListening}
                    ></textarea>

                    {/* Validation Error */}
                    {validationError && (
                        <div className="mt-2 p-2 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300 text-sm text-center">
                            {validationError}
                        </div>
                    )}

                    {/* Sleep Quality Rating */}
                    <div className="my-2">
                        <p className="text-center text-white/70 mb-2">How was your sleep?</p>
                        <SleepQualityRating rating={sleepQuality} onRate={setSleepQuality} />
                    </div>

                    {/* Mood Selector */}
                    <div className="my-2">
                        <p className="text-center text-white/70 mb-2">How did the dream feel?</p>
                        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Dream mood options">
                            {MOOD_OPTIONS.map((value) => (
                                <button
                                    key={value}
                                    onClick={() => { haptics.selection(); setMood(mood === value ? null : value); }}
                                    aria-label={`${MOOD_LABELS[value]} mood`}
                                    aria-pressed={mood === value}
                                    className={`px-4 py-2 min-h-[44px] rounded-full text-sm transition-all flex items-center gap-1.5 ${mood === value
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white scale-105'
                                        : 'bg-white/10 border border-white/20 text-white/80 hover:border-white/40'
                                        }`}
                                    title={MOOD_LABELS[value]}
                                >
                                    {MOOD_ICONS[value]}
                                    <span>{MOOD_LABELS[value]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 mt-4 pb-20">
                        <button onClick={onClose} aria-label="Cancel and close" className="py-3 px-6 min-h-[48px] bg-white/20 hover:bg-white/30 text-white rounded-full transition-all flex items-center justify-center">Cancel</button>
                        <button
                            onClick={handleSave}
                            aria-label="Save dream and continue"
                            className="py-3 px-6 min-h-[48px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-full disabled:opacity-50 transition-all flex items-center justify-center"
                            disabled={!dreamText.trim() || isListening}
                        >
                            Save & Illuminate
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        );
    }

    // Step 2 & 3 Combined: Wake Up Boost offer with "Start My Day"
    // Clear layout: Good Morning header, Wake Up Boost card, Start My Day button
    return (
        <motion.div
            className="fixed inset-0 bg-gradient-to-b from-indigo-900/95 to-purple-900/95 backdrop-blur-md flex flex-col items-center justify-center p-4 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="boost-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Good Morning Header */}
            <h2 id="boost-title" className="font-serif text-3xl text-white mb-6">Good Morning</h2>

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
                    aria-label={boostActive ? "Stop wake up boost" : "Start wake up boost"}
                    aria-pressed={boostActive}
                    className={`w-full py-4 min-h-[56px] rounded-xl font-semibold text-lg transition-all flex items-center justify-center ${boostActive
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                        : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                >
                    {boostActive ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" aria-hidden="true"></span>
                            Boost Active - Tap to Stop
                        </span>
                    ) : (
                        'Start Wake Up Boost'
                    )}
                </button>
                {boostActive && (
                    <p className="text-white/60 text-sm mt-3 font-mono">
                        {formatTimer(boostTimer)}
                    </p>
                )}

                {/* Volume Slider */}
                <div className="mt-4 px-2">
                    <div className="flex justify-between text-xs text-white/50 mb-1">
                        <span>Volume</span>
                        <span>{Math.round(boostVolume * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0.05"
                        max="1"
                        step="0.05"
                        value={boostVolume}
                        onChange={handleVolumeChange}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:border-0"
                        style={{
                            background: `linear-gradient(to right, rgb(251 191 36) 0%, rgb(251 191 36) ${((boostVolume - 0.05) / 0.95) * 100}%, rgba(255,255,255,0.2) ${((boostVolume - 0.05) / 0.95) * 100}%, rgba(255,255,255,0.2) 100%)`
                        }}
                        aria-label="Boost volume"
                    />
                </div>
            </div>

            {/* Start My Day button - goes to homepage */}
            <button
                onClick={handleStartMyDay}
                aria-label="Start my day and close"
                className="w-full max-w-sm py-4 min-h-[56px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
            >
                Start My Day
            </button>
        </motion.div>
    );
};