import React, { useEffect, useState } from 'react';

interface VoiceOrbProps {
    isListening: boolean;
    isSpeaking: boolean;
    onTap: () => void;
    onClose: () => void;
}

/**
 * Animated voice orb for AI voice interface
 * - Idle: Gentle breathing animation
 * - Listening: Pulsing rings responding to input
 * - Speaking: Flowing wave animation
 */
export const VoiceOrb: React.FC<VoiceOrbProps> = ({
    isListening,
    isSpeaking,
    onTap,
    onClose,
}) => {
    const [audioLevel, setAudioLevel] = useState(0);

    // Simulate audio level animation when speaking
    useEffect(() => {
        if (!isSpeaking) {
            setAudioLevel(0);
            return;
        }

        const interval = setInterval(() => {
            setAudioLevel(Math.random() * 0.5 + 0.3);
        }, 100);

        return () => clearInterval(interval);
    }, [isSpeaking]);

    // Simulate mic input visualization when listening
    useEffect(() => {
        if (!isListening) {
            setAudioLevel(0);
            return;
        }

        const interval = setInterval(() => {
            setAudioLevel(Math.random() * 0.7 + 0.2);
        }, 80);

        return () => clearInterval(interval);
    }, [isListening]);

    const getStatusText = () => {
        if (isSpeaking) return 'Speaking...';
        if (isListening) return 'Listening...';
        return 'Tap to speak';
    };

    const getOrbColor = () => {
        if (isListening) return 'from-red-500 to-rose-600';
        if (isSpeaking) return 'from-indigo-500 to-purple-600';
        return 'from-indigo-400 to-purple-500';
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl animate-fadeIn">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-white/60 hover:text-white transition-colors"
                aria-label="Close voice mode"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Main orb container */}
            <div className="relative flex items-center justify-center">
                {/* Outer ripple rings */}
                <div
                    className={`absolute w-64 h-64 rounded-full bg-gradient-to-br ${getOrbColor()} opacity-10 transition-transform duration-300`}
                    style={{
                        transform: `scale(${1 + audioLevel * 0.5})`,
                    }}
                />
                <div
                    className={`absolute w-52 h-52 rounded-full bg-gradient-to-br ${getOrbColor()} opacity-15 transition-transform duration-200`}
                    style={{
                        transform: `scale(${1 + audioLevel * 0.4})`,
                    }}
                />
                <div
                    className={`absolute w-40 h-40 rounded-full bg-gradient-to-br ${getOrbColor()} opacity-20 transition-transform duration-150`}
                    style={{
                        transform: `scale(${1 + audioLevel * 0.3})`,
                    }}
                />

                {/* Ambient glow */}
                <div
                    className={`absolute w-48 h-48 rounded-full blur-3xl bg-gradient-to-br ${getOrbColor()} opacity-30 transition-all duration-500`}
                    style={{
                        transform: `scale(${0.8 + audioLevel * 0.4})`,
                    }}
                />

                {/* Main orb button */}
                <button
                    onClick={onTap}
                    disabled={isSpeaking}
                    className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${getOrbColor()} shadow-2xl transition-all duration-300 flex items-center justify-center group disabled:cursor-not-allowed`}
                    style={{
                        transform: `scale(${1 + audioLevel * 0.15})`,
                        boxShadow: `0 0 ${40 + audioLevel * 60}px rgba(99, 102, 241, ${0.4 + audioLevel * 0.3})`,
                    }}
                >
                    {/* Inner glow */}
                    <div className="absolute inset-2 rounded-full bg-white/20 blur-sm" />

                    {/* Icon */}
                    <div className="relative z-10">
                        {isSpeaking ? (
                            // Sound wave icon when speaking
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                        ) : isListening ? (
                            // Animated mic icon when listening
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                {/* Pulsing dot */}
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                            </div>
                        ) : (
                            // Static mic icon when idle
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        )}
                    </div>

                    {/* Breathing animation ring for idle state */}
                    {!isListening && !isSpeaking && (
                        <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" style={{ animationDuration: '2s' }} />
                    )}
                </button>
            </div>

            {/* Status text */}
            <p className="mt-8 text-white/80 text-lg font-medium tracking-wide">
                {getStatusText()}
            </p>

            {/* Hint text */}
            <p className="mt-2 text-white/40 text-sm">
                {isSpeaking ? 'AI is responding' : isListening ? 'Speak now' : 'Tap the orb to start'}
            </p>

            {/* Voice wave visualization at bottom */}
            <div className="absolute bottom-12 left-0 right-0 flex items-end justify-center gap-1 h-16 px-8">
                {Array.from({ length: 40 }).map((_, i) => {
                    const baseHeight = Math.sin(i * 0.3) * 0.3 + 0.3;
                    const animatedHeight = (isSpeaking || isListening)
                        ? baseHeight + Math.sin(Date.now() / 100 + i * 0.5) * audioLevel * 0.5
                        : baseHeight * 0.3;

                    return (
                        <div
                            key={i}
                            className={`w-1 rounded-full bg-gradient-to-t ${getOrbColor()} transition-all duration-75`}
                            style={{
                                height: `${Math.max(4, animatedHeight * 64)}px`,
                                opacity: 0.3 + animatedHeight * 0.7,
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};
