import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Soundscape } from '../../types';
import { playSleepSound, stopSleepSound, setLiveVolume, setLiveBeatFrequency, isSleepSoundPlaying } from '../../services/audioService';
import { useAppContext } from '../../contexts/AppContext';

interface SoundscapeModalProps {
    sound: Soundscape;
    isPlaying: boolean;
    onPlay: (soundId: string) => void;
    onStop: () => void;
    onClose: () => void;
}

export const SoundscapeModal: React.FC<SoundscapeModalProps> = ({ sound, isPlaying, onPlay, onStop, onClose }) => {
    const { volume, setVolume, logSoundActivity, activeSleepSession } = useAppContext();
    const [duration, setDuration] = useState(30);
    const [beatFreq, setBeatFreq] = useState(sound.type === 'binaural' ? sound.params.diff || 5 : 5);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [baseFreq] = useState(sound.type === 'binaural' ? sound.params.base || 100 : 100);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null); // Seconds remaining
    const [playStartTime, setPlayStartTime] = useState<number | null>(null);
    const [playDuration, setPlayDuration] = useState<number>(0); // Duration in seconds
    const [isPaused, setIsPaused] = useState(false); // Track pause state
    const [isReadyToPlay, setIsReadyToPlay] = useState(false); // Show play screen but not started yet
    const pausedTimeRef = useRef<number>(0); // Track time remaining when paused
    const soundStartTimeRef = useRef<number | null>(null); // Track when sound actually started (for logging)

    // No auto-preview - user must click to start preview

    // Cleanup preview on unmount (if not transitioning to full play)
    useEffect(() => {
        return () => {
            // Only stop if we're previewing, not if transitioning to full play
            if (isPreviewing && !isPlaying) {
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
    }, []);

    // Timer countdown when playing (not when paused or ready)
    useEffect(() => {
        if (playStartTime === null || playDuration === 0 || isPaused || isReadyToPlay) return;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - playStartTime) / 1000);
            const remaining = Math.max(0, playDuration - elapsed);
            setTimeRemaining(remaining);

            // Auto-stop when timer reaches 0
            if (remaining === 0) {
                setTimeRemaining(null);
                setPlayStartTime(null);
                setIsReadyToPlay(false);
                setIsPaused(false);
                onStop();
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
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

    // Live update volume
    const handleVolumeChange = useCallback((newVolume: number) => {
        setVolume(newVolume);
        if (isPreviewing || isPlaying) {
            setLiveVolume(newVolume);
        }
    }, [isPreviewing, isPlaying, setVolume]);

    // Live update beat frequency (binaural only)
    const handleBeatFreqChange = useCallback((newFreq: number) => {
        setBeatFreq(newFreq);
        if ((isPreviewing || isPlaying) && sound.type === 'binaural') {
            setLiveBeatFrequency(baseFreq, newFreq);
        }
    }, [isPreviewing, isPlaying, sound.type, baseFreq]);

    // Toggle preview on/off
    const togglePreview = useCallback(async () => {
        if (isPreviewing) {
            stopSleepSound(0.3);
            setIsPreviewing(false);
        } else {
            const soundToPlay = { ...sound };
            if (sound.type === 'binaural') {
                soundToPlay.params = { ...sound.params, diff: beatFreq };
            }
            await playSleepSound(soundToPlay, 0, volume);
            setIsPreviewing(true);
        }
    }, [isPreviewing, sound, beatFreq, volume]);

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
        const soundToPlay = { ...sound };
        if (sound.type === 'binaural') {
            soundToPlay.params = { ...sound.params, diff: beatFreq };
        }

        // Calculate remaining duration in minutes
        const remainingMinutes = (timeRemaining || playDuration) / 60;
        await playSleepSound(soundToPlay, remainingMinutes, volume);

        setIsReadyToPlay(false);
        setIsPaused(false);
        setPlayStartTime(Date.now());
        soundStartTimeRef.current = Date.now(); // Track for activity logging
    };

    // Pause the sound and timer
    const handlePause = () => {
        stopSleepSound(0.3);
        pausedTimeRef.current = timeRemaining || 0;
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
        const remainingMinutes = pausedTimeRef.current / 60;
        await playSleepSound(soundToPlay, remainingMinutes, volume);

        // Set playDuration first, then isPaused, then playStartTime last
        // This order ensures the useEffect triggers correctly
        setPlayDuration(pausedTimeRef.current);
        setIsReadyToPlay(false); // Ensure we're not in ready state
        setIsPaused(false);
        // Set playStartTime last to trigger the timer effect with updated values
        setTimeout(() => setPlayStartTime(Date.now()), 0);
    };

    // Fully stop and close (called by X button)
    const handleStop = () => {
        // Log sound activity if we actually played something and there's an active session
        if (soundStartTimeRef.current && activeSleepSession) {
            const durationSeconds = Math.floor((Date.now() - soundStartTimeRef.current) / 1000);
            if (durationSeconds > 5) { // Only log if played for more than 5 seconds
                logSoundActivity(sound.name, durationSeconds);
            }
        }
        soundStartTimeRef.current = null;

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

    // Handle backdrop click - only close if not in playing state
    const handleBackdropClick = () => {
        if (!isPlaying && !isReadyToPlay && !isPaused) {
            handleClose();
        }
    };

    // Get frequency range label
    const getFrequencyLabel = (freq: number): string => {
        if (freq <= 4) return 'Delta (Deep Sleep)';
        if (freq <= 8) return 'Theta (Dreaming)';
        if (freq <= 13) return 'Alpha (Relaxed)';
        return 'Beta (Alert)';
    };

    // Determine if we're in the "playing view" (ready, playing, or paused)
    const isInPlayingView = isPlaying || isReadyToPlay || isPaused;
    const isActuallyPlaying = isPlaying && !isReadyToPlay && !isPaused && playStartTime !== null;

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="soundscape-title">
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-sm animate-fadeIn text-center relative" onClick={(e) => e.stopPropagation()}>
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
                                <span className="font-mono text-day-accent dark:text-night-accent">{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={volume}
                                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                aria-label={`Volume: ${Math.round(volume * 100)}%`}
                                className="w-full accent-day-accent dark:accent-night-accent cursor-pointer"
                            />
                        </div>

                        {/* Action Button - Start, Pause, or Resume */}
                        {isReadyToPlay ? (
                            <button
                                onClick={handleStartSound}
                                aria-label="Start sound"
                                className="w-full py-4 bg-day-accent dark:bg-night-accent hover:brightness-110 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
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
                                className="w-full py-4 bg-day-accent dark:bg-night-accent hover:brightness-110 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Resume Sound
                            </button>
                        ) : (
                            <button
                                onClick={handlePause}
                                aria-label="Pause sound"
                                className="w-full py-4 bg-day-accent/20 dark:bg-night-accent/20 hover:bg-day-accent/30 dark:hover:bg-night-accent/30 text-day-accent dark:text-night-accent font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-day-accent/30 dark:border-night-accent/30"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Pause Sound
                            </button>
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
                                <span className="font-mono text-day-accent dark:text-night-accent">{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={volume}
                                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                aria-label={`Master volume: ${Math.round(volume * 100)}%`}
                                className="w-full accent-day-accent dark:accent-night-accent cursor-pointer"
                            />
                        </div>

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
