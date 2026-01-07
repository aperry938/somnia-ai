import React, { useState, useEffect, useRef } from 'react';
import { getDreamChatResponse } from '../../services/geminiService';
import { ChatMessage, Dream } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import haptics from '../../services/hapticsService';
import { sanitizeText, INPUT_LIMITS, containsScriptInjection } from '../../services/validationService';

interface DreamChatModalProps {
    dream: Dream;
    onClose: () => void;
}

export const DreamChatModal: React.FC<DreamChatModalProps> = ({ dream, onClose }) => {
    const { updateDream } = useAppContext();
    const [history, setHistory] = useState<ChatMessage[]>(dream.chatHistory || []);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatBoxRef = useRef<HTMLDivElement>(null);

    const fetchInitialResponse = async () => {
        setIsLoading(true);
        try {
            const responseText = await getDreamChatResponse(dream, []);
            const initialHistory = [{ id: Date.now(), role: 'model' as const, parts: [{ text: responseText }] }];
            setHistory(initialHistory);
            updateDream({ ...dream, chatHistory: initialHistory });
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
            const responseText = await getDreamChatResponse(dream, newHistory);
            const finalHistory = [...newHistory, { id: Date.now(), role: 'model' as const, parts: [{ text: responseText }] }];
            setHistory(finalHistory);
            updateDream({ ...dream, chatHistory: finalHistory });
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

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="dream-chat-title">
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-lg animate-fadeIn flex flex-col h-[80vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 id="dream-chat-title" className="font-serif text-2xl">Dream Discussion</h2>
                            <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-1.5 py-0.5 rounded-full font-medium">PRO</span>
                        </div>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary truncate max-w-[200px]">{dream.title}</p>
                    </div>
                    <button onClick={onClose} aria-label="Close dream chat" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div ref={chatBoxRef} className="flex-grow overflow-y-auto custom-scrollbar p-2 mb-4 border border-day-border dark:border-night-border rounded-lg">
                    {history.map((msg) => (
                        <div key={msg.id}>
                            {msg.isError ? (
                                <div className="text-center my-2 p-3 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                                    <p>{msg.parts[0].text}</p>
                                    <button onClick={handleRetry} aria-label="Retry sending message" className="mt-2 px-4 py-2 min-h-[44px] bg-red-500 text-white text-sm rounded-full">Retry</button>
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
                        placeholder="Ask about your dream..."
                        aria-label="Chat message input"
                        className="flex-grow p-3 min-h-[48px] text-base border rounded-full bg-white/50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-day-accent border-day-border dark:border-night-border"
                    />
                    <button
                        onClick={() => handleSend(input)}
                        aria-label="Send message"
                        className="bg-day-accent dark:bg-night-accent text-white rounded-full px-5 min-h-[48px] disabled:opacity-50"
                        disabled={isLoading || !input.trim()}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};
