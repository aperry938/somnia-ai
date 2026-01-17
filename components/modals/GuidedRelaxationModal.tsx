import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { GuidedRelaxation } from '../../types';
import { playBreathSound } from '../../services/audioService';
import { startResonanceBreathing, ResonanceBreathingState } from '../../services/psychoacousticService';
import { useAppContext } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import haptics from '../../services/hapticsService';
import { useBackButton } from '../../hooks/useBackButton';

const CircleVisualizer = React.memo<{ animationClass: string; animKey: number; isAnimating: boolean }>(({ animationClass, animKey, isAnimating }) => (
    <div className="w-40 h-40 flex justify-center items-center">
        <div
            key={animKey}
            className={`w-20 h-20 rounded-full bg-day-accent dark:bg-night-accent transform transition-all duration-300 ${isAnimating ? animationClass : 'scale-[0.8] opacity-70'}`}
        ></div>
    </div>
));

// Bar indices for wave visualizer - defined outside component to prevent re-creation
const WAVE_BAR_INDICES = Array.from({ length: 24 }, (_, i) => i);
const WAVE_BAR_COUNT = WAVE_BAR_INDICES.length;

// Waveform visualizer for Resonance Chamber - shows peaks during inhale, valleys during exhale
const ResonanceWaveVisualizer = React.memo<{ phase: 'inhale' | 'exhale' | 'idle'; isAnimating: boolean }>(({ phase, isAnimating }) => {
    // Memoize bar styles based on phase and isAnimating
    const barStyles = useMemo(() => {
        return WAVE_BAR_INDICES.map((index) => {
            if (!isAnimating) {
                return {
                    height: '20%',
                    opacity: 0.5,
                    transition: 'all 0.5s ease-out',
                };
            }

            // Create a wave pattern across the bars
            const position = index / (WAVE_BAR_COUNT - 1); // 0 to 1
            const waveOffset = Math.sin(position * Math.PI); // Peak in middle

            // Different behavior for inhale vs exhale
            if (phase === 'inhale') {
                // Inhale: waves rise from center, building intensity
                const baseHeight = 25 + waveOffset * 55; // 25% to 80%
                const variation = Math.sin(position * Math.PI * 3) * 8; // Add ripples
                return {
                    height: `${baseHeight + variation}%`,
                    opacity: 0.6 + waveOffset * 0.4,
                    transition: 'all 5.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: `scaleY(1)`,
                };
            } else {
                // Exhale: waves fall back down, intensity subsides
                const baseHeight = 15 + waveOffset * 15; // 15% to 30%
                const variation = Math.sin(position * Math.PI * 3) * 3;
                return {
                    height: `${baseHeight + variation}%`,
                    opacity: 0.4 + waveOffset * 0.2,
                    transition: 'all 5.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: `scaleY(1)`,
                };
            }
        });
    }, [phase, isAnimating]);

    return (
        <div className="w-48 h-40 flex items-center justify-center gap-[3px]">
            {WAVE_BAR_INDICES.map((i) => (
                <div
                    key={i}
                    className="w-1.5 rounded-full bg-day-accent dark:bg-night-accent"
                    style={barStyles[i]}
                />
            ))}
        </div>
    );
});


const BoxVisualizer = React.memo<{ animKey: number; isAnimating: boolean }>(({ animKey, isAnimating }) => (
    <div key={animKey} className="w-40 h-40 flex justify-center items-center">
        <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
            <path
                d="M0 0 H120 V120 H0 Z"
                fill="none"
                stroke="rgba(129, 140, 248, 0.3)"
                strokeWidth="4"
            />
            <path
                d="M0 0 H120 V120 H0 Z"
                fill="none"
                stroke="currentColor"
                className={`text-day-accent dark:text-night-accent ${isAnimating ? 'animate-box-breathing-16s' : ''}`}
                strokeWidth="4"
                strokeDasharray="480"
                strokeDashoffset="480"
            />
        </svg>
    </div>
));

type CycleStep = {
    text: string;
    duration: number;
    anim: string;
    sound?: 'in' | 'out';
    vibrate?: number; // Vibration duration in ms (for inhale/exhale cues)
};

// Haptic feedback helper using centralized service
const triggerHaptic = (duration: number) => {
    if (duration <= 100) {
        haptics.breatheIn();
    } else {
        haptics.breatheOut();
    }
};

