import React, { useState, useEffect, useRef } from 'react';
import { getCoachResponse } from '../../services/geminiService';
import { useAppContext } from '../../contexts/AppContext';
import { ChatMessage } from '../../types';
import { isPremium } from '../../services/secureSubscriptionService';
import haptics from '../../services/hapticsService';
import { sanitizeText, INPUT_LIMITS, containsScriptInjection } from '../../services/validationService';

const COACH_HISTORY_KEY = 'somnia_coach_history';
const MAX_SAVED_MESSAGES = 20; // Limit saved history to prevent storage bloat

export const AICoachModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { coachPersonality } = useAppContext();
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const chatBoxRef = useRef<HTMLDivElement>(null);

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

    const fetchInitialResponse = async () => {
        setIsLoading(true);
        try {
            const responseText = await getCoachResponse([], coachPersonality);
            setHistory([{ id: Date.now(), role: 'model', parts: [{ text: responseText }] }]);
        } catch (e) {
            console.error(e);
            setHistory([{ id: Date.now(), role: 'model', parts: [{ text: "I'm having trouble connecting right now. Please ensure your API key is configured and try again." }], isError: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [history]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSend = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        // Sanitize and validate message
        const sanitized = sanitizeText(messageText).slice(0, INPUT_LIMITS.chatMessage);
        if (!sanitized || containsScriptInjection(sanitized)) return;

        haptics.medium();
        const userMessage: ChatMessage = { id: Date.now(), role: 'user', parts: [{ text: sanitized }] };
        const newHistory = [...history, userMessage];
        setHistory(newHistory);
        setInput('');
        setIsLoading(true);

        try {
            const responseText = await getCoachResponse(newHistory, coachPersonality);
            setHistory(prev => [...prev, { id: Date.now(), role: 'model', parts: [{ text: responseText }] }]);
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

    // PRO-only gate - show upgrade prompt for non-premium users
    if (!userIsPremium) {
        return (
            <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="coach-pro-title">
                <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-md animate-fadeIn text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                    </div>
                    <h2 id="coach-pro-title" className="font-serif text-2xl mb-2">AI Sleep Coach</h2>
                    <span className="inline-block px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-full mb-4">
                        PRO Feature
                    </span>
                    <p className="text-day-text-secondary dark:text-night-text-secondary mb-6">
                        Get personalized sleep advice, dream interpretations, and relaxation guidance from your AI coach.
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
                            <span>Personalized coaching style</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Dream analysis & interpretation</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Sleep improvement tips</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full py-3 min-h-[48px] bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-full hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                        Upgrade to PRO
                    </button>
                    <button
                        onClick={onClose}
                        className="mt-3 py-2 min-h-[44px] text-sm text-day-text-secondary dark:text-night-text-secondary hover:underline"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="coach-title">
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-lg animate-fadeIn flex flex-col h-[80vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <h2 id="coach-title" className="font-serif text-2xl">AI Sleep Coach</h2>
                        <span className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium">PRO</span>
                    </div>
                    {history.length > 1 && (
                        <button
                            onClick={handleClearHistory}
                            aria-label="Clear chat history"
                            className="text-xs min-h-[44px] px-3 py-2 text-day-text-secondary dark:text-night-text-secondary hover:text-red-500 transition-colors flex items-center"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div ref={chatBoxRef} className="flex-grow overflow-y-auto custom-scrollbar p-2 mb-4 border border-day-border dark:border-night-border rounded-lg">
                    {history.map((msg) => (
                        <div key={msg.id}>
                            {msg.isError ? (
                                <div className="text-center my-2 p-3 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                                    <p>{msg.parts[0].text}</p>
                                    <button onClick={handleRetry} aria-label="Retry sending message" className="mt-2 px-4 py-2 min-h-[44px] bg-red-500 text-white text-sm rounded-full flex items-center justify-center mx-auto">Retry</button>
                                </div>
                            ) : (
                                <div className={`my-2 p-3 rounded-lg text-sm md:text-base ${msg.role === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-right ml-auto' : 'bg-white/50 dark:bg-slate-700/50 text-left mr-auto'} max-w-[85%]`}>
                                    <p className="whitespace-pre-wrap">{msg.parts[0].text}</p>
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
                        placeholder="Ask for sleep advice..."
                        aria-label="Chat message input"
                        className="flex-grow p-3 min-h-[48px] text-base border rounded-full bg-white/50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-day-accent border-day-border dark:border-night-border"
                    />
                    <button
                        onClick={() => handleSend(input)}
                        aria-label="Send message"
                        className="bg-day-accent dark:bg-night-accent text-white rounded-full px-5 min-h-[48px] disabled:opacity-50 flex items-center justify-center"
                        disabled={isLoading || !input.trim()}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};
