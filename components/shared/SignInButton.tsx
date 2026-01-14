/**
 * Top Right Header Button
 * Shows Profile icon for signed-in users, Sign In for unsigned users
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';

interface TopRightButtonProps {
    onNavigateToProfile?: () => void;
}

export const SignInButton: React.FC<TopRightButtonProps> = ({ onNavigateToProfile }) => {
    const { isAuthenticated, isConfigured } = useAuth();
    const { navigateTo } = useNavigation();

    // For unauthenticated users: Show Sign In button
    if (!isAuthenticated) {
        // If Supabase isn't configured, don't show anything
        if (!isConfigured) {
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
                className="fixed top-[calc(0.5rem+var(--safe-area-inset-top))] right-4 z-40 px-3 py-1.5 min-h-[44px] flex items-center gap-2 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-day-text-primary dark:text-night-text-primary shadow-lg hover:bg-white/20 dark:hover:bg-white/10 transition-all text-sm font-medium"
                title="Sign In"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Sign In</span>
            </button>
        );
    }

    // For authenticated users: Show Profile button
    const handleProfileClick = () => {
        if (onNavigateToProfile) {
            onNavigateToProfile();
        } else if (navigateTo) {
            navigateTo('profile');
        }
    };

    return (
        <button
            onClick={handleProfileClick}
            aria-label="Open profile and settings"
            className="fixed top-[calc(0.5rem+var(--safe-area-inset-top))] right-4 z-40 w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-day-text-primary dark:text-night-text-primary shadow-lg hover:bg-white/20 dark:hover:bg-white/10 transition-all"
            title="Profile & Settings"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        </button>
    );
};
