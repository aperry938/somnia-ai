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
    getAuthToken as _getAuthToken,
} from '../services/authService';
import { verifySubscription, clearSubscriptionCache } from '../services/secureSubscriptionService';

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
                    verifySubscription(currentSession.access_token).catch(logger.error);
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
                verifySubscription(newSession.access_token).catch(logger.error);
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

            // Verify subscription after login
            if (result.session?.access_token) {
                verifySubscription(result.session.access_token).catch(logger.error);
            }
        }
        return { success: result.success, error: result.error };
    }, []);

    const signOut = useCallback(async () => {
        await authSignOut();
        setUser(null);
        setSession(null);
        clearSubscriptionCache();
        localStorage.removeItem('somnia_user_email');
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
            verifySubscription(currentSession.access_token).catch(logger.error);
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
