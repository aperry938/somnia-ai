import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDreamChatResponse } from '../../services/geminiService';
import { ChatMessage, Dream } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { speakText, stopSpeaking, isVoiceAvailable } from '../../services/ttsService';
import haptics from '../../services/hapticsService';
import { VoiceOrb } from '../shared/VoiceOrb';

interface DreamChatModalProps {
    dream: Dream;
    onClose: () => void;
}

export const DreamChatModal: React.FC<DreamChatModalProps> = ({ dream, onClose }) => {
    const { updateDream } = useAppContext();
    const [history, setHistory] = useState<ChatMessage[]>(dream.chatHistory || []);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const chatBoxRef = useRef<HTMLDivElement>(null);

    // Check if AI voice is available (premium + configured)
    const voiceAvailable = isVoiceAvailable();

    // Speech recognition for voice input - auto-send when done
    const handleVoiceInput = useCallback((transcript: string) => {
        if (transcript.trim()) {
            haptics.light();
            handleSendVoice(transcript.trim());
        }
    }, []);
    const { isListening, interimTranscript, startListening, stopListening, isSupported: speechSupported } = useSpeechRecognition(handleVoiceInput);

    const speakResponse = async (text: string) => {
        if (!voiceAvailable) return;
        setIsSpeaking(true);
        try {
            await speakText(text);
        } finally {
            setIsSpeaking(false);
        }
    };

    const handleStopSpeaking = () => {
        stopSpeaking();
        setIsSpeaking(false);
        haptics.light();
    };

    // Handle sending voice messages
    const handleSendVoice = async (text: string) => {
        if (!text.trim() || isLoading) return;

        haptics.medium();
        const userMessage: ChatMessage = { id: Date.now(), role: 'user', parts: [{ text }] };
        const newHistory = [...history, userMessage];
        setHistory(newHistory);
        setIsLoading(true);

        try {
            const responseText = await getDreamChatResponse(dream, newHistory);
            const finalHistory = [...newHistory, { id: Date.now(), role: 'model' as const, parts: [{ text: responseText }] }];
            setHistory(finalHistory);
            updateDream({ ...dream, chatHistory: finalHistory });

            if (voiceModeEnabled && voiceAvailable) {
                await speakResponse(responseText);
            }
            haptics.success();
        } catch (e) {
            const errorHistory = [...newHistory, { id: Date.now(), role: 'model' as const, parts: [{ text: "Sorry, I couldn't get a response." }], isError: true }];
            setHistory(errorHistory);
            haptics.error();
        } finally {
            setIsLoading(false);
        }
    };

    const fetchInitialResponse = async () => {
        setIsLoading(true);
        try {
            const responseText = await getDreamChatResponse(dream, []);
            const initialHistory = [{ id: Date.now(), role: 'model' as const, parts: [{ text: responseText }] }];
            setHistory(initialHistory);
            updateDream({ ...dream, chatHistory: initialHistory });
            if (voiceModeEnabled && voiceAvailable) {
                speakResponse(responseText);
            }
        } catch (e) {
            const errorHistory = [{ id: Date.now(), role: 'model' as const, parts: [{ text: "Failed to start conversation." }], isError: true }];
            setHistory(errorHistory);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (history.length === 0) {
            fetchInitialResponse();
        }
    }, []);

    // Cleanup speech on unmount
    useEffect(() => {
        return () => {
            stopSpeaking();
            if (isListening) stopListening();
        };
    }, [isListening, stopListening]);

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

        if (isListening) stopListening();

        try {
            const responseText = await getDreamChatResponse(dream, newHistory);
            const finalHistory = [...newHistory, { id: Date.now(), role: 'model' as const, parts: [{ text: responseText }] }];
            setHistory(finalHistory);
            updateDream({ ...dream, chatHistory: finalHistory });
            if (voiceModeEnabled && voiceAvailable) {
                speakResponse(responseText);
            }
            haptics.success();
        } catch (e) {
            const errorHistory = [...newHistory, { id: Date.now(), role: 'model' as const, parts: [{ text: "Sorry, I couldn't get a response." }], isError: true }];
            setHistory(errorHistory);
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

    const toggleVoiceMode = () => {
        haptics.selection();
        if (voiceModeEnabled) {
            stopSpeaking();
            if (isListening) stopListening();
        }
        setVoiceModeEnabled(!voiceModeEnabled);
    };

    const handleVoiceOrbTap = () => {
        haptics.medium();
        if (isListening) {
            stopListening();
        } else if (!isSpeaking && !isLoading) {
            startListening();
        }
    };

    const handleVoiceOrbClose = () => {
        stopSpeaking();
        if (isListening) stopListening();
        setVoiceModeEnabled(false);
        haptics.light();
    };

    return (
        <>
            {/* Voice Orb Overlay */}
            {voiceModeEnabled && voiceAvailable && (
                <VoiceOrb
                    isListening={isListening}
                    isSpeaking={isSpeaking || isLoading}
                    onTap={handleVoiceOrbTap}
                    onClose={handleVoiceOrbClose}
                />
            )}

            <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
                <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-lg animate-fadeIn flex flex-col h-[80vh]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-serif text-2xl">Dream Discussion</h2>
                                <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-1.5 py-0.5 rounded-full font-medium">PRO</span>
                            </div>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary truncate max-w-[200px]">{dream.title}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Voice Mode Toggle - only for premium users with AI voice */}
                            {voiceAvailable && (
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
                        </div>
                    </div>

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
                                        {/* Speak button for AI responses - only when AI voice is available */}
                                        {msg.role === 'model' && voiceAvailable && !msg.isError && (
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

                    {/* Input area */}
                    <div className="flex gap-2 flex-shrink-0">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                            type="text"
                            placeholder="Ask about your dream..."
                            className="flex-grow p-2 border rounded-full bg-white/50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-day-accent border-day-border dark:border-night-border"
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
        </>
    );
};
