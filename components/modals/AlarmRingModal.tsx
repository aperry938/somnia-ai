// components/modals/AlarmRingModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { playAlarmBySound, stopAlarmSound, playAlertnessBoost, stopAlertnessBoost } from '../../services/audioService';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { Alarm } from '../../types';
import haptics from '../../services/hapticsService';

interface AlarmRingModalProps {
    alarm: Alarm;
    onRecordDream: (quickNote?: string) => void;
    onSnooze: () => void;
    onAwake: () => void;
}

const DREAM_PROMPTS = [
    "What images are still vivid?",
    "Who was in your dream?",
    "What emotions linger?",
    "Where did it take place?",
    "What was the last thing you remember?"
];

type WakeStep = 'alarm' | 'snooze' | 'dream' | 'boost';

const SNOOZE_DURATION = 5 * 60; // 5 minutes in seconds

export const AlarmRingModal: React.FC<AlarmRingModalProps> = ({ alarm, onRecordDream, onSnooze, onAwake }) => {
    // For reminder alarms, skip straight to dismiss - no dream prompts
    const isSleepAlarm = alarm.purpose !== 'reminder';

    const [step, setStep] = useState<WakeStep>('alarm');
    const [quickNote, setQuickNote] = useState('');
    const [currentPrompt] = useState(() => DREAM_PROMPTS[Math.floor(Math.random() * DREAM_PROMPTS.length)]);
    const [showInput, setShowInput] = useState(false);
    const [alertnessOn, setAlertnessOn] = useState(false);
    const [snoozeRemaining, setSnoozeRemaining] = useState(SNOOZE_DURATION);

    // Callback for when speech is finalized
    const handleFinalTranscript = useCallback((text: string) => {
        setQuickNote(prev => (prev + ' ' + text).trim());
    }, []);

    const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition(handleFinalTranscript);

    useEffect(() => {
        // Play the user-selected alarm sound
        console.log('[AlarmRingModal] Playing alarm with soundId:', alarm.soundId, 'Full alarm:', alarm);
        playAlarmBySound(alarm.soundId || 'somnia');
        return () => {
            stopAlarmSound();
            stopAlertnessBoost();
        };
    }, [alarm.soundId]);

    // Handle snooze - show countdown instead of dismissing
    const handleSnooze = useCallback(() => {
        haptics.snooze();
        stopAlarmSound();
        if (isListening) stopListening();
        setSnoozeRemaining(SNOOZE_DURATION);
        setStep('snooze');
    }, [isListening, stopListening]);

    // Snooze countdown timer
    useEffect(() => {
        if (step !== 'snooze') return;

        const interval = setInterval(() => {
            setSnoozeRemaining(prev => {
                if (prev <= 1) {
                    // Timer done - ring again
                    setStep('alarm');
                    playAlarmBySound(alarm.soundId || 'somnia');
                    return SNOOZE_DURATION;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [step, alarm.soundId]);

    // Cancel snooze and wake up
    const cancelSnooze = useCallback(() => {
        haptics.medium();
        setStep('dream');
    }, []);

    // Handle "I'm Awake" - advance to dream capture for sleep alarms, or dismiss for reminders
    const handleAwake = useCallback(() => {
        haptics.success();
        stopAlarmSound();
        if (isSleepAlarm) {
            setStep('dream');
        } else {
            // For reminder alarms, just dismiss
            onAwake();
        }
    }, [isSleepAlarm, onAwake]);

    // Handle recording dream - advance to boost step
    const handleRecordDream = useCallback(() => {
        haptics.dreamSaved();
        if (isListening) stopListening();
        onRecordDream(quickNote.trim() || undefined);
    }, [isListening, stopListening, quickNote, onRecordDream]);

    // Handle skipping dream - advance to boost step
    const handleSkipDream = useCallback(() => {
        haptics.light();
        if (isListening) stopListening();
        setStep('boost');
    }, [isListening, stopListening]);

    // Toggle voice recording
    const toggleVoice = useCallback(() => {
        haptics.medium();
        if (isListening) {
            stopListening();
        } else {
            startListening();
            setShowInput(true);
        }
    }, [isListening, startListening, stopListening]);

    // Toggle alertness boost
    const toggleAlertnessBoost = useCallback(() => {
        haptics.boostStart();
        if (alertnessOn) {
            stopAlertnessBoost();
            setAlertnessOn(false);
        } else {
            playAlertnessBoost();
            setAlertnessOn(true);
        }
    }, [alertnessOn]);

    // Final dismiss - close everything
    const handleFinish = useCallback(() => {
        haptics.success();
        stopAlertnessBoost();
        onAwake();
    }, [onAwake]);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-indigo-900/95 to-purple-900/95 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="w-full max-w-sm animate-fadeIn text-center py-6">
                {/* Time Display - Always visible */}
                <p className="text-6xl font-light text-white/90 mb-2">{timeStr}</p>
                <h2 className="font-serif text-2xl text-white/80 mb-2">
                    {isSleepAlarm ? 'Good Morning' : 'Reminder'}
                </h2>
                {alarm.label && (
                    <p className="text-white/60 text-lg mb-6">{alarm.label}</p>
                )}
                {!alarm.label && <div className="mb-6" />}

                {/* STEP 1: Alarm - Just Snooze and I'm Awake/Dismiss */}
                {step === 'alarm' && (
                    <div className="animate-fadeIn">
                        <div className="flex gap-3">
                            <button
                                onClick={handleSnooze}
                                className="flex-1 py-5 bg-white/15 backdrop-blur border border-white/20 text-white font-semibold rounded-2xl text-lg hover:bg-white/25 transition-all active:scale-95"
                            >
                                Snooze 5m
                            </button>
                            <button
                                onClick={handleAwake}
                                className="flex-1 py-5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-2xl text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95"
                            >
                                {isSleepAlarm ? "I'm Awake" : 'Dismiss'}
                            </button>
                        </div>
                    </div>
                )}

                {/* SNOOZE: Countdown display */}
                {step === 'snooze' && (
                    <div className="animate-fadeIn">
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-4 border border-white/10">
                            <p className="text-white/50 text-sm mb-2">Snoozing...</p>
                            <p className="text-5xl font-light text-white mb-4">
                                {Math.floor(snoozeRemaining / 60)}:{String(snoozeRemaining % 60).padStart(2, '0')}
                            </p>
                            <p className="text-white/40 text-xs">Alarm will ring again</p>
                        </div>
                        <button
                            onClick={cancelSnooze}
                            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all"
                        >
                            I'm Awake Now
                        </button>
                    </div>
                )}

                {/* STEP 2: Dream Capture */}
                {step === 'dream' && (
                    <div className="animate-fadeIn">
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-5 mb-4 border border-white/10">
                            <p className="text-white/50 text-xs mb-2 uppercase tracking-wider">Before it fades...</p>
                            <p className="text-white/80 text-sm italic mb-5">"{currentPrompt}"</p>

                            {/* Voice Recording */}
                            {isSupported && (
                                <div className="mb-4">
                                    <button
                                        onClick={toggleVoice}
                                        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all ${isListening
                                            ? 'bg-red-500 animate-pulse scale-110 shadow-lg shadow-red-500/30'
                                            : 'bg-white/20 hover:bg-white/30 hover:scale-105'
                                            }`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                        </svg>
                                    </button>
                                    <p className="text-white/50 text-xs mt-2">
                                        {isListening ? 'Listening...' : 'Tap to speak your dream'}
                                    </p>
                                </div>
                            )}

                            {/* Text input */}
                            {(showInput || quickNote || !isSupported) && (
                                <textarea
                                    value={quickNote}
                                    onChange={(e) => setQuickNote(e.target.value)}
                                    placeholder="Key words, images, feelings..."
                                    className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm resize-none focus:outline-none focus:border-white/40 mb-4"
                                    rows={3}
                                    autoFocus={!isSupported}
                                />
                            )}

                            {/* Type instead link */}
                            {!showInput && !quickNote && isSupported && (
                                <button
                                    onClick={() => setShowInput(true)}
                                    className="text-white/40 text-xs underline mb-4 block mx-auto"
                                >
                                    Or type instead
                                </button>
                            )}

                            {/* Record Dream Button */}
                            <button
                                onClick={handleRecordDream}
                                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                            >
                                {quickNote ? 'Save & Record Full Dream' : 'Record Full Dream'}
                            </button>
                        </div>

                        {/* Skip option */}
                        <button
                            onClick={handleSkipDream}
                            className="text-white/40 text-sm hover:text-white/60 transition-colors"
                        >
                            Skip for now
                        </button>
                    </div>
                )}

                {/* STEP 3: Wake Up Boost Offer */}
                {step === 'boost' && (
                    <div className="animate-fadeIn">
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6 border border-white/10">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <h3 className="text-white font-semibold text-lg mb-2">Wake Up Boost</h3>
                            <p className="text-white/60 text-sm mb-5">
                                12Hz Beta waves for gentle alertness and cognitive readiness
                            </p>

                            <button
                                onClick={toggleAlertnessBoost}
                                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${alertnessOn
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                            >
                                {alertnessOn ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                        Boost Active
                                    </span>
                                ) : (
                                    'Start Wake Up Boost'
                                )}
                            </button>
                        </div>

                        {/* Done button */}
                        <button
                            onClick={handleFinish}
                            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all"
                        >
                            Start My Day
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
