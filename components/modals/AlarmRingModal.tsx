// components/modals/AlarmRingModal.tsx
import React, { useEffect } from 'react';
import { playProgressiveAlarm, stopAlarmSound } from '../../services/audioService';

interface AlarmRingModalProps {
    onRecordDream: () => void;
    onSnooze: () => void;
    onAwake: () => void;
}

export const AlarmRingModal: React.FC<AlarmRingModalProps> = ({ onRecordDream, onSnooze, onAwake }) => {
    useEffect(() => {
        playProgressiveAlarm();
        return () => {
            stopAlarmSound();
        };
    }, []);

    const handleAction = (action: () => void) => {
        stopAlarmSound();
        action();
    };

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-8 w-full max-w-sm animate-fadeIn text-center">
                <h2 className="font-serif text-4xl text-day-accent dark:text-night-accent animate-pulse">The Ascent</h2>
                <p className="text-day-text-secondary dark:text-night-text-secondary mt-2 mb-8">Your inner world awaits.</p>
                <div className="space-y-3">
                    <button onClick={() => handleAction(onRecordDream)} className="w-full py-3 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full text-lg">
                        Record Dream
                    </button>
                    <button onClick={() => handleAction(onSnooze)} className="w-full py-2 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-full">
                        Snooze (5 min)
                    </button>
                    <button onClick={() => handleAction(onAwake)} className="w-full py-2 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-full">
                        Awake
                    </button>
                </div>
            </div>
        </div>
    );
};
