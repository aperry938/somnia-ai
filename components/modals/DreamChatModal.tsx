import React, { useState, useEffect, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { getDreamChatResponse } from '../../services/geminiService';
import { ChatMessage, Dream } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import haptics from '../../services/hapticsService';
import { sanitizeText, INPUT_LIMITS, containsScriptInjection } from '../../services/validationService';
import { useToast } from '../shared/Toast';

interface DreamChatModalProps {
    dream: Dream;
    onClose: () => void;
}

// Crisis keywords that trigger mental health resource display
const CRISIS_KEYWORDS = ['suicide', 'self-harm', 'hurting myself', 'ending it', 'kill myself', 'want to die'];

const hasCrisisContent = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

export const DreamChatModal: React.FC<DreamChatModalProps> = ({ dream, onClose }) => {
    const { updateDream } = useAppContext();
    const [history, setHistory] = useState<ChatMessage[]>(dream.chatHistory || []);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatBoxRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    // Check if dream content contains crisis-related keywords
    const showCrisisResources = hasCrisisContent(dream.dreamText);

    const fetchInitialResponse = async () => {
        setIsLoading(true);
        try {
            const responseText = await getDreamChatResponse(dream, []);
            const initialHistory = [{ id: Date.now(), role: 'model' as const, parts: [{ text: responseText }] }];
            setHistory(initialHistory);
            updateDream({ ...dream, chatHistory: initialHistory });
        } catch (_e) {
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

        // Check daily chat limit (50 per day)
        const today = new Date().toDateString();
        const stored = localStorage.getItem('somnia_daily_chat');
        const [lastDate, countStr] = stored ? JSON.parse(stored) : ['', '0'];
        const count = lastDate === today ? parseInt(countStr) : 0;
        const DAILY_LIMIT = 50;

        if (count >= DAILY_LIMIT) {
            showToast('Daily chat limit reached (50/day)', 'info');
            return;
        }

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
            // Increment chat count
            localStorage.setItem('somnia_daily_chat', JSON.stringify([today, count + 1]));
            haptics.success();
        } catch (_e) {
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

        if (lastUserMessage && lastUserMessage.parts[0]) {
            await handleSend(lastUserMessage.parts[0].text);
        } else {
            await fetchInitialResponse();
        }
    };

    const y = useMotionValue(0);
    const backdropOpacity = useTransform(y, [0, 200], [1, 0.3]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
            haptics.medium();
            onClose();
        }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-day-bg-start/70 dark:bg-night-bg-start/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 pb-[calc(4rem+var(--safe-area-inset-bottom))] sm:pb-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dream-chat-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-white/95 dark:bg-slate-800/95 border border-day-border dark:border-night-border rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-lg flex flex-col h-[90vh] sm:h-[80vh]"
                onClick={(e) => e.stopPropagation()}
                style={{ y }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={handleDragEnd}
            >
                {/* Drag indicator */}
                <div className="flex justify-center pb-2 sm:hidden cursor-grab active:cursor-grabbing">
                    <div className="w-10 h-1 rounded-full bg-day-border dark:bg-night-border" />
                </div>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 id="dream-chat-title" className="font-serif text-2xl">Dream Discussion</h2>
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                PRO
                            </span>
                        </div>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary truncate max-w-[200px]">{dream.title}</p>
                    </div>
                    <button onClick={onClose} aria-label="Close dream chat" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Crisis Resources Banner */}
                {showCrisisResources && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex-shrink-0">
                        <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                            If you're experiencing difficult thoughts, help is available 24/7:
                            <a href="tel:988" className="underline ml-1 font-bold">988 Suicide & Crisis Lifeline</a>
                        </p>
                    </div>
                )}

                <div ref={chatBoxRef} className="flex-grow overflow-y-auto custom-scrollbar p-2 mb-4 border border-day-border dark:border-night-border rounded-lg">
                    {history.map((msg) => (
                        <div key={msg.id}>
                            {msg.isError ? (
                                <div className="text-center my-2 p-3 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                                    <p>{msg.parts[0]?.text ?? ''}</p>
                                    <button onClick={handleRetry} aria-label="Retry sending message" className="mt-2 px-4 py-2 min-h-[44px] bg-red-500 text-white text-sm rounded-full">Retry</button>
                                </div>
                            ) : (
                                <div className={`my-2 p-3 rounded-lg text-sm md:text-base ${msg.role === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-right ml-auto' : 'bg-white/50 dark:bg-slate-700/50 text-left mr-auto'} max-w-[85%]`}>
                                    <p className="whitespace-pre-wrap">{msg.parts[0]?.text ?? ''}</p>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && <div className="text-center p-4 text-day-text-secondary dark:text-night-text-secondary">Thinking...</div>}
                </div>

                {/* Input area */}
                <div className="flex gap-2 flex-shrink-0 pb-[var(--safe-area-inset-bottom)] sm:pb-0">
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
            </motion.div>
        </motion.div>
    );
};
