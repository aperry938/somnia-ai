import React, { useState, useEffect } from 'react';
import { Soundscape } from '../../types';
import { playSleepSound, stopSleepSound } from '../../services/audioService';

interface SoundscapeModalProps {
    sound: Soundscape;
    isPlaying: boolean;
    onPlay: (soundId: string) => void;
    onStop: () => void;
    onClose: () => void;
}

import { useAppContext } from '../../contexts/AppContext';

export const SoundscapeModal: React.FC<SoundscapeModalProps> = ({ sound, isPlaying, onPlay, onStop, onClose }) => {
    const { volume, setVolume } = useAppContext();
    const [duration, setDuration] = useState(30);
    const [beatFreq, setBeatFreq] = useState(sound.type === 'binaural' ? sound.params.diff || 5 : 5);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const handlePlay = async () => {
        const soundToPlay = { ...sound };
        if (sound.type === 'binaural') {
            soundToPlay.params = { ...sound.params, diff: beatFreq };
        }
        await playSleepSound(soundToPlay, duration, volume);
        onPlay(sound.id);
        onClose();
    };

    const handleStop = () => {
        stopSleepSound();
        onStop();
        onClose();
    };

    const handleDurationClick = async (mins: number) => {
        setDuration(mins);
        const soundToPlay = { ...sound };
        if (sound.type === 'binaural') {
            soundToPlay.params = { ...sound.params, diff: beatFreq };
        }
        await playSleepSound(soundToPlay, mins, volume);
        onPlay(sound.id);
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-sm animate-fadeIn text-center relative" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div className="flex justify-center items-center h-16 w-16 mx-auto text-day-accent dark:text-night-accent">{sound.icon}</div>
                <h2 className="font-serif text-2xl mt-2">{sound.name}</h2>
                <p className="text-day-text-secondary dark:text-night-text-secondary my-4">{sound.description}</p>

                {isPlaying ? (
                    <button onClick={handleStop} className="w-full bg-red-500 text-white font-bold rounded-lg p-3">Stop</button>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            <button onClick={() => handleDurationClick(15)} className="duration-btn py-2 border border-day-border dark:border-night-border rounded-lg text-sm">15m</button>
                            <button onClick={() => handleDurationClick(30)} className="duration-btn py-2 border border-day-border dark:border-night-border rounded-lg text-sm">30m</button>
                            <button onClick={() => handleDurationClick(60)} className="duration-btn py-2 border border-day-border dark:border-night-border rounded-lg text-sm">60m</button>
                        </div>

                        {sound.type === 'binaural' && (
                            <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg text-left">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-day-text-secondary dark:text-night-text-secondary">Beat Frequency</span>
                                    <span className="font-mono text-day-accent dark:text-night-accent">{beatFreq} Hz</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    step="0.5"
                                    value={beatFreq}
                                    onChange={(e) => setBeatFreq(parseFloat(e.target.value))}
                                    className="w-full accent-day-accent dark:accent-night-accent"
                                />
                                <div className="flex justify-between text-[10px] text-day-text-secondary dark:text-night-text-secondary mt-1">
                                    <span>Delta</span>
                                    <span>Theta</span>
                                    <span>Alpha</span>
                                    <span>Beta</span>
                                </div>
                            </div>
                        )}

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
                                onChange={(e) => {
                                    setVolume(parseFloat(e.target.value));
                                    // Optional: Live update if playing? No, this is modal.
                                }}
                                className="w-full accent-day-accent dark:accent-night-accent"
                            />
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full p-3 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-lg text-center" placeholder="Custom mins" min="1" max="180" />
                            <button onClick={handlePlay} className="bg-day-accent dark:bg-night-accent text-white rounded-lg p-3 px-6 font-bold">Play</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};