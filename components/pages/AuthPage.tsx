/**
 * Authentication Page for Somnia
 *
 * Provides login, signup, and password reset functionality
 * with a premium, elegant design matching the app's aesthetic.
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword } from '../../services/validationService';
import { signInWithGoogle } from '../../services/authService';

type AuthMode = 'login' | 'signup' | 'reset';

interface AuthPageProps {
    onSkip?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSkip }) => {
    const { signIn, signUp, resetPassword, isConfigured } = useAuth();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            // Validate email format
            const emailValidation = validateEmail(email);
            if (!emailValidation.valid) {
                setError(emailValidation.error || 'Invalid email');
                setIsLoading(false);
                return;
            }

            if (mode === 'signup') {
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setIsLoading(false);
                    return;
                }
                // Validate password strength
                const passwordValidation = validatePassword(password);
                if (!passwordValidation.valid) {
                    setError(passwordValidation.error || 'Invalid password');
                    setIsLoading(false);
                    return;
                }
                const result = await signUp(email, password);
                if (!result.success) {
                    setError(result.error || 'Sign up failed');
                } else {
                    setSuccess('Account created! Check your email to verify.');
                }
            } else if (mode === 'login') {
                const result = await signIn(email, password);
                if (!result.success) {
                    setError(result.error || 'Login failed');
                }
            } else if (mode === 'reset') {
                const result = await resetPassword(email);
                if (!result.success) {
                    setError(result.error || 'Password reset failed');
                } else {
                    setSuccess('Password reset email sent! Check your inbox.');
                }
            }
        } catch (_err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isConfigured) {
        return (
            <div className="h-[100dvh] flex flex-col items-center justify-center p-6 pt-[calc(1.5rem+var(--safe-area-inset-top))] pb-[calc(1.5rem+var(--safe-area-inset-bottom))] bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end overflow-y-auto overscroll-none">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full overflow-hidden flex items-center justify-center">
                        <img src="/logo.png" alt="Somnia" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="font-serif text-3xl mb-4">Somnia</h1>
                    <p className="text-day-text-secondary dark:text-night-text-secondary mb-6">
                        Authentication is not configured. Continue with local storage.
                    </p>
                    {onSkip && (
                        <button
                            onClick={onSkip}
                            className="w-full py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center"
                        >
                            Continue Without Account
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] flex flex-col items-center p-6 pt-[calc(1.5rem+var(--safe-area-inset-top))] pb-[calc(2rem+var(--safe-area-inset-bottom))] bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end overflow-y-auto overscroll-none">
            <div className="max-w-md w-full flex-1 flex flex-col justify-center">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden flex items-center justify-center">
                        <img src="/logo.png" alt="Somnia" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="font-serif text-5xl mb-2 text-day-text-primary dark:text-night-text-primary">Somnia</h1>
                    <p className="text-day-text-secondary dark:text-night-text-secondary text-sm">
                        {mode === 'signup' && 'Start your wellness journey'}
                        {mode === 'reset' && 'Reset your password'}
                    </p>
                </div>

                {/* Auth Form */}
                <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border rounded-2xl p-6 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="text-sm font-medium block mb-1.5 text-day-text-primary dark:text-night-text-primary">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full px-4 py-3 min-h-[48px] text-base text-day-text-primary dark:text-night-text-primary bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-xl focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent transition-all placeholder:text-day-text-secondary/50 dark:placeholder:text-night-text-secondary/50"
                            />
                        </div>

                        {/* Password */}
                        {mode !== 'reset' && (
                            <div>
                                <label className="text-sm font-medium block mb-1.5 text-day-text-primary dark:text-night-text-primary">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-3 min-h-[48px] text-base text-day-text-primary dark:text-night-text-primary bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-xl focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent transition-all placeholder:text-day-text-secondary/50 dark:placeholder:text-night-text-secondary/50"
                                />
                            </div>
                        )}

                        {/* Confirm Password (Signup only) */}
                        {mode === 'signup' && (
                            <div>
                                <label className="text-sm font-medium block mb-1.5 text-day-text-primary dark:text-night-text-primary">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-3 min-h-[48px] text-base text-day-text-primary dark:text-night-text-primary bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-xl focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent transition-all placeholder:text-day-text-secondary/50 dark:placeholder:text-night-text-secondary/50"
                                />
                            </div>
                        )}

                        {/* Error Message - ACCESSIBILITY: role="alert" for screen readers */}
                        {error && (
                            <div role="alert" aria-live="assertive" className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-300 text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Success Message - ACCESSIBILITY: role="status" for screen readers */}
                        {success && (
                            <div role="status" aria-live="polite" className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-300 text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {success}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 min-h-[48px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Please wait...</span>
                                </>
                            ) : (
                                <>
                                    {mode === 'login' && 'Sign In'}
                                    {mode === 'signup' && 'Create Account'}
                                    {mode === 'reset' && 'Send Reset Email'}
                                </>
                            )}
                        </button>

                        {/* Divider */}
                        {mode !== 'reset' && (
                            <>
                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-day-border dark:border-night-border" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-3 bg-day-card-bg dark:bg-night-card-bg text-day-text-secondary dark:text-night-text-secondary">or</span>
                                    </div>
                                </div>

                                {/* Google Sign In Button */}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setError('');
                                        setIsLoading(true);
                                        const result = await signInWithGoogle();
                                        if (!result.success && result.error) {
                                            setError(result.error);
                                        }
                                        setIsLoading(false);
                                    }}
                                    disabled={isLoading}
                                    className="w-full py-3 min-h-[48px] bg-white dark:bg-gray-800 border border-day-border dark:border-night-border text-day-text-primary dark:text-night-text-primary font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {/* Google Icon */}
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </button>
                            </>
                        )}
                    </form>

                    {/* Mode Toggle */}
                    <div className="mt-6 pt-6 border-t border-day-border dark:border-night-border text-center text-sm">
                        {mode === 'login' && (
                            <>
                                <p className="text-day-text-secondary dark:text-night-text-secondary">
                                    Don't have an account?{' '}
                                    <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }} className="text-day-accent dark:text-night-accent hover:underline py-1 min-h-[44px]">
                                        Sign up
                                    </button>
                                </p>
                                <button onClick={() => { setMode('reset'); setError(''); setSuccess(''); }} className="mt-2 py-2 min-h-[44px] text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent">
                                    Forgot password?
                                </button>
                            </>
                        )}
                        {mode === 'signup' && (
                            <p className="text-day-text-secondary dark:text-night-text-secondary">
                                Already have an account?{' '}
                                <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-day-accent dark:text-night-accent hover:underline py-1 min-h-[44px]">
                                    Sign in
                                </button>
                            </p>
                        )}
                        {mode === 'reset' && (
                            <p className="text-day-text-secondary dark:text-night-text-secondary">
                                Remember your password?{' '}
                                <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-day-accent dark:text-night-accent hover:underline py-1 min-h-[44px]">
                                    Sign in
                                </button>
                            </p>
                        )}
                    </div>
                </div>

                {/* Skip Option */}
                {onSkip && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={onSkip}
                            className="py-2 min-h-[44px] text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent text-sm transition-colors"
                        >
                            Continue without account
                        </button>
                        <p className="text-xs text-day-text-secondary/70 dark:text-night-text-secondary/70 mt-2">
                            You can create an account later to sync across devices
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
