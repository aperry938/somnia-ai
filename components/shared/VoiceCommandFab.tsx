import React from 'react';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';

export const VoiceCommandFab: React.FC = () => {
    const { isListening, startListening, stopListening, isSupported, isProcessing } = useVoiceCommands();

    if (!isSupported) return null;

    return (
        <button
            onClick={isListening ? stopListening : startListening}
            className={`fixed top-6 right-6 z-40 p-4 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 ${isListening
                ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-500/30'
                : 'bg-day-accent dark:bg-night-accent text-white hover:brightness-110'
                }`}
            title={isListening ? "Listening..." : "Voice Commands"}
            aria-label={isListening ? "Stop listening" : "Start voice commands"}
        >
            {isProcessing ? (
                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isListening ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.718 2.718 0 01-3 0 2.716 2.716 0 01-1.5-.454c-.416-.272-.64-.735-.875-1.15.234-.416.459-.879.875-1.15.522-.303 1.045-.454 1.5-.454.455 0 .978.151 1.5.454.416.272.64.735.875 1.15-.235.415-.459.878-.875 1.15-.522.303-1.045.454-1.5.454zM12 3v10m0 0l-3-3m3 3l3-3M3.05 13a9 9 0 1117.9 0" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    )}
                </svg>
            )}

            {/* Listening Ripple Effect */}
            {isListening && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 animate-ping top-0 left-0"></span>
            )}
        </button>
    );
};
