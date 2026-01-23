import React, { useState, useEffect, useCallback, useRef } from 'react';
// Temporarily disable framer-motion to debug freeze issue
// import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Soundscape } from '../../types';
import { playSleepSound, stopSleepSound, setLiveVolume, shouldPersistSleepSound, isSleepSoundPlaying } from '../../services/audioService';
import { useAppContext } from '../../contexts/AppContext';
import haptics from '../../services/hapticsService';
import { useBackButton } from '../../hooks/useBackButton';
import { useToast } from '../shared/Toast';

// Placeholder types for disabled framer-motion (reserved for future swipe-to-dismiss)
// type PanInfo = { offset: { y: number }; velocity: { y: number } };

interface SoundscapeModalProps {
    sound: Soundscape;
    isPlaying: boolean;
    onPlay: (soundId: string) => void;
    onStop: () => void;
    onClose: () => void;
    onFallAsleep?: () => void; // Called when user clicks "Fall Asleep Now" - keeps sound playing
}

export const SoundscapeModal: React.FC<SoundscapeModalProps> = ({ sound, isPlaying, onPlay, onStop, onClose, onFallAsleep }) => {
    const { volume, setVolume, logSoundActivity, activeSleepSession: _activeSleepSession, ensureSleepSession, createSleepEntryForSession } = useAppContext();
    const { showToast } = useToast();
    const [duration, setDuration] = useState(30);

    // Swipe-to-dismiss disabled for now (framer-motion removed for debugging)
    // const y = useMotionValue(0);
    // const backdropOpacity = useTransform(y, [0, 200], [1, 0.3]);

    // Swipe-to-dismiss handler (reserved for future use when framer-motion re-enabled)
    // const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    //     if (info.offset.y > 100 || info.velocity.y > 500) {
    //         haptics.medium();
    //         handleClose();
    //     }
    // };
    const [beatFreq] = useState(sound.type === 'binaural' ? sound.params.diff || 5 : 5);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null); // Seconds remaining
    const [playStartTime, setPlayStartTime] = useState<number | null>(null);
    const [playDuration, setPlayDuration] = useState<number>(0); // Duration in seconds
    const [isPaused, setIsPaused] = useState(false); // Track pause state
    const [isReadyToPlay, setIsReadyToPlay] = useState(false); // Show play screen but not started yet
    const [isSettling, setIsSettling] = useState(true); // Prevent accidental backdrop clicks on mount
    const [volumeAnnouncement, setVolumeAnnouncement] = useState<string>(''); // For screen reader announcements
    const pausedTimeRef = useRef<number>(0); // Track time remaining when paused
    const soundStartTimeRef = useRef<number | null>(null); // Track when sound actually started (for logging)
    const accumulatedPlayTimeRef = useRef<number>(0); // Track accumulated play time across pause/resume cycles
    const timerStartRef = useRef<number | null>(null); // Track timer start time (avoids closure issues)
    const timerDurationRef = useRef<number>(0); // Track timer duration (avoids closure issues)
    const skipCleanupRef = useRef<boolean>(false); // Skip cleanup when transitioning to full play or fall asleep

    // No auto-preview - user must click to start preview

    // Allow backdrop clicks after modal has settled (prevents accidental closes on touch devices)
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsSettling(false);
        }, 300); // 300ms settling time for touch interactions
        return () => clearTimeout(timer);
    }, []);

    // Cleanup on unmount - carefully handle different scenarios
    useEffect(() => {
        // Capture ref for cleanup (React 19+ requirement)
        const volumeTimeout = volumeAnnouncementTimeoutRef.current;
        return () => {
            // Cleanup volume announcement timeout
            if (volumeTimeout) {
                clearTimeout(volumeTimeout);
            }
            // NEVER stop if user clicked "Fall Asleep Now" (ref set, or persistence enabled)
            if (skipCleanupRef.current || shouldPersistSleepSound()) {
                return;
            }
            // If sound is actively playing, don't stop it
            // This handles stale closure during preview→play transition
            // isSleepSoundPlaying() checks CURRENT state, not captured
            if (isSleepSoundPlaying()) {
                return;
            }
            // If we were previewing and sound isn't playing, try to stop (cleanup)
            if (isPreviewing) {
                stopSleepSound(0.3);
            }
        };
    }, [isPreviewing, isPlaying]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // handleClose is intentionally omitted to keep listener stable

    // Timer countdown when playing (not when paused or ready)
    // Uses refs inside interval to avoid stale closure issues
    useEffect(() => {
        if (playStartTime === null || playDuration === 0 || isPaused || isReadyToPlay) return;

        // Store values in refs for interval callback to use (avoids stale closures)
        timerStartRef.current = playStartTime;
        timerDurationRef.current = playDuration;

        // Initial tick immediately to sync UI
        const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000);
        const initialRemaining = Math.max(0, timerDurationRef.current - elapsed);
        setTimeRemaining(initialRemaining);

        const interval = setInterval(() => {
            // Use refs to get current values (avoids closure issues)
            const startTime = timerStartRef.current;
            const duration = timerDurationRef.current;

            if (startTime === null || duration === 0) {
                clearInterval(interval);
                return;
            }

            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, duration - elapsed);
            setTimeRemaining(remaining);

            // Auto-stop when timer reaches 0
            if (remaining === 0) {
                timerStartRef.current = null;
                timerDurationRef.current = 0;
                setTimeRemaining(null);
                setPlayStartTime(null);
                setIsReadyToPlay(false);
                setIsPaused(false);
                onStop();
                clearInterval(interval);
            }
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [playStartTime, playDuration, isPaused, isReadyToPlay, onStop]);

    // Format seconds to MM:SS or HH:MM:SS
    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Live update volume with debounced screen reader announcement
    const volumeAnnouncementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastVolumeStepRef = useRef<number>(Math.round(volume * 20)); // Track steps for haptic tick
    const handleVolumeChange = useCallback((newVolume: number) => {
        setVolume(newVolume);
        if (isPreviewing || isPlaying) {
            setLiveVolume(newVolume);
        }
        // Haptic tick on major step changes (every 5%)
        const newStep = Math.round(newVolume * 20);
        if (newStep !== lastVolumeStepRef.current) {
            lastVolumeStepRef.current = newStep;
            haptics.tick();
        }
        // Debounce screen reader announcement to avoid spam during slider drag
        if (volumeAnnouncementTimeoutRef.current) {
            clearTimeout(volumeAnnouncementTimeoutRef.current);
        }
        volumeAnnouncementTimeoutRef.current = setTimeout(() => {
            setVolumeAnnouncement(`Volume ${Math.round(newVolume * 100)} percent`);
        }, 300);
    }, [isPreviewing, isPlaying, setVolume]);

    // Toggle preview on/off
    const togglePreview = useCallback(async () => {
        if (isPreviewing) {
            haptics.light();
            stopSleepSound(0.3);
            setIsPreviewing(false);
        } else {
            const soundToPlay = { ...sound };
            if (sound.type === 'binaural') {
                soundToPlay.params = { ...sound.params, diff: beatFreq };
            }
            try {
                await playSleepSound(soundToPlay, 0, volume);
                haptics.light();
                setIsPreviewing(true);
            } catch (_error) {
                showToast('Failed to preview sound. Please try again.', 'error');
                haptics.error();
            }
        }
    }, [isPreviewing, sound, beatFreq, volume, showToast]);

    // Transition to ready-to-play state (shows Start Sound button)
    const handlePlay = async () => {
        // Stop any preview sound first
        stopSleepSound(0.1);
        setIsPreviewing(false);

        // Set up the duration and transition to ready state
        setPlayDuration(duration * 60);
        setTimeRemaining(duration * 60);
        setIsReadyToPlay(true);
        setIsPaused(false);
        onPlay(sound.id); // Mark as "playing" state in parent
    };

    // Quick duration buttons - transition to ready state with selected duration
    const handleDurationClick = async (mins: number) => {
        setDuration(mins);

        // Stop any preview sound first
        stopSleepSound(0.1);
        setIsPreviewing(false);

        // Set up the duration and transition to ready state
        setPlayDuration(mins * 60);
        setTimeRemaining(mins * 60);
        setIsReadyToPlay(true);
        setIsPaused(false);
        onPlay(sound.id); // Mark as "playing" state in parent
    };

    // Actually start the sound playback
    const handleStartSound = async () => {
        // Auto-create sleep session if none exists - ensures sound activity gets logged
        ensureSleepSession();

        const soundToPlay = { ...sound };
        if (sound.type === 'binaural') {
            soundToPlay.params = { ...sound.params, diff: beatFreq };
        }

        // Calculate remaining duration in minutes
        const durationSeconds = timeRemaining || playDuration;
        const remainingMinutes = durationSeconds / 60;

        try {
            await playSleepSound(soundToPlay, remainingMinutes, volume);
            haptics.medium(); // Haptic feedback on successful play start

            const now = Date.now();
            soundStartTimeRef.current = now; // Track for activity logging
            accumulatedPlayTimeRef.current = 0; // Reset accumulated time for new session

            // Sync refs for timer interval (avoids stale closures)
            timerStartRef.current = now;
            timerDurationRef.current = durationSeconds;

            // Set all states together - playStartTime triggers the timer effect
            setIsReadyToPlay(false);
            setIsPaused(false);
            setPlayDuration(durationSeconds); // Ensure playDuration is in sync
            setPlayStartTime(now);
        } catch (_error) {
            showToast('Failed to play soundscape. Please try again.', 'error');
            haptics.error();
            // Reset to ready state so user can retry
            setIsReadyToPlay(true);
        }
    };

    // Fall asleep with sound playing - logs activity, creates entry, keeps sound playing
    const handleFallAsleep = () => {
        haptics.success();

        // CRITICAL: Set skip flag BEFORE any state changes that might trigger cleanup
        skipCleanupRef.current = true;

        // Log the current sound activity (accumulated time + current segment)
        let totalPlayTime = accumulatedPlayTimeRef.current;
        if (soundStartTimeRef.current) {
            totalPlayTime += Math.floor((Date.now() - soundStartTimeRef.current) / 1000);
        }
        if (totalPlayTime > 0) {
            logSoundActivity(sound.name, totalPlayTime);
        }
        // Reset tracking for any continued playback
        soundStartTimeRef.current = Date.now();
        accumulatedPlayTimeRef.current = 0;

        // Create the sleep entry with current prep data
        createSleepEntryForSession();

        // Notify parent to transition to sleeping state (but DON'T stop the sound)
        // Parent's onFallAsleep sets persistence and closes the modal
        if (onFallAsleep) {
            onFallAsleep();
        }
        // Don't call onClose() here - it would clear selectedSound which we need for "Now Playing" indicator
    };

    // Pause the sound and timer
    const handlePause = () => {
        haptics.light(); // Haptic feedback on pause
        stopSleepSound(0.3);
        pausedTimeRef.current = timeRemaining || 0;
        // Accumulate play time from this segment
        if (soundStartTimeRef.current) {
            accumulatedPlayTimeRef.current += Math.floor((Date.now() - soundStartTimeRef.current) / 1000);
        }
        // Clear timer refs to stop interval
        timerStartRef.current = null;
        timerDurationRef.current = 0;

        setIsPaused(true);
        setPlayStartTime(null);
    };

    // Resume from pause
    const handleResume = async () => {
        const soundToPlay = { ...sound };
        if (sound.type === 'binaural') {
            soundToPlay.params = { ...sound.params, diff: beatFreq };
        }

        // Resume with remaining time
        const remainingSeconds = pausedTimeRef.current;
        const remainingMinutes = remainingSeconds / 60;

        try {
            await playSleepSound(soundToPlay, remainingMinutes, volume);
            haptics.medium(); // Haptic feedback on successful resume

            const now = Date.now();
            // Reset start time for this segment (accumulated time preserved separately)
            soundStartTimeRef.current = now;

            // Sync refs for timer interval (avoids stale closures)
            timerStartRef.current = now;
            timerDurationRef.current = remainingSeconds;

            // Set all states together - playStartTime triggers the timer effect
            setPlayDuration(remainingSeconds);
            setIsReadyToPlay(false);
            setIsPaused(false);
            setPlayStartTime(now);
        } catch (_error) {
            showToast('Failed to resume sound. Please try again.', 'error');
            haptics.error();
            // Keep paused state so user can retry
        }
    };

    // Fully stop and close (called by X button)
    const handleStop = () => {
        // Log sound activity (accumulated time + current segment)
        let totalPlayTime = accumulatedPlayTimeRef.current;
        if (soundStartTimeRef.current) {
            totalPlayTime += Math.floor((Date.now() - soundStartTimeRef.current) / 1000);
        }
        if (totalPlayTime > 0) {
            // Ensure session exists before logging (handles race condition from handleStartSound)
            ensureSleepSession();
            logSoundActivity(sound.name, totalPlayTime);
        }
        soundStartTimeRef.current = null;
        accumulatedPlayTimeRef.current = 0;

        // Clear timer refs
        timerStartRef.current = null;
        timerDurationRef.current = 0;

        stopSleepSound();
        setIsPreviewing(false);
        setTimeRemaining(null);
        setPlayStartTime(null);
        setIsReadyToPlay(false);
        setIsPaused(false);
        onStop();
    };

    const handleClose = () => {
        // When closing via X button, stop everything and close
        if (isPlaying || isReadyToPlay || isPaused) {
            handleStop();
        }
        // Stop preview when closing without playing
        if (isPreviewing) {
            stopSleepSound(0.3);
            setIsPreviewing(false);
        }
        onClose();
    };

    // Handle hardware back button (Android) - always active since modal only renders when open
    useBackButton(true, handleClose);

    // Handle backdrop click - only close if not in playing state and modal has settled
    const handleBackdropClick = () => {
        // Prevent accidental closes during settling period (fixes mobile touch issues)
        if (isSettling) {
            return;
        }
        // Don't close if in any active state
        if (!isPlaying && !isReadyToPlay && !isPaused && !isPreviewing) {
            handleClose();
        }
    };

    // Determine if we're in the "playing view" (ready, playing, or paused)
    const isInPlayingView = isPlaying || isReadyToPlay || isPaused;

    return (
        <div
            className={`fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 sm:pb-4 ${isInPlayingView ? 'pb-[calc(2rem+var(--safe-area-inset-bottom))]' : 'pb-[calc(6.5rem+var(--safe-area-inset-bottom))]'}`}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="soundscape-title"
        >
            <div
                className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(1.5rem+var(--safe-area-inset-bottom))] sm:pb-6 w-full max-w-sm text-center relative"
                onClick={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                {/* Screen reader announcement for volume changes */}
                <div className="sr-only" aria-live="polite" aria-atomic="true">
                    {volumeAnnouncement}
                </div>

                {/* Drag indicator for mobile */}
                <div className="flex justify-center pb-2 sm:hidden cursor-grab active:cursor-grabbing">
                    <div className="w-10 h-1 rounded-full bg-day-border dark:bg-night-border" />
                </div>
                <button
                    onClick={handleClose}
                    className="absolute top-2 right-2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    aria-label="Close soundscape modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Live Preview Indicator */}
                {isPreviewing && !isInPlayingView && (
                    <div className="absolute top-4 left-4 flex items-center gap-1.5" aria-live="polite">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
                        <span className="text-[10px] text-green-500 font-medium uppercase tracking-wider">Live Preview</span>
                    </div>
                )}

                <div className="flex justify-center items-center h-16 w-16 mx-auto text-day-accent dark:text-night-accent" aria-hidden="true">{sound.icon}</div>
                <h2 id="soundscape-title" className="font-serif text-2xl mt-2">{sound.name}</h2>
                <p className="text-day-text-secondary dark:text-night-text-secondary my-4 text-sm">{sound.description}</p>

                {isInPlayingView ? (
                    <div className="space-y-4">
                        {/* Status Indicator */}
                        {isReadyToPlay ? (
                            <div className="flex items-center justify-center gap-2 text-day-text-secondary dark:text-night-text-secondary">
                                <span className="text-sm font-medium uppercase tracking-wider">Ready to Play</span>
                            </div>
                        ) : isPaused ? (
                            <div className="flex items-center justify-center gap-2 text-amber-500">
                                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                                <span className="text-sm font-medium uppercase tracking-wider">Paused</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 text-day-accent dark:text-night-accent">
                                <div className="w-2 h-2 bg-day-accent dark:bg-night-accent rounded-full animate-pulse" />
                                <span className="text-sm font-medium uppercase tracking-wider">Now Playing</span>
                            </div>
                        )}

                        {/* Large Timer Display */}
                        {timeRemaining !== null && (
                            <div className="py-4">
                                <p className="text-5xl font-serif text-day-text-primary dark:text-night-text-primary">
                                    {formatTime(isPaused ? pausedTimeRef.current : timeRemaining)}
                                </p>
                                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-2">
                                    {isReadyToPlay ? 'duration' : 'remaining'}
                                </p>
                            </div>
                        )}

                        {/* Volume Control During Playback */}
                        <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg text-left">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-day-text-secondary dark:text-night-text-secondary">Volume</span>
                                <span className="font-mono text-day-accent dark:text-night-accent" aria-hidden="true">{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={volume}
                                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                aria-label={`Volume: ${Math.round(volume * 100)}%`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(volume * 100)}
                                aria-valuetext={`${Math.round(volume * 100)} percent`}
                                className="w-full h-11 accent-day-accent dark:accent-night-accent cursor-pointer touch-pan-x"
                            />
                        </div>

                        {/* Action Button - Start, Pause, or Resume */}
                        {isReadyToPlay ? (
                            <button
                                onClick={handleStartSound}
                                aria-label="Start sound"
                                className="w-full py-4 min-h-[48px] bg-day-accent dark:bg-night-accent hover:brightness-110 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Start Sound
                            </button>
                        ) : isPaused ? (
                            <button
                                onClick={handleResume}
                                aria-label="Resume sound"
                                className="w-full py-4 min-h-[48px] bg-day-accent dark:bg-night-accent hover:brightness-110 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Resume Sound
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <button
                                    onClick={handlePause}
                                    aria-label="Pause sound"
                                    className="w-full py-4 min-h-[48px] bg-day-accent/20 dark:bg-night-accent/20 hover:bg-day-accent/30 dark:hover:bg-night-accent/30 text-day-accent dark:text-night-accent font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-day-accent/30 dark:border-night-accent/30"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Pause Sound
                                </button>

                                {/* Fall Asleep Now - prominent button when sound is playing */}
                                <button
                                    onClick={handleFallAsleep}
                                    aria-label="Fall asleep now with sound playing"
                                    className="w-full py-4 min-h-[48px] bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                    Fall Asleep Now
                                </button>
                                <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary opacity-70">
                                    Sound will continue playing as you drift off
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Quick Duration Buttons */}
                        <div className="grid grid-cols-3 gap-2 mt-2" role="group" aria-label="Quick duration options">
                            <button onClick={() => handleDurationClick(15)} aria-label="15 minute duration" className="duration-btn py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-lg text-sm hover:bg-day-accent/10 dark:hover:bg-night-accent/10 transition-colors flex items-center justify-center">15m</button>
                            <button onClick={() => handleDurationClick(30)} aria-label="30 minute duration" className="duration-btn py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-lg text-sm hover:bg-day-accent/10 dark:hover:bg-night-accent/10 transition-colors flex items-center justify-center">30m</button>
                            <button onClick={() => handleDurationClick(60)} aria-label="60 minute duration" className="duration-btn py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-lg text-sm hover:bg-day-accent/10 dark:hover:bg-night-accent/10 transition-colors flex items-center justify-center">60m</button>
                        </div>


                        {/* Binaural beats use predefined frequencies (Delta/Theta) */}

                        {/* Master Volume Slider */}
                        <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg text-left">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-day-text-secondary dark:text-night-text-secondary">Master Volume</span>
                                <span className="font-mono text-day-accent dark:text-night-accent" aria-hidden="true">{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={volume}
                                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                aria-label={`Master volume: ${Math.round(volume * 100)}%`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(volume * 100)}
                                aria-valuetext={`${Math.round(volume * 100)} percent`}
                                className="w-full h-11 accent-day-accent dark:accent-night-accent cursor-pointer touch-pan-x"
                            />
                        </div>

                        {/* Regulatory disclaimer for binaural beats */}
                        {(sound.type === 'binaural' || sound.type === 'ramp') && (
                            <p className="mt-3 text-xs text-center text-day-text-secondary dark:text-night-text-secondary opacity-70">
                                Audio frequencies are for relaxation and entertainment only. Not intended to diagnose, treat, or cure any condition.
                            </p>
                        )}

                        {/* Preview Toggle Button */}
                        <button
                            onClick={togglePreview}
                            aria-label={isPreviewing ? 'Stop preview' : 'Preview sound'}
                            aria-pressed={isPreviewing}
                            className={`mt-3 w-full py-3 min-h-[48px] rounded-lg text-sm font-medium transition-all ${isPreviewing
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-transparent'
                                }`}
                        >
                            {isPreviewing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828-2.828" />
                                    </svg>
                                    Previewing - Tap to Mute
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828-2.828M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
                                    </svg>
                                    Tap to Preview Sound
                                </span>
                            )}
                        </button>

                        {/* Custom Duration + Play */}
                        <div className="flex items-center gap-2 mt-4">
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                                aria-label="Custom duration in minutes"
                                className="w-full p-3 min-h-[48px] text-base bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-lg text-center"
                                placeholder="Custom mins"
                                min="1"
                                max="480"
                            />
                            <button onClick={handlePlay} aria-label={`Play for ${duration} minutes`} className="bg-day-accent dark:bg-night-accent text-white rounded-lg p-3 px-6 min-h-[48px] font-bold whitespace-nowrap flex items-center justify-center">
                                Play
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
