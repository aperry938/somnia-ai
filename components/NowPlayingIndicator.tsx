import React, { useState, useEffect } from 'react';
import { isSleepSoundPlaying, shouldPersistSleepSound, stopSleepSound, setSleepSoundPersist, getCurrentSleepSoundName } from '../services/audioService';
import haptics from '../services/hapticsService';

/**
 * A floating "Now Playing" indicator that shows when a sleep sound
 * is playing and persisting across page navigation.
 *
 * Appears when user clicks "Fall Asleep Now" and navigates away.
 */
export const NowPlayingIndicator: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [soundName, setSoundName] = useState<string | null>(null);

    // Check if we should show the indicator
    useEffect(() => {
        const checkVisibility = () => {
            const shouldShow = shouldPersistSleepSound() && isSleepSoundPlaying();
            setIsVisible(shouldShow);

            if (shouldShow) {
                setSoundName(getCurrentSleepSoundName());
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

    const toggleExpanded = () => {
        haptics.light();
        setIsExpanded(!isExpanded);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed top-4 right-4 z-50 animate-fadeIn">
            {isExpanded ? (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg p-3 flex items-center gap-3 max-w-xs">
                    {/* Animated sound wave icon */}
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <div className="flex items-end gap-0.5 h-4">
                            <div className="w-1 bg-white rounded-full animate-soundwave-1" style={{ height: '60%' }} />
                            <div className="w-1 bg-white rounded-full animate-soundwave-2" style={{ height: '100%' }} />
                            <div className="w-1 bg-white rounded-full animate-soundwave-3" style={{ height: '40%' }} />
                            <div className="w-1 bg-white rounded-full animate-soundwave-2" style={{ height: '80%' }} />
                        </div>
                    </div>

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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
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
