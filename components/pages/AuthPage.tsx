/**
 * Authentication Page for Somnia
 *
 * Provides login, signup, and password reset functionality
 * with a premium, elegant design matching the app's aesthetic.
 *
 * Mobile-first app store ready with:
 * - 44px+ touch targets for all interactive elements
 * - iOS safe area handling for notch/home indicator
 * - Proper keyboard handling with autocomplete hints
 * - Accessible form labels and error announcements
 * - Secure password input handling (no logging)
 * - Loading states during authentication
 * - Network error handling
 */

import React, { useState, useId, useCallback } from 'react';
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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Generate unique IDs for accessibility (label-input associations)
    const formId = useId();
    const emailId = `${formId}-email`;
    const passwordId = `${formId}-password`;
    const confirmPasswordId = `${formId}-confirm-password`;
    const errorId = `${formId}-error`;
    const successId = `${formId}-success`;

    // Memoized mode change handler to clear state
    const handleModeChange = useCallback((newMode: AuthMode) => {
        setMode(newMode);
        setError('');
        setSuccess('');
        setShowPassword(false);
        setShowConfirmPassword(false);
    }, []);

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
            // Handle network errors specifically for better UX
            if (!navigator.onLine) {
                setError('No internet connection. Please check your network and try again.');
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Password visibility toggle component for DRY code
    const PasswordToggleButton: React.FC<{ show: boolean; onToggle: () => void; inputId: string }> = ({
        show,
        onToggle,
        inputId,
    }) => (
        <button
            type="button"
            onClick={onToggle}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-controls={inputId}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-text-primary dark:hover:text-night-text-primary transition-colors"
        >
            {show ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            )}
        </button>
    );

    if (!isConfigured) {
        return (
            <div
                className="h-[100dvh] flex flex-col items-center justify-center px-6 pl-[calc(1.5rem+var(--safe-area-inset-left))] pr-[calc(1.5rem+var(--safe-area-inset-right))] pt-[calc(1.5rem+var(--safe-area-inset-top))] pb-[calc(1.5rem+var(--safe-area-inset-bottom))] bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end overflow-y-auto overscroll-none"
                role="main"
                aria-labelledby="auth-title-unconfigured"
            >
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full overflow-hidden flex items-center justify-center">
                        <img src="/logo.png" alt="" className="w-full h-full object-cover" aria-hidden="true" />
                    </div>
                    <h1 id="auth-title-unconfigured" className="font-serif text-3xl mb-4 text-day-text-primary dark:text-night-text-primary">Somnia</h1>
                    <p className="text-day-text-secondary dark:text-night-text-secondary mb-6">
                        Authentication is not configured. Continue with local storage.
                    </p>
                    {onSkip && (
                        <button
                            onClick={onSkip}
                            className="w-full py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center"
                            aria-label="Continue without creating an account, using local storage only"
                        >
                            Continue Without Account
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-[100dvh] flex flex-col items-center px-6 pl-[calc(1.5rem+var(--safe-area-inset-left))] pr-[calc(1.5rem+var(--safe-area-inset-right))] pt-[calc(1.5rem+var(--safe-area-inset-top))] pb-[calc(2rem+var(--safe-area-inset-bottom))] bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end overflow-y-auto overscroll-none"
            role="main"
            aria-labelledby="auth-title"
        >
            <div className="max-w-md w-full flex-1 flex flex-col justify-center">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden flex items-center justify-center">
                        <img src="/logo.png" alt="" className="w-full h-full object-cover" aria-hidden="true" />
                    </div>
                    <h1 id="auth-title" className="font-serif text-5xl mb-2 text-day-text-primary dark:text-night-text-primary">Somnia</h1>
                    <p className="text-day-text-secondary dark:text-night-text-secondary text-sm" aria-live="polite">
                        {mode === 'login' && 'Welcome back'}
                        {mode === 'signup' && 'Start your wellness journey'}
                        {mode === 'reset' && 'Reset your password'}
                    </p>
                </div>

                {/* Auth Form */}
                <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border rounded-2xl p-6 shadow-xl">
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-4"
                        aria-describedby={error ? errorId : success ? successId : undefined}
                        noValidate // We handle validation ourselves
                    >
                        {/* Email */}
                        <div>
                            <label
                                htmlFor={emailId}
                                className="text-sm font-medium block mb-1.5 text-day-text-primary dark:text-night-text-primary"
                            >
                                Email
                            </label>
                            <input
                                id={emailId}
                                type="email"
                                inputMode="email"
                                autoComplete={mode === 'signup' ? 'email' : 'username'}
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck="false"
                                enterKeyHint={mode === 'reset' ? 'send' : 'next'}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                aria-required="true"
                                aria-invalid={error.toLowerCase().includes('email') ? 'true' : undefined}
                                disabled={isLoading}
                                className="w-full px-4 py-3 min-h-[48px] text-base text-day-text-primary dark:text-night-text-primary bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-xl focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent transition-all placeholder:text-day-text-secondary/50 dark:placeholder:text-night-text-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Password */}
                        {mode !== 'reset' && (
                            <div>
                                <label
                                    htmlFor={passwordId}
                                    className="text-sm font-medium block mb-1.5 text-day-text-primary dark:text-night-text-primary"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id={passwordId}
                                        type={showPassword ? 'text' : 'password'}
                                        inputMode="text"
                                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck="false"
                                        enterKeyHint={mode === 'signup' ? 'next' : 'done'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                        aria-required="true"
                                        aria-invalid={error.toLowerCase().includes('password') ? 'true' : undefined}
                                        aria-describedby={mode === 'signup' ? `${passwordId}-hint` : undefined}
                                        minLength={8}
                                        disabled={isLoading}
                                        className="w-full px-4 py-3 pr-14 min-h-[48px] text-base text-day-text-primary dark:text-night-text-primary bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-xl focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent transition-all placeholder:text-day-text-secondary/50 dark:placeholder:text-night-text-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <PasswordToggleButton
                                        show={showPassword}
                                        onToggle={() => setShowPassword(!showPassword)}
                                        inputId={passwordId}
                                    />
                                </div>
                                {mode === 'signup' && (
                                    <p id={`${passwordId}-hint`} className="mt-1.5 text-xs text-day-text-secondary dark:text-night-text-secondary">
                                        At least 8 characters with uppercase, lowercase, and numbers
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Confirm Password (Signup only) */}
                        {mode === 'signup' && (
                            <div>
                                <label
                                    htmlFor={confirmPasswordId}
                                    className="text-sm font-medium block mb-1.5 text-day-text-primary dark:text-night-text-primary"
                                >
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        id={confirmPasswordId}
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        inputMode="text"
                                        autoComplete="new-password"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck="false"
                                        enterKeyHint="done"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
                                        required
                                        aria-required="true"
                                        aria-invalid={error.toLowerCase().includes('match') ? 'true' : undefined}
                                        minLength={8}
                                        disabled={isLoading}
                                        className="w-full px-4 py-3 pr-14 min-h-[48px] text-base text-day-text-primary dark:text-night-text-primary bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-xl focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent transition-all placeholder:text-day-text-secondary/50 dark:placeholder:text-night-text-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <PasswordToggleButton
                                        show={showConfirmPassword}
                                        onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                                        inputId={confirmPasswordId}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Error Message - ACCESSIBILITY: role="alert" for screen readers */}
                        {error && (
                            <div
                                id={errorId}
                                role="alert"
                                aria-live="assertive"
                                className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-300 text-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success Message - ACCESSIBILITY: role="status" for screen readers */}
                        {success && (
                            <div
                                id={successId}
                                role="status"
                                aria-live="polite"
                                className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-300 text-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{success}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            aria-busy={isLoading}
                            aria-label={
                                isLoading
                                    ? 'Processing, please wait'
                                    : mode === 'login'
                                    ? 'Sign in to your account'
                                    : mode === 'signup'
                                    ? 'Create a new account'
                                    : 'Send password reset email'
                            }
                            className="w-full py-3 min-h-[48px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
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
                                        try {
                                            // Check network connectivity before attempting OAuth
                                            if (!navigator.onLine) {
                                                setError('No internet connection. Please check your network and try again.');
                                                setIsLoading(false);
                                                return;
                                            }
                                            const result = await signInWithGoogle();
                                            if (!result.success && result.error) {
                                                setError(result.error);
                                            }
                                        } catch (_err) {
                                            setError('Failed to connect to Google. Please try again.');
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    disabled={isLoading}
                                    aria-busy={isLoading}
                                    aria-label="Continue with Google account"
                                    className="w-full py-3 min-h-[48px] bg-white dark:bg-gray-800 border border-day-border dark:border-night-border text-day-text-primary dark:text-night-text-primary font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    {/* Google Icon */}
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
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
                    <nav className="mt-6 pt-6 border-t border-day-border dark:border-night-border text-center text-sm" aria-label="Authentication options">
                        {mode === 'login' && (
                            <>
                                <p className="text-day-text-secondary dark:text-night-text-secondary">
                                    Don't have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => handleModeChange('signup')}
                                        disabled={isLoading}
                                        className="text-day-accent dark:text-night-accent hover:underline py-2 px-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center disabled:opacity-50"
                                    >
                                        Sign up
                                    </button>
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleModeChange('reset')}
                                    disabled={isLoading}
                                    className="mt-2 py-2 px-4 min-h-[44px] min-w-[44px] text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent disabled:opacity-50"
                                >
                                    Forgot password?
                                </button>
                            </>
                        )}
                        {mode === 'signup' && (
                            <p className="text-day-text-secondary dark:text-night-text-secondary">
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => handleModeChange('login')}
                                    disabled={isLoading}
                                    className="text-day-accent dark:text-night-accent hover:underline py-2 px-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center disabled:opacity-50"
                                >
                                    Sign in
                                </button>
                            </p>
                        )}
                        {mode === 'reset' && (
                            <p className="text-day-text-secondary dark:text-night-text-secondary">
                                Remember your password?{' '}
                                <button
                                    type="button"
                                    onClick={() => handleModeChange('login')}
                                    disabled={isLoading}
                                    className="text-day-accent dark:text-night-accent hover:underline py-2 px-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center disabled:opacity-50"
                                >
                                    Sign in
                                </button>
                            </p>
                        )}
                    </nav>
                </div>

                {/* Skip Option */}
                {onSkip && (
                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={onSkip}
                            disabled={isLoading}
                            aria-label="Continue without creating an account, using local storage only"
                            className="py-2 px-4 min-h-[44px] min-w-[44px] text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent text-sm transition-colors disabled:opacity-50"
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
