import React, { useState, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { SleepQualityRating } from '../shared/SleepQualityRating';

interface DreamScribeModalProps {
    onSave: (dreamText: string, sleepQuality: number | null) => void;
    onClose: () => void;
}

export const DreamScribeModal: React.FC<DreamScribeModalProps> = ({ onSave, onClose }) => {
    const [dreamText, setDreamText] = useState('');
    const [sleepQuality, setSleepQuality] = useState<number | null>(null);

    const handleFinalTranscript = useCallback((transcript: string) => {
        setDreamText(prev => (prev ? prev.trim() + ' ' : '') + transcript);
    }, []);

    const { isListening, interimTranscript, startListening, stopListening, isSupported } = useSpeechRecognition(handleFinalTranscript);
    
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

    const handleSave = () => {
        if (!dreamText.trim() || isListening) return;
        onSave(dreamText, sleepQuality);
    };

    const displayText = isListening 
        ? (dreamText ? dreamText + ' ' : '') + interimTranscript 
        : dreamText;

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-lg animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                <h2 className="font-serif text-2xl text-center mb-4">The Dream Scribe</h2>
                <div className="relative">
                    <textarea
                        value={displayText}
                        onChange={(e) => setDreamText(e.target.value)}
                        className="w-full h-40 p-4 pr-12 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-lg focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent focus:outline-none transition-all custom-scrollbar"
                        placeholder="Speak or write your dream here..."
                        disabled={isListening}
                    ></textarea>
                     {isSupported && (
                        <button onClick={isListening ? stopListening : startListening} className={`absolute top-3 right-3 transition-colors ${isListening ? 'text-red-500' : 'text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                     )}
                </div>
                {isListening && (
                    <div className="flex items-center justify-center gap-2 text-sm text-red-500 mt-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span>Recording...</span>
                    </div>
                )}
                <div className="my-4">
                    <p className="text-center text-day-text-secondary dark:text-night-text-secondary mb-2">How was your sleep?</p>
                    <SleepQualityRating rating={sleepQuality} onRate={setSleepQuality} />
                </div>
                <div className="flex justify-center gap-4 mt-4">
                    <button onClick={onClose} className="py-2 px-6 bg-gray-200 dark:bg-gray-700 text-slate-800 dark:text-slate-200 rounded-full">Cancel</button>
                    <button 
                        onClick={handleSave} 
                        className="py-2 px-6 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full disabled:opacity-50"
                        disabled={!dreamText.trim() || isListening}
                    >
                        Save & Illuminate
                    </button>
                </div>
            </div>
        </div>
    );
};