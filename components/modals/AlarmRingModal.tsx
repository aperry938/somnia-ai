// components/modals/AlarmRingModal.tsx
import React, { useEffect, useState, useCallback, useRef, TouchEvent } from 'react';
import { playAlarmBySound, stopAlarmSound, playAlertnessBoost, stopAlertnessBoost, setAlertnessVolume } from '../../services/audioService';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { Alarm } from '../../types';
import { isDevMode } from '../../services/secureSubscriptionService';
import haptics from '../../services/hapticsService';
import { startHapticAlarmRamp, stopHapticAlarmRamp, triggerWakePattern } from '../../services/hapticAlarmService';
import { stopAlarm as stopNativeAlarm } from '../../services/nativeAlarmService';
import { sanitizeTextLive, INPUT_LIMITS } from '../../services/validationService';
import { logger } from '../../services/logger';

// Minimum distance (px) to trigger a swipe action
const SWIPE_THRESHOLD = 100;
// Distance at which first haptic feedback fires
const HAPTIC_THRESHOLD_FIRST = 40;
// Distance at which second (stronger) haptic feedback fires
const HAPTIC_THRESHOLD_SECOND = 80;

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
    onSnoozeReRing?: () => void; // Called when snooze expires and alarm re-rings (resets time-to-wake timer)
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

