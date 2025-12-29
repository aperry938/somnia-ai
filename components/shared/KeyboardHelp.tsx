import React, { useState, useEffect } from 'react';

export const KeyboardShortcutsHelp: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const shortcuts = [
        { key: '1', description: 'Go to Alarms' },
        { key: '2', description: 'Go to Sleep' },
        { key: '3', description: 'Go to Chronicle' },
        { key: '4', description: 'Go to Insights' },
        { key: '?', description: 'Show this help' },
        { key: 'Esc', description: 'Close dialogs' },
    ];

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-6 max-w-sm w-full animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="font-serif text-2xl mb-4">Keyboard Shortcuts</h2>
                <div className="space-y-2">
                    {shortcuts.map(s => (
                        <div key={s.key} className="flex justify-between items-center">
                            <span className="text-day-text-secondary dark:text-night-text-secondary">{s.description}</span>
                            <kbd className="px-2 py-1 bg-day-bg-start dark:bg-night-bg-start rounded text-sm font-mono">
                                {s.key}
                            </kbd>
                        </div>
                    ))}
                </div>
                <button
                    onClick={onClose}
                    className="mt-6 w-full py-2 bg-day-accent dark:bg-night-accent text-white rounded-full font-medium"
                >
                    Got it
                </button>
            </div>
        </div>
    );
};

// Custom hook for keyboard shortcuts help
export const useKeyboardHelp = () => {
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === '?') {
                setIsHelpOpen(true);
            } else if (e.key === 'Escape') {
                setIsHelpOpen(false);
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    return { isHelpOpen, closeHelp: () => setIsHelpOpen(false) };
};
