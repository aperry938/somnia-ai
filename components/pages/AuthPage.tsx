/**
 * Authentication Page for Somnia
 *
 * Provides login, signup, and password reset functionality
 * with a premium, elegant design matching the app's aesthetic.
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword } from '../../services/validationService';

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
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isConfigured) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
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
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    </div>
                    <h1 className="font-serif text-4xl mb-2 text-day-text-primary dark:text-night-text-primary">Somnia</h1>
                    <p className="text-day-text-secondary dark:text-night-text-secondary">
                        {mode === 'signup' && 'Start your wellness journey'}
                        {mode === 'reset' && 'Reset your password'}
                    </p>
                </div>

                {/* Auth Form */}
                <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border rounded-2xl p-6 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="text-sm font-medium block mb-1.5">Email</label>
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
                                <label className="text-sm font-medium block mb-1.5">Password</label>
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
                                <label className="text-sm font-medium block mb-1.5">Confirm Password</label>
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
                            Your data will be stored locally on your device
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
