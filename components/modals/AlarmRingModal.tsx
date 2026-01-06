// components/modals/AlarmRingModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { playSomniaAlarm, stopAlarmSound } from '../../services/audioService';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface AlarmRingModalProps {
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

export const AlarmRingModal: React.FC<AlarmRingModalProps> = ({ onRecordDream, onSnooze, onAwake }) => {
    const [quickNote, setQuickNote] = useState('');
    const [currentPrompt] = useState(() => DREAM_PROMPTS[Math.floor(Math.random() * DREAM_PROMPTS.length)]);
    const [showInput, setShowInput] = useState(false);

    // Callback for when speech is finalized
    const handleFinalTranscript = useCallback((text: string) => {
        setQuickNote(prev => prev + ' ' + text);
    }, []);

    const { isListening, interimTranscript, startListening, stopListening, isSupported } = useSpeechRecognition(handleFinalTranscript);

    useEffect(() => {
        playSomniaAlarm();
        return () => {
            stopAlarmSound();
        };
    }, []);

    // Show interim transcript as user speaks (no effect - just for display)

    const handleAction = useCallback((action: () => void) => {
        stopAlarmSound();
        if (isListening) stopListening();
        action();
    }, [isListening, stopListening]);

    const handleRecordWithNote = () => {
        stopAlarmSound();
        if (isListening) stopListening();
        onRecordDream(quickNote.trim() || undefined);
    };

    const toggleVoice = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
            setShowInput(true);
        }
    };

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-indigo-900/90 to-purple-900/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-sm animate-fadeIn text-center">
                {/* Time Display */}
                <p className="text-6xl font-light text-white/90 mb-2">{timeStr}</p>
                <h2 className="font-serif text-2xl text-white/80 mb-1">Good Morning</h2>
                <p className="text-white/60 text-sm mb-6">Hold still. Your dreams are fading...</p>

                {/* Dream Recall Prompt */}
                <div className="bg-white/10 rounded-xl p-4 mb-6">
                    <p className="text-white/70 text-sm italic">"{currentPrompt}"</p>
                </div>

                {/* Voice Recording - Primary Action */}
                <div className="mb-4">
                    {isSupported && (
                        <button
                            onClick={toggleVoice}
                            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all ${isListening
                                ? 'bg-red-500 animate-pulse scale-110'
                                : 'bg-white/20 hover:bg-white/30'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>
                    )}
                    <p className="text-white/60 text-xs mt-2">
                        {isListening ? 'Tap to stop recording...' : 'Tap to speak your dream'}
                    </p>
                </div>

                {/* Quick text input */}
                {(showInput || quickNote) && (
                    <div className="mb-4">
                        <textarea
                            value={quickNote}
                            onChange={(e) => setQuickNote(e.target.value)}
                            placeholder="Type key words, images, feelings..."
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm resize-none focus:outline-none focus:border-white/40"
                            rows={3}
                            autoFocus={!isSupported}
                        />
                    </div>
                )}

                {/* Type Instead Button */}
                {!showInput && !quickNote && (
                    <button
                        onClick={() => setShowInput(true)}
                        className="text-white/50 text-sm underline mb-4"
                    >
                        Or type instead
                    </button>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 mt-4">
                    <button
                        onClick={handleRecordWithNote}
                        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-full text-lg shadow-lg"
                    >
                        {quickNote ? 'Save & Continue Recording' : 'Record Full Dream'}
                    </button>

                    <div className="flex gap-3">
                        <button
                            onClick={() => handleAction(onSnooze)}
                            className="flex-1 py-2 bg-white/10 border border-white/20 text-white rounded-full"
                        >
                            Snooze 5m
                        </button>
                        <button
                            onClick={() => handleAction(onAwake)}
                            className="flex-1 py-2 bg-white/10 border border-white/20 text-white rounded-full"
                        >
                            Skip
                        </button>
                    </div>
                </div>

                {/* Tip */}
                <p className="text-white/40 text-xs mt-6">
                    💡 Tip: Stay still and relaxed. Movement helps dreams fade.
                </p>
            </div>
        </div>
    );
};
