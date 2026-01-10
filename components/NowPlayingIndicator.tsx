import React, { useState, useEffect } from 'react';
import { isSleepSoundPlaying, shouldPersistSleepSound, stopSleepSound, setSleepSoundPersist, getCurrentSleepSoundName, getCurrentSleepSoundVolume, setLiveVolume } from '../services/audioService';
import haptics from '../services/hapticsService';

interface NowPlayingIndicatorProps {
    onNavigateToSleep?: () => void;
}

/**
 * A floating "Now Playing" indicator that shows when a sleep sound
 * is playing and persisting across page navigation.
 *
 * Appears when user clicks "Fall Asleep Now" and navigates away.
 * Allows quick volume control and navigation to full soundscape controls.
 */
export const NowPlayingIndicator: React.FC<NowPlayingIndicatorProps> = ({ onNavigateToSleep }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [showControls, setShowControls] = useState(false);
    const [soundName, setSoundName] = useState<string | null>(null);
    const [volume, setVolume] = useState(0.5);

    // Check if we should show the indicator
    useEffect(() => {
        const checkVisibility = () => {
            const shouldShow = shouldPersistSleepSound() && isSleepSoundPlaying();
            setIsVisible(shouldShow);

            if (shouldShow) {
                setSoundName(getCurrentSleepSoundName());
                setVolume(getCurrentSleepSoundVolume());
            }
        };

        // Check immediately
        checkVisibility();

        // Poll every second to detect when sound stops
        const interval = setInterval(checkVisibility, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleStop = () => {
        haptics.medium();
        setSleepSoundPersist(false);
        stopSleepSound(1);
        setIsVisible(false);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        setLiveVolume(newVolume);
        haptics.light();
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

    if (!isVisible) return null;

    return (
        <div className="fixed top-4 right-4 z-50 animate-fadeIn">
            {isExpanded ? (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg overflow-hidden max-w-xs">
                    {/* Main row */}
                    <div className="p-3 flex items-center gap-3">
                        {/* Animated sound wave icon - tap to show controls */}
                        <button
                            onClick={toggleControls}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0 transition-colors"
                            aria-label="Toggle volume controls"
                        >
                            <div className="flex items-end gap-0.5 h-4">
                                <div className="w-1 bg-white rounded-full animate-soundwave-1" style={{ height: '60%' }} />
                                <div className="w-1 bg-white rounded-full animate-soundwave-2" style={{ height: '100%' }} />
                                <div className="w-1 bg-white rounded-full animate-soundwave-3" style={{ height: '40%' }} />
                                <div className="w-1 bg-white rounded-full animate-soundwave-2" style={{ height: '80%' }} />
                            </div>
                        </button>

                        {/* Info */}
                        <div className="flex-grow min-w-0">
                            <p className="text-white/70 text-[10px] uppercase tracking-wider">Now Playing</p>
                            <p className="text-white font-medium text-sm truncate">{soundName || 'Sleep Sound'}</p>
                        </div>

                        {/* Stop button */}
                        <button
                            onClick={handleStop}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
                            aria-label="Stop sound"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="6" width="12" height="12" rx="1" />
                            </svg>
                        </button>

                        {/* Collapse button */}
                        <button
                            onClick={toggleExpanded}
                            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
                            aria-label="Minimize"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* Expanded controls panel */}
                    {showControls && (
                        <div className="px-3 pb-3 space-y-3 border-t border-white/10 pt-3">
                            {/* Volume slider */}
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="flex-grow h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                                    aria-label="Volume"
                                />
                                <span className="text-white/70 text-xs w-8 text-right">{Math.round(volume * 100)}%</span>
                            </div>

                            {/* Navigate to Sleep page for full controls */}
                            {onNavigateToSleep && (
                                <button
                                    onClick={handleNavigateToSleep}
                                    className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs flex items-center justify-center gap-2 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Open Full Controls
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <button
                    onClick={toggleExpanded}
                    className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-700 shadow-lg flex items-center justify-center animate-pulse-slow"
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
