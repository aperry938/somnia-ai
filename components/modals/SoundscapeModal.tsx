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

export const SoundscapeModal: React.FC<SoundscapeModalProps> = ({ sound, isPlaying, onPlay, onStop, onClose }) => {
    const [duration, setDuration] = useState(30);

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
        await playSleepSound(sound, duration);
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
        await playSleepSound(sound, mins);
        onPlay(sound.id);
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-sm animate-fadeIn text-center" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center items-center h-16 w-16 mx-auto text-day-accent dark:text-night-accent">{sound.icon}</div>
                <h2 className="font-serif text-2xl mt-2">{sound.name}</h2>
                <p className="text-day-text-secondary dark:text-night-text-secondary my-4">{sound.description}</p>
                
                {isPlaying ? (
                     <button onClick={handleStop} className="w-full bg-red-500 text-white font-bold rounded-lg p-3">Stop</button>
                ) : (
                    <>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <button onClick={() => handleDurationClick(15)} className="duration-btn py-2 border border-day-border dark:border-night-border rounded-lg">15m</button>
                        <button onClick={() => handleDurationClick(30)} className="duration-btn py-2 border border-day-border dark:border-night-border rounded-lg">30m</button>
                        <button onClick={() => handleDurationClick(60)} className="duration-btn py-2 border border-day-border dark:border-night-border rounded-lg">60m</button>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full p-3 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-lg text-center" placeholder="Custom mins" min="1" max="180" />
                        <button onClick={handlePlay} className="bg-day-accent dark:bg-night-accent text-white rounded-lg p-3">Play</button>
                    </div>
                    </>
                )}
            </div>
        </div>
    );
};