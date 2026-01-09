// components/modals/AlarmRingModal.tsx
import React, { useEffect, useState, useCallback, useRef, TouchEvent } from 'react';
import { playAlarmBySound, stopAlarmSound, playAlertnessBoost, stopAlertnessBoost, setAlertnessVolume } from '../../services/audioService';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { Alarm } from '../../types';
import { isDevMode } from '../../services/secureSubscriptionService';
import haptics from '../../services/hapticsService';
import { startHapticAlarmRamp, stopHapticAlarmRamp, triggerWakePattern } from '../../services/hapticAlarmService';

// Minimum distance (px) to trigger a swipe action
const SWIPE_THRESHOLD = 100;
// Distance at which haptic feedback fires
const HAPTIC_THRESHOLD = 60;

// Pulsing visual component that crescendos over 60 seconds
const PulsingWakeVisual: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        if (!isActive) {
            setElapsedSeconds(0);
            return;
        }

        startTimeRef.current = Date.now();

        const updateTimer = () => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setElapsedSeconds(elapsed);
        };

        // Update every second for consistent timer display
        const interval = setInterval(updateTimer, 1000);
        updateTimer(); // Initial call

        return () => clearInterval(interval);
    }, [isActive]);

    if (!isActive) return null;

    // Linear progress over 60 seconds (capped at 1)
    const progress = Math.min(elapsedSeconds / 60, 1);

    // Calculate dynamic values based on linear progress
    const pulseSpeed = 2 - progress * 1.2; // 2s -> 0.8s
    const glowOpacity = 0.3 + progress * 0.5; // 0.3 -> 0.8
    const ringScale = 1 + progress * 0.5; // 1 -> 1.5

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
                        borderColor: `rgba(255, ${180 - progress * 80}, ${100 - progress * 50}, ${0.2 + progress * 0.3})`,
                        transform: `translate(-50%, -50%) scale(${ringScale})`,
                        animation: `ringPulse ${pulseSpeed + i * 0.3}s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`,
                    }}
                />
            ))}

            {/* Timer indicator at bottom - now shows actual seconds */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-48">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-amber-400 to-red-500 rounded-full transition-all duration-1000"
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
                <p className="text-white/40 text-xs text-center mt-1">
                    {elapsedSeconds}s
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
    onFinalize?: (options?: { alertnessBoostUsed?: boolean }) => void;
    onCaptureWakeMetrics?: () => void; // Called when user clicks "I'm Awake" to capture timing
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

export const AlarmRingModal: React.FC<AlarmRingModalProps> = ({ alarm, onRecordDream, onSnooze: _onSnooze, onAwake, onFinalize, onCaptureWakeMetrics }) => {
    // For reminder alarms, skip straight to dismiss - no dream prompts
    const isSleepAlarm = alarm.purpose !== 'reminder';

    const [step, setStep] = useState<WakeStep>('alarm');
    // Track if boost was ever used (for logging to sleep entry)
    const boostEverUsedRef = React.useRef(false);
    const [quickNote, setQuickNote] = useState('');
    const [currentPrompt] = useState(() => DREAM_PROMPTS[Math.floor(Math.random() * DREAM_PROMPTS.length)]);
    const [showInput, setShowInput] = useState(false);
    const [alertnessOn, setAlertnessOn] = useState(false);
    const [boostVolume, setBoostVolume] = useState(0.25);
    const [boostTimer, setBoostTimer] = useState(0);
    const [snoozeRemaining, setSnoozeRemaining] = useState(SNOOZE_DURATION);

    // Swipe gesture state for easy dismiss (reduces fine motor requirements)
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const hasTriggeredHapticRef = useRef(false);

    // Handle touch start
    const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
        if (step !== 'alarm') return;
        const touch = e.touches[0];
        if (!touch) return;
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        hasTriggeredHapticRef.current = false;
        setSwipeOffset(0);
        setSwipeDirection(null);
    }, [step]);

    // Handle touch move - track swipe and provide haptic feedback
    const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
        if (step !== 'alarm' || !touchStartRef.current) return;

        const touch = e.touches[0];
        if (!touch) return;
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

        // Ignore if vertical scroll is dominant
        if (deltaY > Math.abs(deltaX) * 0.5) return;

        setSwipeOffset(deltaX);
        setSwipeDirection(deltaX > 0 ? 'right' : 'left');

        // Haptic feedback when crossing threshold
        if (!hasTriggeredHapticRef.current && Math.abs(deltaX) > HAPTIC_THRESHOLD) {
            hasTriggeredHapticRef.current = true;
            haptics.light();
        }
    }, [step]);

    // Callback for when speech is finalized
    const handleFinalTranscript = useCallback((text: string) => {
        setQuickNote(prev => (prev + ' ' + text).trim());
    }, []);

    const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition(handleFinalTranscript);

    // Track mount state for cleanup
    const isMountedRef = React.useRef(true);

    useEffect(() => {
        isMountedRef.current = true;

        // Play the user-selected alarm sound and start haptic ramp
        playAlarmBySound(alarm.soundId || 'somnia');
        startHapticAlarmRamp();

        return () => {
            // Only stop sound on actual unmount, not strict mode remount
            // Delay cleanup slightly to allow re-mount to cancel it
            isMountedRef.current = false;

            setTimeout(() => {
                // If component hasn't re-mounted, perform cleanup
                if (!isMountedRef.current) {
                    stopAlarmSound();
                    stopAlertnessBoost();
                    stopHapticAlarmRamp();
                }
            }, 50);
        };
    }, []); // Empty deps - only run once on mount

    // Handle snooze - show countdown instead of dismissing
    const handleSnooze = useCallback(() => {
        haptics.snooze();
        stopAlarmSound();
        stopHapticAlarmRamp();
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
                    startHapticAlarmRamp();
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
        stopHapticAlarmRamp();
        triggerWakePattern(); // Triple-pulse wake confirmation

        // Capture wake metrics NOW (time-to-silence, snooze count) before user goes through dream/boost
        if (onCaptureWakeMetrics) {
            onCaptureWakeMetrics();
        }

        if (isSleepAlarm) {
            setStep('dream');
        } else {
            // For reminder alarms, just dismiss
            onAwake();
        }
    }, [isSleepAlarm, onAwake, onCaptureWakeMetrics]);

    // Handle touch end - trigger action if threshold met (defined after handleAwake/handleSnooze)
    const handleTouchEnd = useCallback(() => {
        if (step !== 'alarm') return;

        const finalOffset = swipeOffset;
        const finalDirection = swipeDirection;

        // Reset swipe state
        setSwipeOffset(0);
        setSwipeDirection(null);
        touchStartRef.current = null;

        // Check if swipe threshold met
        if (Math.abs(finalOffset) >= SWIPE_THRESHOLD) {
            if (finalDirection === 'right') {
                // Swipe right = Wake up / Dismiss
                handleAwake();
            } else if (finalDirection === 'left') {
                // Swipe left = Snooze
                handleSnooze();
            }
        }
    }, [step, swipeOffset, swipeDirection, handleAwake, handleSnooze]);

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
            setBoostTimer(0);
        } else {
            playAlertnessBoost(boostVolume);
            setAlertnessOn(true);
            boostEverUsedRef.current = true; // Track that boost was used
            setBoostTimer(0);
        }
    }, [alertnessOn, boostVolume]);

    // Timer for boost
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (alertnessOn) {
            interval = setInterval(() => {
                setBoostTimer(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [alertnessOn]);

    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle volume change
    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setBoostVolume(newVolume);
        if (alertnessOn) {
            setAlertnessVolume(newVolume);
        }
    }, [alertnessOn]);

    // Final dismiss - close everything and save sleep data (when dream was skipped)
    const handleFinish = useCallback(() => {
        haptics.success();
        stopAlertnessBoost();
        // Finalize the session to create a SleepEntry even without a dream
        if (onFinalize) {
            onFinalize({ alertnessBoostUsed: boostEverUsedRef.current });
        }
        onAwake();
    }, [onAwake, onFinalize]);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Calculate swipe progress for visual feedback
    const swipeProgress = Math.min(Math.abs(swipeOffset) / SWIPE_THRESHOLD, 1);
    const isSwipingRight = swipeDirection === 'right';
    const isSwipingLeft = swipeDirection === 'left';

    return (
        <div
            className="fixed inset-0 bg-gradient-to-b from-indigo-900/95 to-purple-900/95 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto touch-pan-y"
            role="dialog"
            aria-modal="true"
            aria-label="Alarm ringing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pulsing visual wake element - only active during alarm step */}
            <PulsingWakeVisual isActive={step === 'alarm'} />

            {/* Swipe indicators - shown during active swipe */}
            {step === 'alarm' && swipeOffset !== 0 && (
                <>
                    {/* Left indicator (Snooze) */}
                    <div
                        className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-opacity"
                        style={{ opacity: isSwipingLeft ? swipeProgress : 0.2 }}
                    >
                        <div
                            className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
                            style={{
                                transform: `scale(${isSwipingLeft ? 0.8 + swipeProgress * 0.4 : 0.8})`,
                                backgroundColor: isSwipingLeft && swipeProgress >= 1 ? 'rgba(255,255,255,0.4)' : undefined,
                            }}
                        >
                            <span className="text-2xl">💤</span>
                        </div>
                        <span className="text-white/60 text-sm font-medium">Snooze</span>
                    </div>

                    {/* Right indicator (Wake) */}
                    <div
                        className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-opacity"
                        style={{ opacity: isSwipingRight ? swipeProgress : 0.2 }}
                    >
                        <div
                            className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
                            style={{
                                transform: `scale(${isSwipingRight ? 0.8 + swipeProgress * 0.4 : 0.8})`,
                                backgroundColor: isSwipingRight && swipeProgress >= 1 ? 'rgba(139,92,246,0.6)' : undefined,
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <span className="text-white/60 text-sm font-medium">Wake</span>
                    </div>
                </>
            )}

            <div
                className="w-full max-w-sm animate-fadeIn text-center py-6 relative z-10 transition-transform"
                style={{ transform: swipeOffset !== 0 ? `translateX(${swipeOffset * 0.3}px)` : undefined }}
            >
                {/* Swipe hint - only shown initially on alarm step */}
                {step === 'alarm' && swipeOffset === 0 && (
                    <p className="text-white/40 text-xs mb-4 animate-pulse">
                        ← Swipe to snooze or wake →
                    </p>
                )}

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
                                className="flex-1 py-5 min-h-[56px] bg-white/15 backdrop-blur border border-white/20 text-white font-semibold rounded-2xl text-lg hover:bg-white/25 transition-all active:scale-95 flex items-center justify-center"
                            >
                                Snooze 5m
                            </button>
                            <button
                                onClick={handleAwake}
                                aria-label={isSleepAlarm ? "Dismiss alarm and wake up" : "Dismiss reminder"}
                                className="flex-1 py-5 min-h-[56px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-2xl text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center"
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
                            aria-label="Cancel snooze and wake up"
                            className="w-full py-4 min-h-[56px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
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
                                    className="w-full p-3 min-h-[48px] text-base bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 resize-none focus:outline-none focus:border-white/40 mb-4"
                                    rows={3}
                                    autoFocus={!isSupported}
                                />
                            )}

                            {/* Type instead link */}
                            {!showInput && !quickNote && isSupported && (
                                <button
                                    onClick={() => setShowInput(true)}
                                    className="text-white/40 text-xs underline mb-4 block mx-auto py-2 min-h-[44px] px-4"
                                >
                                    Or type instead
                                </button>
                            )}

                            {/* Record Dream Button */}
                            <button
                                onClick={handleRecordDream}
                                className="w-full py-3.5 min-h-[48px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                            >
                                {quickNote ? 'Save & Record Full Dream' : 'Record Full Dream'}
                            </button>
                        </div>

                        {/* Skip option */}
                        <button
                            onClick={handleSkipDream}
                            className="text-white/40 text-sm hover:text-white/60 transition-colors py-2 min-h-[44px] px-6"
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
                                        Boost Active - Tap to Stop
                                    </span>
                                ) : (
                                    'Start Wake Up Boost'
                                )}
                            </button>
                            {alertnessOn && (
                                <p className="text-white/60 text-sm mt-3 font-mono text-center">
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
                                    style={{
                                        background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${boostVolume * 100}%, rgba(255,255,255,0.2) ${boostVolume * 100}%, rgba(255,255,255,0.2) 100%)`
                                    }}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:border-0"
                                    aria-label="Boost volume"
                                />
                            </div>
                        </div>

                        {/* Done button */}
                        <button
                            onClick={handleFinish}
                            aria-label="Finish and start the day"
                            className="w-full py-4 min-h-[56px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                        >
                            Start My Day
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
