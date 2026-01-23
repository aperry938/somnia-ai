import React, { useState, useEffect } from 'react';
import {
    isSleepSoundPlaying,
    shouldPersistSleepSound,
    stopSleepSound,
    setSleepSoundPersist,
    getCurrentSleepSoundName,
    setLiveVolume,
    didSoundEndNaturally,
    getLastPlayedSound,
    extendSleepSound,
    clearSoundEndedState
} from '../services/audioService';
import { useAppContext } from '../contexts/AppContext';
import haptics from '../services/hapticsService';
import { logger } from '../services/logger';

interface NowPlayingIndicatorProps {
    onNavigateToSleep?: () => void;
}

type IndicatorState = 'playing' | 'ended' | 'hidden';

/**
 * A floating "Now Playing" indicator that shows when a sleep sound
 * is playing and persisting across page navigation.
 *
 * Shows different states:
 * - Playing: Volume control, stop button
 * - Ended: Restart/extend options so user can continue their session
 */
export const NowPlayingIndicator: React.FC<NowPlayingIndicatorProps> = ({ onNavigateToSleep }) => {
    const { volume, setVolume } = useAppContext();
    const [state, setState] = useState<IndicatorState>('hidden');
    const [isExpanded, setIsExpanded] = useState(true);
    const [showControls, setShowControls] = useState(false);
    const [soundName, setSoundName] = useState<string | null>(null);
    const [isExtending, setIsExtending] = useState(false);

    // Check state periodically
    useEffect(() => {
        const checkState = () => {
            const isPlaying = isSleepSoundPlaying();
            const isPersisting = shouldPersistSleepSound();
            const endedNaturally = didSoundEndNaturally();
            const lastSound = getLastPlayedSound();

            if (isPlaying && isPersisting) {
                setState('playing');
                // Use lastSound name as fallback (more reliable than getCurrentSleepSoundName)
                const currentName = getCurrentSleepSoundName();
                setSoundName(currentName || lastSound?.sound.name || 'Sleep Sound');
                // Volume is now managed by AppContext and persisted to localStorage
            } else if (endedNaturally && lastSound) {
                // Sound ended naturally (timer expired) - show restart options
                // Don't require isPersisting since it gets cleared when sound stops
                setState('ended');
                setSoundName(lastSound.sound.name);
            } else {
                setState('hidden');
            }
        };

        checkState();
        const interval = setInterval(checkState, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleStop = () => {
        haptics.medium();
        setSleepSoundPersist(false);
        clearSoundEndedState();
        stopSleepSound(1);
        setState('hidden');
    };

    const handleDismiss = () => {
        haptics.light();
        setSleepSoundPersist(false);
        clearSoundEndedState();
        setState('hidden');
    };

    const handleExtend = async (minutes: number) => {
        haptics.medium();
        setIsExtending(true);
        try {
            // DON'T clear soundEndedNaturally before extend - it's needed to allow
            // stopSleepSound to work inside playSleepSound during restart
            // DON'T set persistence before extend - it blocks the internal cleanup
            const success = await extendSleepSound(minutes);
            if (success) {
                // Set persistence immediately so checkState doesn't hide us
                setSleepSoundPersist(true);

                // Wait for sound to actually start playing before clearing ended state
                // This prevents a race condition where checkState runs before the sound starts,
                // sees "not playing AND not ended naturally", and hides the indicator
                const waitForSound = () => new Promise<void>((resolve) => {
                    let attempts = 0;
                    const checkPlaying = () => {
                        if (isSleepSoundPlaying() || attempts >= 10) {
                            resolve();
                        } else {
                            attempts++;
                            setTimeout(checkPlaying, 100);
                        }
                    };
                    checkPlaying();
                });
                await waitForSound();

                // NOW clear ended state after sound is confirmed playing
                clearSoundEndedState();
                setState('playing');
                setShowControls(false);
            } else {
                // Failed to extend - keep persistence but stay in current state
                logger.warn('[NowPlayingIndicator] Failed to extend sound');
            }
        } catch (error) {
            logger.error('[NowPlayingIndicator] Error extending sound:', error);
            // On error, revert to checking actual state
        } finally {
            setIsExtending(false);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        setLiveVolume(newVolume);
    };

    const toggleExpanded = () => {
        haptics.light();
        if (isExpanded) {
            setShowControls(false);
        }
        setIsExpanded(!isExpanded);
    };

    const toggleControls = () => {
        haptics.light();
        setShowControls(!showControls);
    };

    const handleNavigateToSleep = () => {
        haptics.medium();
        if (onNavigateToSleep) {
            onNavigateToSleep();
        }
    };

    if (state === 'hidden') return null;

    // Ended state - show restart/extend options
    if (state === 'ended') {
        return (
            <div className="fixed top-16 right-4 z-50 animate-fadeIn">
                {isExpanded ? (
                    <div className="bg-gradient-to-r from-amber-600 to-orange-700 rounded-xl shadow-lg overflow-hidden max-w-xs">
                        {/* Main row */}
                        <div className="p-3 flex items-center gap-3">
                            {/* Moon icon - sound ended */}
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            </div>

                            {/* Info */}
                            <div className="flex-grow min-w-0">
                                <p className="text-white/70 text-[10px] uppercase tracking-wider">Sound Ended</p>
                                <p className="text-white font-medium text-sm truncate">{soundName || 'Sleep Sound'}</p>
                            </div>

                            {/* Dismiss button - min 44x44 for mobile touch */}
                            <button
                                onClick={handleDismiss}
                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
                                aria-label="Dismiss"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Extend options */}
                        <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-3">
                            <p className="text-white/70 text-xs text-center">Still awake? Extend your session:</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleExtend(15)}
                                    disabled={isExtending}
                                    className="flex-1 py-3 px-2 min-h-[44px] bg-white/20 hover:bg-white/30 active:bg-white/40 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
                                >
                                    +15 min
                                </button>
                                <button
                                    onClick={() => handleExtend(30)}
                                    disabled={isExtending}
                                    className="flex-1 py-3 px-2 min-h-[44px] bg-white/20 hover:bg-white/30 active:bg-white/40 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
                                >
                                    +30 min
                                </button>
                                <button
                                    onClick={() => handleExtend(60)}
                                    disabled={isExtending}
                                    className="flex-1 py-3 px-2 min-h-[44px] bg-white/20 hover:bg-white/30 active:bg-white/40 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
                                >
                                    +1 hr
                                </button>
                            </div>

                            {/* Change sound option */}
                            {onNavigateToSleep && (
                                <button
                                    onClick={handleNavigateToSleep}
                                    className="w-full py-3 px-3 min-h-[44px] bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg text-white text-xs flex items-center justify-center gap-2 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Choose Different Sound
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={toggleExpanded}
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-600 to-orange-700 shadow-lg flex items-center justify-center"
                        aria-label="Sound ended - tap to extend"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    </button>
                )}
            </div>
        );
    }

    // Playing state
    return (
        <div className="fixed top-16 right-4 z-50 animate-fadeIn">
            {isExpanded ? (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg overflow-hidden max-w-xs">
                    {/* Main row */}
                    <div className="p-3 flex items-center gap-2">
                        {/* Animated sound wave icon - tap to show controls */}
                        <button
                            onClick={toggleControls}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center flex-shrink-0 transition-colors"
                            aria-label="Toggle volume controls"
                        >
                            <div className="flex items-end gap-0.5 h-4">
                                <div className="w-1 h-full bg-white rounded-full animate-soundwave-1 origin-bottom" />
                                <div className="w-1 h-full bg-white rounded-full animate-soundwave-2 origin-bottom" />
                                <div className="w-1 h-full bg-white rounded-full animate-soundwave-3 origin-bottom" />
                                <div className="w-1 h-full bg-white rounded-full animate-soundwave-2 origin-bottom" />
                            </div>
                        </button>

                        {/* Info */}
                        <div className="flex-grow min-w-0">
                            <p className="text-white/70 text-[10px] uppercase tracking-wider">Now Playing</p>
                            <p className="text-white font-medium text-sm truncate">{soundName || 'Sleep Sound'}</p>
                        </div>

                        {/* Stop button - min 44px for mobile */}
                        <button
                            onClick={handleStop}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-colors flex-shrink-0"
                            aria-label="Stop sound"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="6" width="12" height="12" rx="1" />
                            </svg>
                        </button>

                        {/* Collapse button - min 44px for mobile */}
                        <button
                            onClick={toggleExpanded}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
                            aria-label="Minimize"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* Expanded controls panel */}
                    {showControls && (
                        <div className="px-3 pb-3 space-y-3 border-t border-white/10 pt-3">
                            {/* Volume slider - larger thumb for mobile touch */}
                            <div className="flex items-center gap-3 py-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="flex-grow h-2 bg-white/20 rounded-full appearance-none cursor-pointer touch-pan-x [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/50"
                                    aria-label="Volume"
                                />
                                <span className="text-white/70 text-sm w-10 text-right flex-shrink-0">{Math.round(volume * 100)}%</span>
                            </div>

                            {/* Extend time buttons - min 44px height for mobile */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleExtend(15)}
                                    disabled={isExtending}
                                    className="flex-1 py-2.5 px-2 min-h-[44px] bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-50 rounded-lg text-white text-sm transition-colors"
                                >
                                    +15 min
                                </button>
                                <button
                                    onClick={() => handleExtend(30)}
                                    disabled={isExtending}
                                    className="flex-1 py-2.5 px-2 min-h-[44px] bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-50 rounded-lg text-white text-sm transition-colors"
                                >
                                    +30 min
                                </button>
                            </div>

                            {/* Navigate to Sleep page for full controls */}
                            {onNavigateToSleep && (
                                <button
                                    onClick={handleNavigateToSleep}
                                    className="w-full py-3 px-3 min-h-[44px] bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg text-white text-xs flex items-center justify-center gap-2 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Change Sound
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* Collapsed state - floating button, min 48px for easy tap */
                <button
                    onClick={toggleExpanded}
                    className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-gradient-to-r from-indigo-600 to-purple-700 shadow-lg flex items-center justify-center animate-pulse-slow active:scale-95 transition-transform"
                    aria-label="Now playing - tap to expand"
                >
                    <div className="flex items-end gap-0.5 h-4">
                        <div className="w-1 bg-white rounded-full animate-soundwave-1" style={{ height: '60%' }} />
                        <div className="w-1 bg-white rounded-full animate-soundwave-2" style={{ height: '100%' }} />
                        <div className="w-1 bg-white rounded-full animate-soundwave-3" style={{ height: '40%' }} />
                    </div>
                </button>
            )}
        </div>
    );
};
