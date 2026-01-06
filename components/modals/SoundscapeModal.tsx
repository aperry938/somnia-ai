import React, { useState, useEffect, useCallback } from 'react';
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
    const { volume, setVolume } = useAppContext();
    const [duration, setDuration] = useState(30);
    const [beatFreq, setBeatFreq] = useState(sound.type === 'binaural' ? sound.params.diff || 5 : 5);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [baseFreq] = useState(sound.type === 'binaural' ? sound.params.base || 100 : 100);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null); // Seconds remaining
    const [playStartTime, setPlayStartTime] = useState<number | null>(null);
    const [playDuration, setPlayDuration] = useState<number>(0); // Duration in seconds

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

    // Timer countdown when playing
    useEffect(() => {
        if (playStartTime === null || playDuration === 0) return;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - playStartTime) / 1000);
            const remaining = Math.max(0, playDuration - elapsed);
            setTimeRemaining(remaining);

            // Auto-stop when timer reaches 0
            if (remaining === 0) {
                setTimeRemaining(null);
                setPlayStartTime(null);
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [playStartTime, playDuration]);

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

    const handlePlay = async () => {
        // Always stop any current sound first (preview or otherwise)
        stopSleepSound(0.1);
        setIsPreviewing(false);

        const soundToPlay = { ...sound };
        if (sound.type === 'binaural') {
            soundToPlay.params = { ...sound.params, diff: beatFreq };
        }

        // Wait for audio to fully stop before starting new playback
        await new Promise(resolve => setTimeout(resolve, 400));
        await playSleepSound(soundToPlay, duration, volume);
        onPlay(sound.id);

        // Start timer - stay on modal
        setPlayDuration(duration * 60);
        setTimeRemaining(duration * 60);
        setPlayStartTime(Date.now());
    };

    const handleDurationClick = async (mins: number) => {
        setDuration(mins);

        // Always stop any current sound first
        stopSleepSound(0.1);
        setIsPreviewing(false);

        const soundToPlay = { ...sound };
        if (sound.type === 'binaural') {
            soundToPlay.params = { ...sound.params, diff: beatFreq };
        }

        // Wait for audio to fully stop before starting new playback
        await new Promise(resolve => setTimeout(resolve, 400));
        await playSleepSound(soundToPlay, mins, volume);
        onPlay(sound.id);

        // Start timer - stay on modal
        setPlayDuration(mins * 60);
        setTimeRemaining(mins * 60);
        setPlayStartTime(Date.now());
    };

    const handleStop = () => {
        stopSleepSound();
        setIsPreviewing(false);
        setTimeRemaining(null);
        setPlayStartTime(null);
        onStop();
    };

    const handleClose = () => {
        // Prevent closing while actively playing - user must click Stop
        if (isPlaying) {
            return;
        }
        // Stop preview when closing without playing
        if (isPreviewing) {
            stopSleepSound(0.3);
            setIsPreviewing(false);
        }
        onClose();
    };

    // Get frequency range label
    const getFrequencyLabel = (freq: number): string => {
        if (freq <= 4) return 'Delta (Deep Sleep)';
        if (freq <= 8) return 'Theta (Dreaming)';
        if (freq <= 13) return 'Alpha (Relaxed)';
        return 'Beta (Alert)';
    };

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={handleClose}>
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-sm animate-fadeIn text-center relative" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Live Preview Indicator */}
                {isPreviewing && (
                    <div className="absolute top-4 left-4 flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-green-500 font-medium uppercase tracking-wider">Live Preview</span>
                    </div>
                )}

                <div className="flex justify-center items-center h-16 w-16 mx-auto text-day-accent dark:text-night-accent">{sound.icon}</div>
                <h2 className="font-serif text-2xl mt-2">{sound.name}</h2>
                <p className="text-day-text-secondary dark:text-night-text-secondary my-4 text-sm">{sound.description}</p>

                {isPlaying ? (
                    <div className="space-y-4">
                        {/* Now Playing Indicator */}
                        <div className="flex items-center justify-center gap-2 text-day-accent dark:text-night-accent">
                            <div className="w-2 h-2 bg-day-accent dark:bg-night-accent rounded-full animate-pulse" />
                            <span className="text-sm font-medium uppercase tracking-wider">Now Playing</span>
                        </div>

                        {/* Large Timer Display */}
                        {timeRemaining !== null && (
                            <div className="py-4">
                                <p className="text-5xl font-serif text-day-text-primary dark:text-night-text-primary">
                                    {formatTime(timeRemaining)}
                                </p>
                                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-2">
                                    remaining
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
                                className="w-full accent-day-accent dark:accent-night-accent cursor-pointer"
                            />
                        </div>

                        {/* Stop Button - Softer styling */}
                        <button
                            onClick={handleStop}
                            className="w-full py-4 bg-day-accent/20 dark:bg-night-accent/20 hover:bg-day-accent/30 dark:hover:bg-night-accent/30 text-day-accent dark:text-night-accent font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-day-accent/30 dark:border-night-accent/30"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                            </svg>
                            Stop Sound
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Quick Duration Buttons */}
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            <button onClick={() => handleDurationClick(15)} className="duration-btn py-2 border border-day-border dark:border-night-border rounded-lg text-sm hover:bg-day-accent/10 dark:hover:bg-night-accent/10 transition-colors">15m</button>
                            <button onClick={() => handleDurationClick(30)} className="duration-btn py-2 border border-day-border dark:border-night-border rounded-lg text-sm hover:bg-day-accent/10 dark:hover:bg-night-accent/10 transition-colors">30m</button>
                            <button onClick={() => handleDurationClick(60)} className="duration-btn py-2 border border-day-border dark:border-night-border rounded-lg text-sm hover:bg-day-accent/10 dark:hover:bg-night-accent/10 transition-colors">60m</button>
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
                                className="w-full accent-day-accent dark:accent-night-accent cursor-pointer"
                            />
                        </div>

                        {/* Preview Toggle Button */}
                        <button
                            onClick={togglePreview}
                            className={`mt-3 w-full py-2 rounded-lg text-sm font-medium transition-all ${isPreviewing
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
                                className="w-full p-3 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-lg text-center"
                                placeholder="Custom mins"
                                min="1"
                                max="480"
                            />
                            <button onClick={handlePlay} className="bg-day-accent dark:bg-night-accent text-white rounded-lg p-3 px-6 font-bold whitespace-nowrap">
                                Play
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
