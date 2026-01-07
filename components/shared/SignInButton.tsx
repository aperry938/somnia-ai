/**
 * Floating Sign In Button
 * Shows in top-right when user is not authenticated
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const SignInButton: React.FC = () => {
    const { isAuthenticated, isConfigured } = useAuth();

    // Only show if Supabase is configured and user is not authenticated
    if (!isConfigured || isAuthenticated) {
        return null;
    }

    const handleSignIn = () => {
        // Clear skip flag and reload to show auth page
        localStorage.removeItem('somnia_skipped_auth');
        window.location.reload();
    };

    return (
        <button
            onClick={handleSignIn}
            aria-label="Sign in to your account"
            className="fixed top-6 right-6 z-40 px-4 py-2 min-h-[44px] flex items-center gap-2 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-day-text-primary dark:text-night-text-primary shadow-lg hover:bg-white/20 dark:hover:bg-white/10 transition-all text-sm font-medium"
            title="Sign In"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>Sign In</span>
        </button>
    );
};