export const AlarmRingModal: React.FC<AlarmRingModalProps> = ({ alarm, onRecordDream, onSnooze, onAwake, onFinalize, onCaptureWakeMetrics, onSnoozeReRing }) => {
    // For reminder alarms, skip straight to dismiss - no dream prompts
    const isSleepAlarm = alarm.purpose !== 'reminder';

    const [step, setStep] = useState<WakeStep>('alarm');
    // Track if boost was ever used (for logging to sleep entry)
    const boostEverUsedRef = React.useRef(false);
    const [quickNote, setQuickNote] = useState('');
    const [currentPrompt] = useState(() => DREAM_PROMPTS[Math.floor(Math.random() * DREAM_PROMPTS.length)]);
    const [_showInput, setShowInput] = useState(false);
    const [alertnessOn, setAlertnessOn] = useState(false);
    const [boostVolume, setBoostVolume] = useState(0.25);
    const [boostTimer, setBoostTimer] = useState(0);
    const [snoozeRemaining, setSnoozeRemaining] = useState(SNOOZE_DURATION);

    // Swipe gesture state for easy dismiss (reduces fine motor requirements)
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    // Track progressive haptic feedback stages (0 = none, 1 = first threshold, 2 = second threshold)
    const hapticStageRef = useRef(0);

    // Screen Wake Lock to keep display on during alarm
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    // Acquire wake lock to prevent screen from turning off during alarm
    useEffect(() => {
        const acquireWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                    logger.log('[AlarmRingModal] Wake lock acquired');

                    // Re-acquire wake lock if released (e.g., tab becomes hidden then visible)
                    wakeLockRef.current.addEventListener('release', () => {
                        logger.log('[AlarmRingModal] Wake lock released');
                    });
                } catch (err) {
                    logger.warn('[AlarmRingModal] Wake lock request failed:', err);
                }
            }
        };

        acquireWakeLock();

        // Re-acquire wake lock when page becomes visible again
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && 'wakeLock' in navigator) {
                try {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                    logger.log('[AlarmRingModal] Wake lock re-acquired on visibility change');
                } catch (err) {
                    logger.warn('[AlarmRingModal] Wake lock re-acquire failed:', err);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {
                    // Ignore errors on release
                });
                wakeLockRef.current = null;
            }
        };
    }, []);

    // Handle touch start
    const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
        if (step !== 'alarm') return;
        const touch = e.touches[0];
        if (!touch) return;
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        hapticStageRef.current = 0; // Reset haptic feedback stage
        setSwipeOffset(0);
        setSwipeDirection(null);
    }, [step]);

    // Handle touch move - track swipe and provide progressive haptic feedback
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

        const absDelta = Math.abs(deltaX);

        // Progressive haptic feedback at two thresholds
        if (hapticStageRef.current === 0 && absDelta > HAPTIC_THRESHOLD_FIRST) {
            hapticStageRef.current = 1;
            haptics.light();
        } else if (hapticStageRef.current === 1 && absDelta > HAPTIC_THRESHOLD_SECOND) {
            hapticStageRef.current = 2;
            haptics.medium();
        }
    }, [step]);

    // Callback for when speech is finalized
    const handleFinalTranscript = useCallback((text: string) => {
        setQuickNote(prev => sanitizeTextLive(prev + ' ' + text).trim().slice(0, INPUT_LIMITS.notes));
    }, []);

    const { isListening, interimTranscript, startListening, stopListening, isSupported: _isSupported } = useSpeechRecognition(handleFinalTranscript);

    // Cleanup speech recognition on unmount
    useEffect(() => {
        return () => {
            if (isListening) {
                stopListening();
            }
        };
    }, [isListening, stopListening]);

    // Combine saved text with live transcription for display
    const displayText = isListening
        ? (quickNote ? quickNote + ' ' : '') + interimTranscript
        : quickNote;

    // Track mount state for cleanup
    const isMountedRef = React.useRef(true);
    // Track if audio failed to play (for fallback alerts)
    const [audioFailed, setAudioFailed] = useState(false);

    useEffect(() => {
        isMountedRef.current = true;

        // Play the user-selected alarm sound with error handling
        const startAlarm = async () => {
            try {
                await playAlarmBySound(alarm.soundId || 'somnia');
                logger.log('[AlarmRingModal] Audio started successfully');
            } catch (err) {
                logger.error('[AlarmRingModal] Audio playback failed:', err);
                setAudioFailed(true);
                // Haptics will still work as a fallback wake mechanism
            }
        };

        startAlarm();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only run once on mount (alarm.soundId is intentionally omitted)

    // Handle snooze - show countdown instead of dismissing
    const handleSnooze = useCallback(() => {
        haptics.snooze();
        stopAlarmSound();
        stopHapticAlarmRamp();
        stopNativeAlarm(); // Stop native AlarmService vibration
        if (isListening) stopListening();
        // Increment snooze count in the alarm manager
        if (onSnooze) onSnooze();
        setSnoozeRemaining(SNOOZE_DURATION);
        setStep('snooze');
    }, [isListening, stopListening, onSnooze]);

    // Track snooze re-ring count to trigger time reset
    const [snoozeReRingCount, setSnoozeReRingCount] = useState(0);

    // Snooze countdown timer
    useEffect(() => {
        if (step !== 'snooze') return;

        const interval = setInterval(() => {
            setSnoozeRemaining(prev => {
                if (prev <= 1) {
                    // Timer done - ring again
                    setStep('alarm');
                    // Play alarm with error handling
                    playAlarmBySound(alarm.soundId || 'somnia').catch(err => {
                        logger.error('[AlarmRingModal] Snooze re-ring audio failed:', err);
                        setAudioFailed(true);
                    });
                    startHapticAlarmRamp();
                    // Trigger re-ring count change to reset timer via separate effect
                    setSnoozeReRingCount(c => c + 1);
                    return SNOOZE_DURATION;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [step, alarm.soundId]);

    // Reset ring start time when snooze expires and alarm re-rings
    useEffect(() => {
        if (snoozeReRingCount > 0 && onSnoozeReRing) {
            onSnoozeReRing();
        }
    }, [snoozeReRingCount, onSnoozeReRing]);

    // Cancel snooze and wake up
    const cancelSnooze = useCallback(() => {
        haptics.medium();
        stopAlarmSound();
        stopHapticAlarmRamp();
        stopNativeAlarm(); // Stop native AlarmService vibration
        // Capture wake metrics when canceling snooze (same as handleAwake)
        if (onCaptureWakeMetrics) {
            onCaptureWakeMetrics();
        }
        setStep('dream');
    }, [onCaptureWakeMetrics]);

    // Handle "I'm Awake" - advance to dream capture for sleep alarms, or dismiss for reminders
    const handleAwake = useCallback(() => {
        haptics.success();
        stopAlarmSound();
        stopHapticAlarmRamp();
        stopNativeAlarm(); // Stop native AlarmService vibration
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
        hapticStageRef.current = 0;

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

    // Handle touch cancel (e.g., phone call interrupts, notification popup)
    const handleTouchCancel = useCallback(() => {
        setSwipeOffset(0);
        setSwipeDirection(null);
        touchStartRef.current = null;
        hapticStageRef.current = 0;
    }, []);

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
            className="fixed inset-0 bg-gradient-to-b from-indigo-900/95 to-purple-900/95 backdrop-blur-md flex items-center justify-center px-4 pt-4 pb-[calc(2rem+var(--safe-area-inset-bottom))] z-50 overflow-y-auto touch-pan-y"
            role="dialog"
            aria-modal="true"
            aria-label="Alarm ringing"
            aria-live="polite"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
        >
            {/* Swipe direction indicators - visual feedback during swipe */}
            {step === 'alarm' && swipeProgress > 0.1 && (
                <>
                    {/* Left indicator (Snooze) */}
                    <div
                        className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 transition-opacity"
                        style={{ opacity: isSwipingLeft ? swipeProgress : 0 }}
                        aria-hidden="true"
                    >
                        <div
                            className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
                            style={{ transform: `scale(${0.8 + swipeProgress * 0.4})` }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-white font-medium">Snooze</span>
                    </div>
                    {/* Right indicator (Wake) */}
                    <div
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 transition-opacity"
                        style={{ opacity: isSwipingRight ? swipeProgress : 0 }}
                        aria-hidden="true"
                    >
                        <span className="text-white font-medium">Wake</span>
                        <div
                            className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center"
                            style={{ transform: `scale(${0.8 + swipeProgress * 0.4})` }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                    </div>
                </>
            )}

            {/* Pulsing visual wake element - only active during alarm step */}
            <PulsingWakeVisual isActive={step === 'alarm'} />

            <div
                className="w-full max-w-sm animate-fadeIn text-center py-6 relative z-10 transition-transform"
                style={{ transform: swipeOffset !== 0 ? `translateX(${swipeOffset * 0.3}px)` : undefined }}
            >
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
                        {/* Audio failure warning - fallback to haptics */}
                        {audioFailed && (
                            <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl" role="alert">
                                <p className="text-amber-200 text-sm">
                                    Audio unavailable - using vibration alerts
                                </p>
                            </div>
                        )}

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
                                            className="px-4 py-2 min-h-[44px] bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 text-xs font-mono rounded-lg border border-yellow-500/30 transition-all"
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

                        {/* Swipe hint - icon based for visibility */}
                        <div className="w-full mt-6 px-2">
                            <div className="flex items-center justify-center gap-4 text-white/40 text-xs">
                                <div className="flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span>Snooze</span>
                                </div>
                                <div className="w-px h-4 bg-white/20" />
                                <div className="flex items-center gap-1">
                                    <span>Wake</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SNOOZE: Countdown display */}
                {step === 'snooze' && (
                    <div className="animate-fadeIn">
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-4 border border-white/10">
                            <p className="text-white/50 text-sm mb-2" id="snooze-label">Snoozing...</p>
                            <p
                                className="text-5xl font-light text-white mb-4"
                                role="timer"
                                aria-labelledby="snooze-label"
                                aria-live="off"
                                aria-atomic="true"
                            >
                                {Math.floor(snoozeRemaining / 60)}:{String(snoozeRemaining % 60).padStart(2, '0')}
                            </p>
                            {/* Screen reader friendly time announcement (less frequent) */}
                            <p className="sr-only" aria-live="polite">
                                {snoozeRemaining % 60 === 0 && snoozeRemaining > 0
                                    ? `${Math.floor(snoozeRemaining / 60)} minutes remaining`
                                    : snoozeRemaining === 30
                                        ? '30 seconds remaining'
                                        : snoozeRemaining === 10
                                            ? '10 seconds remaining'
                                            : null}
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
                            <p className="text-white/80 text-sm italic mb-4">"{currentPrompt}"</p>

                            {/* Voice Recording Button with visual feedback */}
                            <div className="mb-4 text-center">
                                <button
                                    onClick={toggleVoice}
                                    aria-label={isListening ? "Stop recording" : "Start recording your dream"}
                                    aria-pressed={isListening}
                                    className="relative w-20 h-20 mx-auto"
                                >
                                    {/* Pulsing rings when recording */}
                                    {isListening && (
                                        <>
                                            <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                                            <span className="absolute inset-[-8px] rounded-full border-2 border-red-400/50 animate-pulse" />
                                        </>
                                    )}
                                    <span className={`relative w-full h-full rounded-full flex items-center justify-center transition-all ${isListening
                                        ? 'bg-red-500 scale-100'
                                        : 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-105 shadow-lg shadow-purple-500/30'
                                        }`}
                                    >
                                        {isListening ? (
                                            /* Stop icon (square) when recording */
                                            <span className="w-6 h-6 bg-white rounded-sm" />
                                        ) : (
                                            /* Mic icon when not recording */
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                            </svg>
                                        )}
                                    </span>
                                </button>
                                <p className="text-white/50 text-xs mt-2">
                                    {isListening ? '' : 'Tap to speak'}
                                </p>
                            </div>

                            {/* Text display - shows live transcription when recording */}
                            <textarea
                                value={displayText}
                                onChange={(e) => setQuickNote(sanitizeTextLive(e.target.value).slice(0, INPUT_LIMITS.notes))}
                                maxLength={INPUT_LIMITS.notes}
                                placeholder={isListening ? "Listening..." : "Key words, images, feelings..."}
                                aria-label="Quick dream notes"
                                readOnly={isListening}
                                className={`w-full p-3 min-h-[48px] text-base bg-white/10 border rounded-xl text-white placeholder-white/40 resize-none focus:outline-none mb-4 ${isListening ? 'border-red-400/50' : 'border-white/20 focus:border-white/40'}`}
                                rows={3}
                            />

                            {/* Record Dream Button */}
                            <button
                                onClick={handleRecordDream}
                                aria-label={quickNote ? "Save quick note and record full dream" : "Record full dream"}
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
                                className={`w-full py-4 min-h-[56px] rounded-xl font-semibold text-lg transition-all flex items-center justify-center ${alertnessOn
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

                            {/* Volume Slider - 44px touch target for accessibility */}
                            <div className="mt-4 px-2">
                                <div className="flex justify-between text-xs text-white/50 mb-1">
                                    <span id="volume-label">Volume</span>
                                    <span aria-hidden="true">{Math.round(boostVolume * 100)}%</span>
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
                                    className="w-full h-11 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:-mt-2.5 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:border-0"
                                    aria-label="Boost volume"
                                    aria-labelledby="volume-label"
                                    aria-valuemin={5}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round(boostVolume * 100)}
                                    aria-valuetext={`${Math.round(boostVolume * 100)} percent`}
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
