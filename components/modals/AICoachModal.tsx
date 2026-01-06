import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getCoachResponse } from '../../services/geminiService';
import { useAppContext } from '../../contexts/AppContext';
import { ChatMessage } from '../../types';
import { isPremium } from '../../services/secureSubscriptionService';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { speakText, stopSpeaking } from '../../services/ttsService';
import haptics from '../../services/hapticsService';

const COACH_HISTORY_KEY = 'somnia_coach_history';
const MAX_SAVED_MESSAGES = 20; // Limit saved history to prevent storage bloat

export const AICoachModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { coachPersonality } = useAppContext();
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const chatBoxRef = useRef<HTMLDivElement>(null);

    // Speech recognition for voice input
    const handleVoiceInput = useCallback((transcript: string) => {
        setInput(prev => (prev + ' ' + transcript).trim());
        haptics.light();
    }, []);
    const { isListening, interimTranscript, startListening, stopListening, isSupported: speechSupported } = useSpeechRecognition(handleVoiceInput);

    // Check if TTS is supported
    const ttsSupported = 'speechSynthesis' in window;

    // PRO check - entire feature is PRO only
    const userIsPremium = isPremium();

    // Load saved history on mount
    useEffect(() => {
        if (!userIsPremium) return; // Don't load history for non-premium users

        const savedHistory = localStorage.getItem(COACH_HISTORY_KEY);
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setHistory(parsed);
                    setIsLoading(false);
                    return; // Don't fetch initial if we have history
                }
            } catch (e) {
                // Invalid JSON, start fresh
            }
        }
        fetchInitialResponse();
    }, [userIsPremium]);

    // Save history whenever it changes
    useEffect(() => {
        if (history.length > 0 && userIsPremium) {
            // Only save last N messages to prevent bloat
            const toSave = history.slice(-MAX_SAVED_MESSAGES);
            localStorage.setItem(COACH_HISTORY_KEY, JSON.stringify(toSave));
        }
    }, [history, userIsPremium]);

    // Cleanup speech on unmount
    useEffect(() => {
        return () => {
            stopSpeaking();
            if (isListening) stopListening();
        };
    }, [isListening, stopListening]);

    const fetchInitialResponse = async () => {
        setIsLoading(true);
        try {
            const responseText = await getCoachResponse([], coachPersonality);
            setHistory([{ id: Date.now(), role: 'model', parts: [{ text: responseText }] }]);
            // Auto-speak greeting if voice mode is enabled
            if (voiceModeEnabled && ttsSupported) {
                speakResponse(responseText);
            }
        } catch (e) {
            console.error(e);
            setHistory([{ id: Date.now(), role: 'model', parts: [{ text: "I'm having trouble connecting right now. Please ensure your API key is configured and try again." }], isError: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    const speakResponse = (text: string) => {
        if (!ttsSupported) return;
        setIsSpeaking(true);
        speakText(text);
        // Estimate speaking duration (roughly 150 words per minute)
        const wordCount = text.split(/\s+/).length;
        const estimatedDuration = (wordCount / 150) * 60 * 1000;
        setTimeout(() => setIsSpeaking(false), Math.max(estimatedDuration, 2000));
    };

    const handleStopSpeaking = () => {
        stopSpeaking();
        setIsSpeaking(false);
        haptics.light();
    };

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [history]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                stopSpeaking();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSend = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        haptics.medium();
        const userMessage: ChatMessage = { id: Date.now(), role: 'user', parts: [{ text: messageText }] };
        const newHistory = [...history, userMessage];
        setHistory(newHistory);
        setInput('');
        setIsLoading(true);

        // Stop listening if we were recording
        if (isListening) stopListening();

        try {
            const responseText = await getCoachResponse(newHistory, coachPersonality);
            setHistory(prev => [...prev, { id: Date.now(), role: 'model', parts: [{ text: responseText }] }]);

            // Auto-speak response if voice mode is enabled
            if (voiceModeEnabled && ttsSupported) {
                speakResponse(responseText);
            }
            haptics.success();
        } catch (e) {
            setHistory(prev => [...prev, { id: Date.now(), role: 'model', parts: [{ text: "Sorry, I couldn't get a response." }], isError: true }]);
            haptics.error();
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = async () => {
        haptics.light();
        const historyWithoutError = history.filter(m => !m.isError);
        const lastUserMessage = historyWithoutError.slice().reverse().find(m => m.role === 'user');

        setHistory(historyWithoutError);

        if (lastUserMessage) {
            await handleSend(lastUserMessage.parts[0].text);
        } else {
            await fetchInitialResponse();
        }
    };

    const handleClearHistory = () => {
        haptics.medium();
        localStorage.removeItem(COACH_HISTORY_KEY);
        setHistory([]);
        fetchInitialResponse();
    };

    const toggleVoiceMode = () => {
        haptics.selection();
        setVoiceModeEnabled(!voiceModeEnabled);
        if (voiceModeEnabled) {
            stopSpeaking();
            if (isListening) stopListening();
        }
    };

    const toggleListening = () => {
        haptics.medium();
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    // PRO-only gate - show upgrade prompt for non-premium users
    if (!userIsPremium) {
        return (
            <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
                <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-md animate-fadeIn text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                    </div>
                    <h2 className="font-serif text-2xl mb-2">AI Sleep Coach</h2>
                    <span className="inline-block px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-full mb-4">
                        PRO Feature
                    </span>
                    <p className="text-day-text-secondary dark:text-night-text-secondary mb-6">
                        Get unlimited personalized sleep advice, dream interpretations, and relaxation guidance with voice mode support.
                    </p>
                    <div className="space-y-3 text-left mb-6 bg-white/30 dark:bg-black/20 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Unlimited AI conversations</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Voice input & spoken responses</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Personalized coaching style</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Dream analysis & interpretation</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-full hover:opacity-90 transition-opacity"
                    >
                        Upgrade to PRO
                    </button>
                    <button
                        onClick={onClose}
                        className="mt-3 text-sm text-day-text-secondary dark:text-night-text-secondary hover:underline"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-lg animate-fadeIn flex flex-col h-[80vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <h2 className="font-serif text-2xl">AI Sleep Coach</h2>
                        <span className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium">PRO</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Voice Mode Toggle */}
                        {(speechSupported || ttsSupported) && (
                            <button
                                onClick={toggleVoiceMode}
                                className={`p-2 rounded-lg transition-colors ${voiceModeEnabled
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-white/30 dark:bg-black/20 text-day-text-secondary dark:text-night-text-secondary hover:bg-white/50 dark:hover:bg-black/30'}`}
                                title={voiceModeEnabled ? "Disable voice mode" : "Enable voice mode"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </button>
                        )}
                        {history.length > 1 && (
                            <button
                                onClick={handleClearHistory}
                                className="text-xs text-day-text-secondary dark:text-night-text-secondary hover:text-red-500 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Voice Mode Indicator */}
                {voiceModeEnabled && (
                    <div className="flex items-center justify-center gap-2 py-2 mb-2 bg-indigo-500/10 rounded-lg text-sm text-indigo-600 dark:text-indigo-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
                        </svg>
                        Voice mode active • Tap mic to speak
                    </div>
                )}

                <div ref={chatBoxRef} className="flex-grow overflow-y-auto custom-scrollbar p-2 mb-4 border border-day-border dark:border-night-border rounded-lg">
                    {history.map((msg) => (
                        <div key={msg.id}>
                            {msg.isError ? (
                                <div className="text-center my-2 p-3 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                                    <p>{msg.parts[0].text}</p>
                                    <button onClick={handleRetry} className="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded-full">Retry</button>
                                </div>
                            ) : (
                                <div className={`my-2 p-3 rounded-lg text-sm md:text-base ${msg.role === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-right ml-auto' : 'bg-white/50 dark:bg-slate-700/50 text-left mr-auto'} max-w-[85%]`}>
                                    <p className="whitespace-pre-wrap">{msg.parts[0].text}</p>
                                    {/* Speak button for AI responses */}
                                    {msg.role === 'model' && ttsSupported && !msg.isError && (
                                        <button
                                            onClick={() => {
                                                haptics.light();
                                                if (isSpeaking) {
                                                    handleStopSpeaking();
                                                } else {
                                                    speakResponse(msg.parts[0].text);
                                                }
                                            }}
                                            className="mt-2 text-xs text-day-accent dark:text-night-accent hover:underline flex items-center gap-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                            </svg>
                                            {isSpeaking ? 'Stop' : 'Listen'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && <div className="text-center p-4 text-day-text-secondary dark:text-night-text-secondary">Thinking...</div>}
                </div>

                {/* Input area with voice button */}
                <div className="flex gap-2 flex-shrink-0">
                    {/* Voice input button (only when voice mode is enabled) */}
                    {voiceModeEnabled && speechSupported && (
                        <button
                            onClick={toggleListening}
                            className={`p-2 rounded-full transition-all ${isListening
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-white/30 dark:bg-black/20 text-day-text-secondary dark:text-night-text-secondary hover:bg-white/50'}`}
                            title={isListening ? "Stop recording" : "Start recording"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>
                    )}
                    <input
                        value={isListening ? input + (interimTranscript ? ' ' + interimTranscript : '') : input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                        type="text"
                        placeholder={isListening ? "Listening..." : "Ask for sleep advice..."}
                        className={`flex-grow p-2 border rounded-full bg-white/50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-day-accent ${isListening ? 'border-red-400' : 'border-day-border dark:border-night-border'}`}
                        disabled={isListening}
                    />
                    <button
                        onClick={() => handleSend(input)}
                        className="bg-day-accent dark:bg-night-accent text-white rounded-full px-4 disabled:opacity-50"
                        disabled={isLoading || !input.trim()}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};