export const GuidedRelaxationModal: React.FC<{ relaxation: GuidedRelaxation, onClose: () => void }> = ({ relaxation, onClose }) => {
    const [sessionState, setSessionState] = useState<'ready' | 'starting' | 'running'>('ready');
    const [stepIndex, setStepIndex] = useState(0);
    const resonanceRef = useRef<ResonanceBreathingState | null>(null);

    // Swipe-to-dismiss
    const y = useMotionValue(0);
    const backdropOpacity = useTransform(y, [0, 200], [1, 0.3]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
            haptics.medium();
            endSession();
        }
    };
    const [instruction, setInstruction] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [animationClass, setAnimationClass] = useState('scale-[0.8] opacity-70');
    const [animationKey, setAnimationKey] = useState(0);
    const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale' | 'idle'>('idle');
    const [sessionDuration, setSessionDuration] = useState(5); // minutes
    const [totalTimeRemaining, setTotalTimeRemaining] = useState(0); // seconds
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
    const { setActiveSleepAid, logBreathingActivity, ensureSleepSession } = useAppContext();
    const { showToast } = useToast();

    const DURATION_PRESETS = [2, 5, 10]; // minutes

    const cycle: CycleStep[] = useMemo(() => {
        if (relaxation.id === 'box_breathing') {
            return [
                { text: 'Inhale (nose)', duration: 4000, sound: 'in', anim: 'animate-box-breathing-16s', vibrate: 100 },
                { text: 'Hold', duration: 4000, anim: 'animate-box-breathing-16s' },
                { text: 'Exhale (mouth)', duration: 4000, sound: 'out', anim: 'animate-box-breathing-16s', vibrate: 200 },
                { text: 'Hold', duration: 4000, anim: 'animate-box-breathing-16s' },
            ];
        } else if (relaxation.id === '478_breathing') {
            return [
                { text: 'Inhale (nose)', duration: 4000, anim: 'animate-inhale-4s', sound: 'in', vibrate: 100 },
                { text: 'Hold', duration: 7000, anim: 'scale-[1.6] opacity-100' },
                { text: 'Exhale (mouth)', duration: 8000, anim: 'animate-exhale-8s', sound: 'out', vibrate: 200 },
            ];
        } else if (relaxation.id === 'resonance_chamber') {
            // HRV-optimized 5.5s in / 5.5s out (11s cycle = 0.1Hz)
            return [
                { text: 'Inhale slowly', duration: 5500, anim: 'animate-inhale-5s', vibrate: 100 },
                { text: 'Exhale slowly', duration: 5500, anim: 'animate-exhale-5s', vibrate: 200 },
            ];
        }
        return [];
    }, [relaxation.id]);

    // Effect for the main cycle
    useEffect(() => {
        if (sessionState !== 'running') return;

        const currentStep = cycle[stepIndex];
        if (!currentStep) return;

        // 1. Update UI
        setInstruction(currentStep.text);
        setCountdown(currentStep.duration / 1000);

        if (relaxation.id === '478_breathing') {
            setAnimationClass(currentStep.anim);
            // Only increment key (to restart animation) if it's an actual animation class
            if (currentStep.anim.startsWith('animate-')) {
                setAnimationKey(k => k + 1);
            }
        } else if (relaxation.id === 'box_breathing') {
            setAnimationClass('animate-box-breathing-16s');
            // Restart the box animation at the beginning of each cycle
            if (stepIndex === 0) {
                setAnimationKey(k => k + 1);
            }
        } else if (relaxation.id === 'resonance_chamber') {
            // Update breath phase for waveform visualizer
            setBreathPhase(stepIndex === 0 ? 'inhale' : 'exhale');
        }

        // 2. Play Sound and Haptic
        if (currentStep.sound) {
            try {
                playBreathSound(currentStep.sound, currentStep.duration / 1000);
            } catch (error) {
                console.error('Failed to play breath sound:', error);
                // Don't show toast for breath sounds as they're frequent - just log silently
            }
        }
        if (currentStep.vibrate) {
            triggerHaptic(currentStep.vibrate);
        }

        // 3. Countdown timer for UI
        const countdownInterval = setInterval(() => {
            setCountdown(prev => (prev > 1 ? prev - 1 : 0));
        }, 1000);

        // 4. Timer to advance to next step
        const stepTimer = setTimeout(() => {
            setStepIndex(prev => (prev + 1) % cycle.length);
        }, currentStep.duration);

        return () => {
            clearInterval(countdownInterval);
            clearTimeout(stepTimer);
        };
    }, [sessionState, stepIndex, cycle, relaxation.id]);

    // Effect for the "Get Ready" state
    useEffect(() => {
        if (sessionState === 'starting') {
            setInstruction('Get ready...');
            setAnimationClass(relaxation.id === 'box_breathing' ? '' : 'scale-[0.8] opacity-70');
            const readyTimer = setTimeout(() => {
                // Start resonance breathing audio for resonance_chamber
                if (relaxation.id === 'resonance_chamber') {
                    try {
                        resonanceRef.current = startResonanceBreathing(0.5);
                    } catch (error) {
                        console.error('Failed to start resonance breathing audio:', error);
                        showToast('Audio playback failed. Session will continue without sound.', 'warning');
                        haptics.error();
                    }
                }
                setSessionState('running');
                setStepIndex(0); // Ensure cycle starts from the beginning
            }, 2000);
            return () => clearTimeout(readyTimer);
        }
    }, [sessionState, relaxation.id]);

    const startSession = () => {
        haptics.medium();
        // Ensure session exists so breathing activity gets logged
        ensureSleepSession();
        setSessionStartTime(Date.now());
        setTotalTimeRemaining(sessionDuration * 60);
        setSessionState('starting');
    };

    // Session timer - counts down total session time
    useEffect(() => {
        if (sessionState !== 'running' || !sessionStartTime) return;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
            const remaining = Math.max(0, sessionDuration * 60 - elapsed);
            setTotalTimeRemaining(remaining);

            // Auto-end when time runs out
            if (remaining === 0) {
                haptics.success();
                endSession();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [sessionState, sessionStartTime, sessionDuration]);

    const endSession = () => {
        haptics.light();
        // Stop resonance breathing audio if active
        if (resonanceRef.current) {
            resonanceRef.current.stop();
            resonanceRef.current = null;
        }
        // Log the actual duration spent in this breathing exercise
        if (sessionStartTime) {
            const elapsedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
            if (elapsedSeconds > 0) {
                logBreathingActivity(relaxation.name, elapsedSeconds);
            }
        }
        setSessionState('ready');
        setStepIndex(0);
        setCountdown(0);
        setInstruction('');
        setSessionStartTime(null);
        setTotalTimeRemaining(0);
        setAnimationClass(relaxation.id === 'box_breathing' ? '' : 'scale-[0.8] opacity-70');
        setBreathPhase('idle');
        onClose();
    };

    // Handle hardware back button (Android) - always active since modal only renders when open
    useBackButton(true, endSession);

    // Format time as M:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        setActiveSleepAid('relaxation', relaxation.name);
        return () => setActiveSleepAid('relaxation', null);
    }, [relaxation.name, setActiveSleepAid]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') endSession();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Emergency cleanup on unmount - prevents audio leaks if component unmounts unexpectedly
    useEffect(() => {
        return () => {
            if (resonanceRef.current) {
                resonanceRef.current.stop();
                resonanceRef.current = null;
            }
        };
    }, []);

    return (
        <motion.div
            className="fixed inset-0 bg-day-bg-start/70 dark:bg-night-bg-start/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 pb-[calc(6.5rem+var(--safe-area-inset-bottom))] sm:pb-4"
            onClick={endSession}
            role="dialog"
            aria-modal="true"
            aria-labelledby="relaxation-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-white/95 dark:bg-slate-800/95 border border-day-border dark:border-night-border rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(1.5rem+var(--safe-area-inset-bottom))] sm:pb-6 w-full max-w-sm text-center"
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
                    <div className="w-10 h-1 rounded-full bg-day-border dark:bg-night-border" />
                </div>
                <h2 id="relaxation-title" className="font-serif text-2xl mb-4">{relaxation.name}</h2>

                {sessionState === 'ready' ? (
                    <div className="animate-fadeIn">
                        <p className="text-day-text-secondary dark:text-night-text-secondary my-4 text-sm">{relaxation.description}</p>

                        {/* Duration Presets */}
                        <div className="mb-6">
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mb-2">Session Duration</p>
                            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Session duration options">
                                {DURATION_PRESETS.map(mins => (
                                    <button
                                        key={mins}
                                        onClick={() => setSessionDuration(mins)}
                                        aria-label={`${mins} minute session`}
                                        aria-pressed={sessionDuration === mins}
                                        className={`py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center justify-center ${sessionDuration === mins
                                            ? 'bg-day-accent dark:bg-night-accent text-white'
                                            : 'bg-white/50 dark:bg-black/30 border border-day-border dark:border-night-border hover:border-day-accent dark:hover:border-night-accent'
                                            }`}
                                    >
                                        {mins} min
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={startSession} aria-label={`Start ${sessionDuration} minute session`} className="w-full py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-bold rounded-full text-lg shadow-lg flex items-center justify-center">Start Session</button>
                        <button onClick={onClose} aria-label="Close relaxation modal" className="w-full mt-3 py-2 min-h-[44px] text-day-text-secondary dark:text-night-text-secondary flex items-center justify-center">Close</button>
                    </div>
                ) : (
                    <div className="animate-fadeIn">
                        <div className="flex justify-center items-center my-8 h-40">
                            {relaxation.id === 'box_breathing'
                                ? <BoxVisualizer animKey={animationKey} isAnimating={sessionState === 'running'} />
                                : relaxation.id === 'resonance_chamber'
                                    ? <ResonanceWaveVisualizer phase={breathPhase} isAnimating={sessionState === 'running'} />
                                    : <CircleVisualizer animationClass={animationClass} animKey={animationKey} isAnimating={sessionState === 'running'} />
                            }
                        </div>
                        <p className="text-xl font-medium h-8">
                            {instruction}
                            {sessionState === 'running' && ` (${countdown}s)`}
                        </p>
                        {/* Total Time Remaining */}
                        {sessionState === 'running' && totalTimeRemaining > 0 && (
                            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mt-2">
                                {formatTime(totalTimeRemaining)} remaining
                            </p>
                        )}
                        <button onClick={endSession} aria-label="End session" className="w-full mt-6 py-2 min-h-[44px] bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">End Session</button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};