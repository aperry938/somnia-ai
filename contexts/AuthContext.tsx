/**
 * Authentication Context for Somnia.ai
 *
 * Provides authentication state and methods throughout the app.
 * Integrates with Supabase Auth via authService.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { logger } from '../services/logger';
import {
    signUp as authSignUp,
    signIn as authSignIn,
    signOut as authSignOut,
    resetPassword as authResetPassword,
    getSession,
    getCurrentUser,
    onAuthStateChange,
    isAuthConfigured,
} from '../services/authService';
import { verifySubscription, clearSubscriptionCache, linkUser, unlinkUser } from '../services/secureSubscriptionService';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isConfigured: boolean;
    signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
    refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isConfigured = isAuthConfigured();

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            if (!isConfigured) {
                setIsLoading(false);
                return;
            }

            try {
                const currentSession = await getSession();
                const currentUser = await getCurrentUser();

                setSession(currentSession);
                setUser(currentUser);

                // Save user email for superuser check
                if (currentUser?.email) {
                    localStorage.setItem('somnia_user_email', currentUser.email);
                }

                // Verify subscription if authenticated
                if (currentSession?.access_token) {
                    verifySubscription().catch(logger.error);
                }
            } catch (error) {
                logger.error('Auth initialization error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, [isConfigured]);

    // Subscribe to auth state changes
    useEffect(() => {
        if (!isConfigured) return;

        const { unsubscribe } = onAuthStateChange((newUser, newSession) => {
            setUser(newUser);
            setSession(newSession);

            // Save/clear user email for superuser check
            if (newUser?.email) {
                localStorage.setItem('somnia_user_email', newUser.email);
            } else {
                localStorage.removeItem('somnia_user_email');
            }

            // Verify subscription on auth changes
            if (newSession?.access_token) {
                verifySubscription().catch(logger.error);
            } else {
                clearSubscriptionCache();
            }
        });

        return () => unsubscribe();
    }, [isConfigured]);

    const signUp = useCallback(async (email: string, password: string) => {
        const result = await authSignUp(email, password);
        if (result.success && result.user) {
            setUser(result.user);
            setSession(result.session || null);
        }
        return { success: result.success, error: result.error };
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        const result = await authSignIn(email, password);
        if (result.success && result.user) {
            setUser(result.user);
            setSession(result.session || null);

            // Link user to RevenueCat for cross-device subscription sync
            // Wrapped in try/catch to prevent sign-in failure if RevenueCat fails
            try {
                await linkUser(result.user.id);
            } catch (e) {
                logger.warn('Failed to link user to RevenueCat:', e);
            }

            // Verify subscription after login
            if (result.session?.access_token) {
                verifySubscription().catch(logger.error);
            }
        }
        return { success: result.success, error: result.error };
    }, []);

    const signOut = useCallback(async () => {
        await authSignOut();
        setUser(null);
        setSession(null);
        // Unlink from RevenueCat and clear subscription cache
        // Wrapped in try/catch to prevent sign-out failure if RevenueCat fails
        try {
            await unlinkUser();
        } catch (e) {
            logger.warn('Failed to unlink user from RevenueCat:', e);
        }
        clearSubscriptionCache();

        // Clear all user-specific data from localStorage to prevent data leakage
        // between different users on the same device
        const userDataKeys = [
            'somnia_user_email',
            'somnia_dreams',
            'somnia_sleep_entries',
            'somnia_alarms',
            'somnia_biometrics',
            'somnia_session',
            'somnia_auth_token',
            'somnia_notification_settings',
            'somnia_daily_analysis',
            'somnia_daily_chat',
            'somnia_daily_prompts',
            'somnia_admin_unlocked',
            'somnia_migration_log',
            'somnia_ai_credits',
            'somnia_credits_reset_date',
            'somnia_premium_status',
            'somnia_sync_queue',
        ];
        userDataKeys.forEach(key => localStorage.removeItem(key));
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        const result = await authResetPassword(email);
        return { success: result.success, error: result.error };
    }, []);

    const refreshAuth = useCallback(async () => {
        if (!isConfigured) return;

        const currentSession = await getSession();
        const currentUser = await getCurrentUser();

        setSession(currentSession);
        setUser(currentUser);

        if (currentSession?.access_token) {
            verifySubscription().catch(logger.error);
        }
    }, [isConfigured]);

    const value: AuthContextType = {
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        isConfigured,
        signUp,
        signIn,
        signOut,
        resetPassword,
        refreshAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
