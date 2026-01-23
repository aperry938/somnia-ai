import React, { useState, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: React.ReactNode;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: React.ReactNode, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

let toastId = 0;

// Toast animation variants
const toastVariants = {
    initial: {
        opacity: 0,
        y: 50,
        scale: 0.9,
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: 'spring' as const,
            stiffness: 400,
            damping: 25,
        },
    },
    exit: {
        opacity: 0,
        y: -20,
        scale: 0.9,
        transition: {
            duration: 0.2,
            ease: 'easeIn' as const,
        },
    },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: React.ReactNode, type: ToastType = 'success') => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const getToastClasses = (type: ToastType) => {
        switch (type) {
            case 'success':
                return 'bg-green-500 text-white shadow-green-500/25';
            case 'error':
                return 'bg-red-500 text-white shadow-red-500/25';
            default:
                return 'bg-day-accent dark:bg-night-accent text-white shadow-indigo-500/25';
        }
    };

    const getToastIcon = (type: ToastType) => {
        switch (type) {
            case 'success':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                );
            case 'error':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            default:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-[calc(5rem+var(--safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite" aria-atomic="true">
                <AnimatePresence mode="popLayout">
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            layout
                            variants={toastVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            role="alert"
                            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
                            className={`px-4 py-3 rounded-xl shadow-lg pointer-events-auto text-sm flex items-center gap-2 backdrop-blur-sm ${getToastClasses(toast.type)}`}
                        >
                            {getToastIcon(toast.type)}
                            <span>{toast.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
