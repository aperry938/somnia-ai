import React, { useState, useEffect, useRef } from 'react';
import { getCoachResponse } from '../../services/geminiService';
import { ChatMessage } from '../../types';

export const AICoachModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const chatBoxRef = useRef<HTMLDivElement>(null);

    const fetchInitialResponse = async () => {
        setIsLoading(true);
        try {
            const responseText = await getCoachResponse([]);
            setHistory([{ id: Date.now(), role: 'model', parts: [{ text: responseText }] }]);
        } catch(e) {
            console.error(e);
            setHistory([{id: Date.now(), role: 'model', parts: [{ text: "I'm having trouble connecting right now. Please ensure your API key is configured and try again."}], isError: true}]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialResponse();
    }, []);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [history]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSend = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;
        const userMessage: ChatMessage = { id: Date.now(), role: 'user', parts: [{ text: messageText }] };
        const newHistory = [...history, userMessage];
        setHistory(newHistory);
        setInput('');
        setIsLoading(true);

        try {
            const responseText = await getCoachResponse(newHistory);
            setHistory(prev => [...prev, { id: Date.now(), role: 'model', parts: [{ text: responseText }] }]);
        } catch (e) {
            setHistory(prev => [...prev, { id: Date.now(), role: 'model', parts: [{ text: "Sorry, I couldn't get a response." }], isError: true }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRetry = async () => {
        const historyWithoutError = history.filter(m => !m.isError);
        // Fix: Replace findLast with a more compatible method to support older JS environments.
        const lastUserMessage = historyWithoutError.slice().reverse().find(m => m.role === 'user');
        
        setHistory(historyWithoutError);

        if (lastUserMessage) {
            await handleSend(lastUserMessage.parts[0].text);
        } else {
            await fetchInitialResponse();
        }
    };

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-lg animate-fadeIn flex flex-col h-[80vh]" onClick={(e) => e.stopPropagation()}>
                <h2 className="font-serif text-2xl text-center mb-4 flex-shrink-0">AI Sleep Coach</h2>
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
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && <div className="text-center p-4 text-day-text-secondary dark:text-night-text-secondary">Thinking...</div>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend(input)} type="text" placeholder="Ask for sleep advice..." className="flex-grow p-2 border border-day-border dark:border-night-border rounded-full bg-white/50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-day-accent" />
                    <button onClick={() => handleSend(input)} className="bg-day-accent dark:bg-night-accent text-white rounded-full px-4" disabled={isLoading}>Send</button>
                </div>
            </div>
        </div>
    );
};