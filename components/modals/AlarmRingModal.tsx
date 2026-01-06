// components/modals/AlarmRingModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { playAlarmBySound, stopAlarmSound, playAlertnessBoost, stopAlertnessBoost } from '../../services/audioService';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { Alarm } from '../../types';

interface AlarmRingModalProps {
    alarm: Alarm;
    onRecordDream: (quickNote?: string) => void;
    onSnooze: () => void;
    onAwake: () => void;
}

const DREAM_PROMPTS = [
    "What images are still vivid?",
    "Who was in your dream?",
    "What emotions linger?",
    "Where did it take place?",
    "What was the last thing you remember?"
];

export const AlarmRingModal: React.FC<AlarmRingModalProps> = ({ alarm, onRecordDream, onSnooze, onAwake }) => {
    const [quickNote, setQuickNote] = useState('');
    const [currentPrompt] = useState(() => DREAM_PROMPTS[Math.floor(Math.random() * DREAM_PROMPTS.length)]);
    const [showInput, setShowInput] = useState(false);
    const [alertnessOn, setAlertnessOn] = useState(false);

    // Callback for when speech is finalized
    const handleFinalTranscript = useCallback((text: string) => {
        setQuickNote(prev => prev + ' ' + text);
    }, []);

    const { isListening, interimTranscript, startListening, stopListening, isSupported } = useSpeechRecognition(handleFinalTranscript);

    useEffect(() => {
        // Play the user-selected alarm sound
        playAlarmBySound(alarm.soundId || 'somnia');
        return () => {
            stopAlarmSound();
            stopAlertnessBoost(); // Clean up alertness on unmount
        };
    }, [alarm.soundId]);

    // Show interim transcript as user speaks (no effect - just for display)

    const handleAction = useCallback((action: () => void) => {
        stopAlarmSound();
        stopAlertnessBoost();
        if (isListening) stopListening();
        action();
    }, [isListening, stopListening]);

    const toggleAlertnessBoost = () => {
        if (alertnessOn) {
            stopAlertnessBoost();
            setAlertnessOn(false);
        } else {
            playAlertnessBoost();
            setAlertnessOn(true);
        }
    };

    const handleRecordWithNote = () => {
        stopAlarmSound();
        if (isListening) stopListening();
        onRecordDream(quickNote.trim() || undefined);
    };

    const toggleVoice = () => {
        if (isListening) {
            stopListening();
        } else {
            stopAlarmSound(); // Stop alarm when user starts speaking
            startListening();
            setShowInput(true);
        }
    };

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-indigo-900/90 to-purple-900/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="w-full max-w-sm animate-fadeIn text-center py-6">
                {/* Time Display */}
                <p className="text-6xl font-light text-white/90 mb-2">{timeStr}</p>
                <h2 className="font-serif text-2xl text-white/80 mb-6">Good Morning</h2>

                {/* PRIMARY: Snooze & Dismiss - Easy to access first */}
                <div className="flex gap-3 mb-6">
                    <button
                        onClick={() => handleAction(onSnooze)}
                        className="flex-1 py-4 bg-white/20 backdrop-blur border border-white/30 text-white font-semibold rounded-2xl text-lg hover:bg-white/30 transition-all"
                    >
                        Snooze 5m
                    </button>
                    <button
                        onClick={() => handleAction(onAwake)}
                        className="flex-1 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all"
                    >
                        I'm Awake
                    </button>
                </div>

                {/* SECONDARY: Dream Capture Section */}
                <div className="bg-white/10 rounded-2xl p-4 mb-4">
                    <p className="text-white/60 text-xs mb-3">Hold still. Your dreams are fading...</p>

                    {/* Dream Recall Prompt */}
                    <p className="text-white/70 text-sm italic mb-4">"{currentPrompt}"</p>

                    {/* Voice Recording */}
                    {isSupported && (
                        <div className="mb-3">
                            <button
                                onClick={toggleVoice}
                                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all ${isListening
                                    ? 'bg-red-500 animate-pulse scale-110'
                                    : 'bg-white/20 hover:bg-white/30'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </button>
                            <p className="text-white/50 text-xs mt-1">
                                {isListening ? 'Recording...' : 'Tap to speak'}
                            </p>
                        </div>
                    )}

                    {/* Quick text input */}
                    {(showInput || quickNote) && (
                        <textarea
                            value={quickNote}
                            onChange={(e) => setQuickNote(e.target.value)}
                            placeholder="Type key words, images, feelings..."
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm resize-none focus:outline-none focus:border-white/40 mb-3"
                            rows={2}
                            autoFocus={!isSupported}
                        />
                    )}

                    {/* Type Instead Button */}
                    {!showInput && !quickNote && (
                        <button
                            onClick={() => setShowInput(true)}
                            className="text-white/50 text-xs underline mb-2"
                        >
                            Or type instead
                        </button>
                    )}

                    {/* Record Dream Button */}
                    <button
                        onClick={handleRecordWithNote}
                        className="w-full py-3 bg-white/20 border border-white/30 text-white font-medium rounded-xl hover:bg-white/30 transition-all"
                    >
                        {quickNote ? 'Save & Record Full Dream' : 'Record Full Dream'}
                    </button>
                </div>

                {/* Wake Up Boost - Optional feature */}
                <button
                    onClick={toggleAlertnessBoost}
                    className={`w-full py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${alertnessOn
                        ? 'bg-amber-500/80 text-white'
                        : 'bg-white/10 text-white/60'
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {alertnessOn ? 'Wake Up Boost Active' : 'Wake Up Boost (12Hz)'}
                </button>
            </div>
        </div>
    );
};
