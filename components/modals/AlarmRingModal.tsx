// components/modals/AlarmRingModal.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { playAlarmBySound, stopAlarmSound, playAlertnessBoost, stopAlertnessBoost } from '../../services/audioService';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { Alarm } from '../../types';
import { isDevMode } from '../../services/secureSubscriptionService';
import haptics from '../../services/hapticsService';

// Pulsing visual component that crescendos over 60 seconds
const PulsingWakeVisual: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    const [intensity, setIntensity] = useState(0);
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        if (!isActive) {
            setIntensity(0);
            return;
        }

        startTimeRef.current = Date.now();

        const updateIntensity = () => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds
            // Crescendo over 60 seconds: 0 -> 1
            const progress = Math.min(elapsed / 60, 1);
            // Use easeInQuad for gradual then faster increase
            const easedProgress = progress * progress;
            setIntensity(easedProgress);
        };

        const interval = setInterval(updateIntensity, 100);
        updateIntensity(); // Initial call

        return () => clearInterval(interval);
    }, [isActive]);

    if (!isActive) return null;

    // Calculate dynamic values based on intensity
    const pulseSpeed = 2 - intensity * 1.2; // 2s -> 0.8s (faster as intensity increases)
    const glowOpacity = 0.3 + intensity * 0.5; // 0.3 -> 0.8
    const ringScale = 1 + intensity * 0.5; // 1 -> 1.5

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Central pulsing glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                    width: '150%',
                    height: '150%',
                    background: `radial-gradient(circle, rgba(255,150,50,${glowOpacity * 0.4}) 0%, rgba(255,100,100,${glowOpacity * 0.2}) 40%, transparent 70%)`,
                    animation: `pulse ${pulseSpeed}s ease-in-out infinite`,
                }}
            />

            {/* Expanding rings */}
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                    style={{
                        width: `${60 + i * 25}%`,
                        height: `${60 + i * 25}%`,
                        borderColor: `rgba(255, ${180 - intensity * 80}, ${100 - intensity * 50}, ${0.2 + intensity * 0.3})`,
                        transform: `translate(-50%, -50%) scale(${ringScale})`,
                        animation: `ringPulse ${pulseSpeed + i * 0.3}s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`,
                    }}
                />
            ))}

            {/* Intensity indicator at bottom */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-48">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-amber-400 to-red-500 rounded-full transition-all duration-300"
                        style={{ width: `${intensity * 100}%` }}
                    />
                </div>
                <p className="text-white/40 text-xs text-center mt-1">
                    {intensity < 1 ? `${Math.round(intensity * 60)}s` : 'Full'}
                </p>
            </div>

            {/* CSS Keyframes */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
                }
                @keyframes ringPulse {
                    0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                }
            `}</style>
        </div>
    );
};

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

    // Track mount state for cleanup
    const isMountedRef = React.useRef(true);

    useEffect(() => {
        isMountedRef.current = true;

        // Play the user-selected alarm sound
        playAlarmBySound(alarm.soundId || 'somnia');

        return () => {
            // Only stop sound on actual unmount, not strict mode remount
            // Delay cleanup slightly to allow re-mount to cancel it
            isMountedRef.current = false;

            setTimeout(() => {
                // If component hasn't re-mounted, perform cleanup
                if (!isMountedRef.current) {
                    stopAlarmSound();
                    stopAlertnessBoost();
                }
            }, 50);
        };
    }, []); // Empty deps - only run once on mount

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
        <div className="fixed inset-0 bg-gradient-to-b from-indigo-900/95 to-purple-900/95 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Alarm ringing">
            {/* Pulsing visual wake element - only active during alarm step */}
            <PulsingWakeVisual isActive={step === 'alarm'} />

            <div className="w-full max-w-sm animate-fadeIn text-center py-6 relative z-10">
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
                        {/* DEV TOOLS: Sound Switcher - only visible in dev mode */}
                        {isDevMode() && (
                            <div className="mb-6 p-3 bg-black/30 rounded-xl border border-yellow-500/50">
                                <p className="text-yellow-400 text-xs font-mono mb-2">DEV: Test Alarm Sounds</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {['somnia', 'gentle', 'classic', 'prism', 'aether', 'bamboo'].map(soundId => (
                                        <button
                                            key={soundId}
                                            onClick={() => {
                                                stopAlarmSound();
                                                setTimeout(() => playAlarmBySound(soundId), 100);
                                            }}
                                            className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 text-xs font-mono rounded-lg border border-yellow-500/30 transition-all"
                                        >
                                            {soundId}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleSnooze}
                                aria-label="Snooze alarm for 5 minutes"
                                className="flex-1 py-5 bg-white/15 backdrop-blur border border-white/20 text-white font-semibold rounded-2xl text-lg hover:bg-white/25 transition-all active:scale-95"
                            >
                                Snooze 5m
                            </button>
                            <button
                                onClick={handleAwake}
                                aria-label={isSleepAlarm ? "Dismiss alarm and wake up" : "Dismiss reminder"}
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
                                        aria-label={isListening ? "Stop recording" : "Start recording your dream"}
                                        aria-pressed={isListening}
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
                                    aria-label="Quick dream notes"
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
                                aria-label={alertnessOn ? "Stop alertness boost" : "Start alertness boost"}
                                aria-pressed={alertnessOn}
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
