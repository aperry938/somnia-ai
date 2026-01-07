/**
 * Authentication Service for Somnia.ai
 *
 * Handles user authentication using Supabase Auth.
 * Provides methods for sign up, sign in, sign out, and session management.
 */

import { createClient, User, Session, AuthError } from '@supabase/supabase-js';
import { logger } from './logger';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// Auth error types
export interface AuthResult {
    success: boolean;
    error?: string;
    user?: User;
    session?: Session;
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<AuthResult> {
    if (!supabase) {
        return { success: false, error: 'Authentication service not configured' };
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return {
            success: true,
            user: data.user || undefined,
            session: data.session || undefined,
        };
    } catch (err) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
    if (!supabase) {
        return { success: false, error: 'Authentication service not configured' };
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return {
            success: true,
            user: data.user || undefined,
            session: data.session || undefined,
        };
    } catch (err) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResult> {
    if (!supabase) {
        return { success: false, error: 'Authentication service not configured' };
    }

    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
    if (!supabase) return null;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    } catch {
        return null;
    }
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
    if (!supabase) return null;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch {
        return null;
    }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<AuthResult> {
    if (!supabase) {
        return { success: false, error: 'Authentication service not configured' };
    }

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Update user password (after reset)
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
    if (!supabase) {
        return { success: false, error: 'Authentication service not configured' };
    }

    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Refresh the current session
 */
export async function refreshSession(): Promise<Session | null> {
    if (!supabase) return null;

    try {
        const { data: { session }, error } = await supabase.auth.refreshSession();
        if (error) {
            logger.error('Session refresh error:', error);
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    if (!supabase) {
        return { unsubscribe: () => {} };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(session?.user || null, session);
    });

    return { unsubscribe: () => subscription.unsubscribe() };
}

/**
 * Check if Supabase is configured
 */
export function isAuthConfigured(): boolean {
    return !!supabase;
}

/**
 * Get auth token for API calls
 */
export async function getAuthToken(): Promise<string | null> {
    const session = await getSession();
    return session?.access_token || null;
}
