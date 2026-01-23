// components/modals/PasswordInputModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useBackButton } from '../../hooks/useBackButton';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface PasswordInputModalProps {
    isOpen: boolean;
    mode: 'set' | 'enter';
    onSubmit: (password: string) => void;
    onCancel: () => void;
    error?: string;
    isLoading?: boolean;
}

/**
 * SECURITY FIX: Proper password modal with masked input
 * Replaces browser prompt() which shows passwords in plain text
 */
export const PasswordInputModal: React.FC<PasswordInputModalProps> = ({
    isOpen,
    mode,
    onSubmit,
    onCancel,
    error,
    isLoading = false
}) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Hardware back button support
    useBackButton(isOpen, onCancel);

    // Focus trap for accessibility
    useFocusTrap(isOpen, modalRef);

    // Focus input on open
    useEffect(() => {
        if (isOpen && inputRef.current) {
            // Small delay to ensure modal is mounted and focus trap has set up
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setPassword('');
            setConfirmPassword('');
            setShowPassword(false);
            setValidationError(null);
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        if (mode === 'set') {
            if (password.length < 8) {
                setValidationError('Password must be at least 8 characters');
                return;
            }
            if (password !== confirmPassword) {
                setValidationError('Passwords do not match');
                return;
            }
        }

        if (!password) {
            setValidationError('Password is required');
            return;
        }

        onSubmit(password);
    };

    if (!isOpen) return null;

    const title = mode === 'set' ? 'Set Backup Password' : 'Enter Backup Password';
    const description = mode === 'set'
        ? 'Create a strong password to encrypt your dream backup. You will need this password to restore your data.'
        : 'Enter the password you used when creating this encrypted backup.';

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 pt-4 pb-[calc(6.5rem+var(--safe-area-inset-bottom))] sm:pb-4 z-50"
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
        >
            <div
                ref={modalRef}
                className="w-full max-w-md bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-day-border dark:border-night-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div>
                            <h2 id="password-modal-title" className="font-serif text-xl font-bold text-day-text-primary dark:text-night-text-primary">
                                {title}
                            </h2>
                            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mt-1">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5">
                    {/* Error display */}
                    {(error || validationError) && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            {error || validationError}
                        </div>
                    )}

                    {/* Password input */}
                    <div className="mb-4">
                        <label htmlFor="password-input" className="block text-sm font-medium text-day-text-secondary dark:text-night-text-secondary mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                ref={inputRef}
                                id="password-input"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 min-h-[48px] text-base bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-xl focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent pr-12"
                                placeholder="Enter password"
                                autoComplete={mode === 'set' ? 'new-password' : 'current-password'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Confirm password (only for set mode) */}
                    {mode === 'set' && (
                        <div className="mb-4">
                            <label htmlFor="confirm-password-input" className="block text-sm font-medium text-day-text-secondary dark:text-night-text-secondary mb-2">
                                Confirm Password
                            </label>
                            <input
                                id="confirm-password-input"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 min-h-[48px] text-base bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-xl focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
                                placeholder="Confirm password"
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    {/* Password requirements hint for set mode */}
                    {mode === 'set' && (
                        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                <strong>Important:</strong> Store this password safely. If you forget it, your encrypted backup cannot be recovered.
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isLoading}
                            className="flex-1 py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-xl text-day-text-secondary dark:text-night-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-3 min-h-[48px] bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                mode === 'set' ? 'Encrypt & Download' : 'Decrypt'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
