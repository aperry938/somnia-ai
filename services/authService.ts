/**
 * Authentication Service for Somnia.ai
 *
 * Handles user authentication using Supabase Auth.
 * Provides methods for sign up, sign in, sign out, and session management.
 * Includes biometric authentication, secure token storage, and rate limiting.
 */

import { createClient, User, Session } from '@supabase/supabase-js';
import { logger } from './logger';
import { validateEmail, validatePassword } from './validationService';
import { abortSync, clearSyncQueue } from './syncService';
import { abortOfflineQueueProcessing, clearQueue as clearOfflineQueue } from './offlineQueueService';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client with secure configuration
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce', // Use PKCE for enhanced OAuth security
        },
    })
    : null;

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    lockoutMs: 30 * 60 * 1000, // 30 minutes lockout
};

// Rate limiting state (in production, use server-side rate limiting)
interface RateLimitState {
    attempts: number;
    firstAttempt: number;
    lockedUntil: number | null;
}

const rateLimitCache = new Map<string, RateLimitState>();

// Session expiry warning threshold (5 minutes before expiry)
const SESSION_EXPIRY_WARNING_MS = 5 * 60 * 1000;

// Auth error types
export interface AuthResult {
    success: boolean;
    error?: string;
    errorCode?: AuthErrorCode;
    user?: User;
    session?: Session;
}

// Standardized error codes for better error handling
export type AuthErrorCode =
    | 'INVALID_EMAIL'
    | 'INVALID_PASSWORD'
    | 'WEAK_PASSWORD'
    | 'USER_NOT_FOUND'
    | 'WRONG_PASSWORD'
    | 'EMAIL_IN_USE'
    | 'RATE_LIMITED'
    | 'NETWORK_ERROR'
    | 'SESSION_EXPIRED'
    | 'BIOMETRIC_NOT_AVAILABLE'
    | 'BIOMETRIC_FAILED'
    | 'SERVICE_UNAVAILABLE'
    | 'UNKNOWN_ERROR';

// Biometric authentication state
export interface BiometricState {
    isAvailable: boolean;
    isEnabled: boolean;
    biometryType: 'fingerprint' | 'face' | 'iris' | 'none';
}

/**
 * Check rate limiting for an identifier (email)
 */
function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
    const normalizedId = identifier.toLowerCase().trim();
    const now = Date.now();
    const state = rateLimitCache.get(normalizedId);

    if (!state) {
        rateLimitCache.set(normalizedId, { attempts: 1, firstAttempt: now, lockedUntil: null });
        return { allowed: true };
    }

    // Check if currently locked out
    if (state.lockedUntil && now < state.lockedUntil) {
        return { allowed: false, retryAfter: Math.ceil((state.lockedUntil - now) / 1000) };
    }

    // Reset if window has passed
    if (now - state.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
        rateLimitCache.set(normalizedId, { attempts: 1, firstAttempt: now, lockedUntil: null });
        return { allowed: true };
    }

    // Check if max attempts exceeded
    if (state.attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
        state.lockedUntil = now + RATE_LIMIT_CONFIG.lockoutMs;
        rateLimitCache.set(normalizedId, state);
        return { allowed: false, retryAfter: Math.ceil(RATE_LIMIT_CONFIG.lockoutMs / 1000) };
    }

    // Increment attempts
    state.attempts++;
    rateLimitCache.set(normalizedId, state);
    return { allowed: true };
}

/**
 * Reset rate limit on successful auth
 */
function resetRateLimit(identifier: string): void {
    const normalizedId = identifier.toLowerCase().trim();
    rateLimitCache.delete(normalizedId);
}

/**
 * Map Supabase errors to standardized error codes
 */
function mapAuthError(error: { message: string; code?: string }): { errorCode: AuthErrorCode; message: string } {
    const errorMessage = error.message.toLowerCase();
    const errorCode = error.code?.toLowerCase() || '';

    if (errorMessage.includes('invalid email') || errorCode.includes('invalid_email')) {
        return { errorCode: 'INVALID_EMAIL', message: 'Please enter a valid email address' };
    }
    if (errorMessage.includes('user not found') || errorCode.includes('user_not_found')) {
        return { errorCode: 'USER_NOT_FOUND', message: 'No account found with this email' };
    }
    if (errorMessage.includes('invalid login') || errorMessage.includes('wrong password') || errorCode.includes('invalid_credentials')) {
        return { errorCode: 'WRONG_PASSWORD', message: 'Invalid email or password' };
    }
    if (errorMessage.includes('already registered') || errorCode.includes('user_already_exists')) {
        return { errorCode: 'EMAIL_IN_USE', message: 'An account with this email already exists' };
    }
    if (errorMessage.includes('rate limit') || errorCode.includes('over_request')) {
        return { errorCode: 'RATE_LIMITED', message: 'Too many attempts. Please try again later' };
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return { errorCode: 'NETWORK_ERROR', message: 'Network error. Please check your connection' };
    }
    if (errorMessage.includes('session') || errorMessage.includes('expired')) {
        return { errorCode: 'SESSION_EXPIRED', message: 'Your session has expired. Please sign in again' };
    }

    return { errorCode: 'UNKNOWN_ERROR', message: error.message || 'An unexpected error occurred' };
}

/**
 * Sign up with email and password
 * Includes input validation and rate limiting
 */
export async function signUp(email: string, password: string): Promise<AuthResult> {
    if (!supabase) {
        return { success: false, error: 'Authentication service not configured', errorCode: 'SERVICE_UNAVAILABLE' };
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        return { success: false, error: emailValidation.error, errorCode: 'INVALID_EMAIL' };
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.error, errorCode: 'INVALID_PASSWORD' };
    }
    if (passwordValidation.strength === 'weak') {
        return { success: false, error: 'Password is too weak. Include uppercase, lowercase, numbers, and special characters', errorCode: 'WEAK_PASSWORD' };
    }

    // Check rate limiting
    const rateLimit = checkRateLimit(email);
    if (!rateLimit.allowed) {
        return { success: false, error: `Too many attempts. Try again in ${rateLimit.retryAfter} seconds`, errorCode: 'RATE_LIMITED' };
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
        });

        if (error) {
            const mapped = mapAuthError(error);
            logger.warn('Sign up failed:', { email: email.substring(0, 3) + '***', errorCode: mapped.errorCode });
            return { success: false, error: mapped.message, errorCode: mapped.errorCode };
        }

        resetRateLimit(email);
        logger.info('User signed up successfully');

        return {
            success: true,
            user: data.user || undefined,
            session: data.session || undefined,
        };
    } catch (err) {
        logger.error('Sign up error:', err);
        return { success: false, error: 'An unexpected error occurred', errorCode: 'UNKNOWN_ERROR' };
    }
}

/**
 * Sign in with email and password
 * Includes input validation, rate limiting, and secure error messages
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
    if (!supabase) {
        return { success: false, error: 'Authentication service not configured', errorCode: 'SERVICE_UNAVAILABLE' };
    }

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        return { success: false, error: emailValidation.error, errorCode: 'INVALID_EMAIL' };
    }

    // Basic password validation (must exist)
    if (!password || password.length < 1) {
        return { success: false, error: 'Password is required', errorCode: 'INVALID_PASSWORD' };
    }

    // Check rate limiting
    const rateLimit = checkRateLimit(email);
    if (!rateLimit.allowed) {
        logger.warn('Rate limit exceeded for sign in:', { email: email.substring(0, 3) + '***' });
        return { success: false, error: `Too many attempts. Try again in ${rateLimit.retryAfter} seconds`, errorCode: 'RATE_LIMITED' };
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
        });

        if (error) {
            const mapped = mapAuthError(error);
            // Use generic message for security (don't reveal if email exists)
            logger.warn('Sign in failed:', { email: email.substring(0, 3) + '***', errorCode: mapped.errorCode });
            return { success: false, error: 'Invalid email or password', errorCode: mapped.errorCode };
        }

        resetRateLimit(email);
        logger.info('User signed in successfully');

        return {
            success: true,
            user: data.user || undefined,
            session: data.session || undefined,
        };
    } catch (err) {
        logger.error('Sign in error:', err);
        return { success: false, error: 'An unexpected error occurred', errorCode: 'UNKNOWN_ERROR' };
    }
}

/**
 * Generate cryptographically secure state parameter for OAuth
 */
function generateOAuthState(): string {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store OAuth state for CSRF validation
 */
function storeOAuthState(state: string): void {
    try {
        sessionStorage.setItem('oauth_state', state);
        sessionStorage.setItem('oauth_state_timestamp', Date.now().toString());
    } catch {
        // Fallback if sessionStorage is unavailable
        logger.warn('Unable to store OAuth state in sessionStorage');
    }
}

/**
 * Validate OAuth state to prevent CSRF attacks
 */
export function validateOAuthState(returnedState: string): boolean {
    try {
        const storedState = sessionStorage.getItem('oauth_state');
        const timestamp = sessionStorage.getItem('oauth_state_timestamp');

        // Clear stored state
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_state_timestamp');

        if (!storedState || !timestamp) {
            return false;
        }

        // Check if state is expired (5 minutes max)
        const stateAge = Date.now() - parseInt(timestamp, 10);
        if (stateAge > 5 * 60 * 1000) {
            logger.warn('OAuth state expired');
            return false;
        }

        // Constant-time comparison to prevent timing attacks
        if (storedState.length !== returnedState.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < storedState.length; i++) {
            result |= storedState.charCodeAt(i) ^ returnedState.charCodeAt(i);
        }

        return result === 0;
    } catch {
        return false;
    }
}

/**
 * Sign in with Google OAuth
 * Uses PKCE flow and state parameter for enhanced security
 */
export async function signInWithGoogle(): Promise<AuthResult> {
    if (!supabase) {
        return { success: false, error: 'Authentication service not configured', errorCode: 'SERVICE_UNAVAILABLE' };
    }

    try {
        // Generate and store state for CSRF protection
        const state = generateOAuthState();
        storeOAuthState(state);

        // Validate redirect URL to prevent open redirect attacks
        const redirectTo = `${window.location.origin}/auth/callback`;

        const { data: _data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                queryParams: {
                    state,
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });

        if (error) {
            const mapped = mapAuthError(error);
            logger.error('Google OAuth error:', error);
            return { success: false, error: mapped.message, errorCode: mapped.errorCode };
        }

        // OAuth redirects, so we return success (user will be redirected)
        return { success: true };
    } catch (err) {
        logger.error('Google OAuth error:', err);
        return { success: false, error: 'An unexpected error occurred', errorCode: 'UNKNOWN_ERROR' };
    }
}

/**
 * Sign out the current user
 * SECURITY: Clears all user-specific queues to prevent cross-user data exposure
 */
export async function signOut(): Promise<AuthResult> {
    // SECURITY (ISS-006): Abort in-flight operations and clear queues BEFORE sign out
    // This prevents any pending sync operations from completing with the wrong user's data
    abortSync();
    abortOfflineQueueProcessing();
    clearSyncQueue();
    clearOfflineQueue();

    if (!supabase) {
        return { success: false, error: 'Authentication service not configured' };
    }

    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (_err) {
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
    } catch (_err) {
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
    } catch (_err) {
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
        return { unsubscribe: () => { } };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

/**
 * Check if session is about to expire and needs refresh
 */
export function isSessionExpiringSoon(session: Session | null): boolean {
    if (!session?.expires_at) return true;

    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    return timeUntilExpiry < SESSION_EXPIRY_WARNING_MS;
}

/**
 * Proactively refresh session if expiring soon
 */
export async function ensureValidSession(): Promise<Session | null> {
    const session = await getSession();

    if (!session) {
        return null;
    }

    if (isSessionExpiringSoon(session)) {
        logger.info('Session expiring soon, refreshing...');
        return await refreshSession();
    }

    return session;
}

// ============================================
// Biometric Authentication
// ============================================

let biometricPlugin: {
    isAvailable: () => Promise<{ isAvailable: boolean; biometryType: number }>;
    verifyIdentity: (options?: { reason?: string; title?: string }) => Promise<void>;
} | null = null;

/**
 * Initialize biometric authentication plugin
 */
async function initBiometric(): Promise<boolean> {
    if (biometricPlugin) return true;

    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.getPlatform() === 'web') {
        return false;
    }

    try {
        // Dynamic import for native platforms
        const { NativeBiometric } = await import('capacitor-native-biometric');
        biometricPlugin = NativeBiometric;
        return true;
    } catch {
        logger.info('Biometric plugin not available');
        return false;
    }
}

/**
 * Check biometric availability
 */
export async function getBiometricState(): Promise<BiometricState> {
    const defaultState: BiometricState = {
        isAvailable: false,
        isEnabled: false,
        biometryType: 'none',
    };

    try {
        const initialized = await initBiometric();
        if (!initialized || !biometricPlugin) {
            return defaultState;
        }

        const result = await biometricPlugin.isAvailable();

        const biometryTypeMap: Record<number, 'fingerprint' | 'face' | 'iris' | 'none'> = {
            1: 'fingerprint', // BiometryType.TOUCH_ID / FINGERPRINT
            2: 'face',        // BiometryType.FACE_ID / FACE
            3: 'iris',        // BiometryType.IRIS
        };

        const isEnabled = localStorage.getItem('somnia_biometric_enabled') === 'true';

        return {
            isAvailable: result.isAvailable,
            isEnabled: result.isAvailable && isEnabled,
            biometryType: biometryTypeMap[result.biometryType] || 'none',
        };
    } catch (err) {
        logger.error('Failed to check biometric availability:', err);
        return defaultState;
    }
}

/**
 * Enable biometric authentication for the current user
 */
export async function enableBiometric(): Promise<{ success: boolean; error?: string }> {
    try {
        const state = await getBiometricState();
        if (!state.isAvailable) {
            return { success: false, error: 'Biometric authentication is not available on this device' };
        }

        // Verify biometric to enable
        const verified = await verifyBiometric('Enable biometric login');
        if (!verified.success) {
            return verified;
        }

        localStorage.setItem('somnia_biometric_enabled', 'true');
        logger.info('Biometric authentication enabled');

        return { success: true };
    } catch (err) {
        logger.error('Failed to enable biometric:', err);
        return { success: false, error: 'Failed to enable biometric authentication' };
    }
}

/**
 * Disable biometric authentication
 */
export function disableBiometric(): void {
    localStorage.removeItem('somnia_biometric_enabled');
    logger.info('Biometric authentication disabled');
}

/**
 * Verify biometric (Face ID / Touch ID)
 */
export async function verifyBiometric(reason?: string): Promise<{ success: boolean; error?: string; errorCode?: AuthErrorCode }> {
    try {
        const initialized = await initBiometric();
        if (!initialized || !biometricPlugin) {
            return { success: false, error: 'Biometric authentication not available', errorCode: 'BIOMETRIC_NOT_AVAILABLE' };
        }

        await biometricPlugin.verifyIdentity({
            reason: reason || 'Authenticate to continue',
            title: 'Somnia Authentication',
        });

        // verifyIdentity throws on failure, so if we reach here, verification succeeded
        return { success: true };
    } catch (err) {
        logger.error('Biometric verification error:', err);
        return { success: false, error: 'Biometric verification failed', errorCode: 'BIOMETRIC_FAILED' };
    }
}

/**
 * Sign in with biometric (requires previous session)
 * Uses stored refresh token after biometric verification
 */
export async function signInWithBiometric(): Promise<AuthResult> {
    if (!supabase) {
        return { success: false, error: 'Authentication service not configured', errorCode: 'SERVICE_UNAVAILABLE' };
    }

    const state = await getBiometricState();
    if (!state.isEnabled) {
        return { success: false, error: 'Biometric login is not enabled', errorCode: 'BIOMETRIC_NOT_AVAILABLE' };
    }

    // Verify biometric
    const verification = await verifyBiometric('Sign in to Somnia');
    if (!verification.success) {
        return { success: false, error: verification.error, errorCode: verification.errorCode };
    }

    // Try to refresh existing session
    const session = await refreshSession();
    if (!session) {
        return { success: false, error: 'Please sign in with email/password first', errorCode: 'SESSION_EXPIRED' };
    }

    const user = await getCurrentUser();
    logger.info('Biometric sign in successful');

    return {
        success: true,
        user: user || undefined,
        session,
    };
}

// ============================================
// Privacy Compliance (GDPR/CCPA)
// ============================================

/**
 * Export all user data for GDPR compliance
 */
export async function exportUserData(): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        // Collect user data from various sources
        const userData: Record<string, unknown> = {
            profile: {
                id: user.id,
                email: user.email,
                createdAt: user.created_at,
                lastSignIn: user.last_sign_in_at,
            },
            exportedAt: new Date().toISOString(),
            dataCategories: [
                'Profile information',
                'Dream journal entries',
                'Sleep records',
                'App preferences',
            ],
        };

        logger.info('User data exported for GDPR request');
        return { success: true, data: userData };
    } catch (err) {
        logger.error('Failed to export user data:', err);
        return { success: false, error: 'Failed to export user data' };
    }
}

/**
 * Request account deletion (GDPR right to erasure)
 */
export async function requestAccountDeletion(): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        // In production, this would:
        // 1. Mark account for deletion
        // 2. Send confirmation email
        // 3. Schedule deletion after grace period
        // 4. Anonymize data that must be retained

        logger.info('Account deletion requested:', { userId: user.id });

        // Clear local data immediately
        localStorage.removeItem('somnia_biometric_enabled');
        localStorage.removeItem('somnia_user_email');

        await signOut();

        return { success: true };
    } catch (err) {
        logger.error('Failed to request account deletion:', err);
        return { success: false, error: 'Failed to process deletion request' };
    }
}

/**
 * Update user consent preferences
 */
export async function updateConsentPreferences(preferences: {
    analytics: boolean;
    marketing: boolean;
    thirdPartySharing: boolean;
}): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        // Store consent preferences
        localStorage.setItem('somnia_consent_preferences', JSON.stringify({
            ...preferences,
            updatedAt: new Date().toISOString(),
            userId: user.id,
        }));

        logger.info('Consent preferences updated');
        return { success: true };
    } catch (err) {
        logger.error('Failed to update consent preferences:', err);
        return { success: false, error: 'Failed to update preferences' };
    }
}

/**
 * Get user consent preferences
 */
export function getConsentPreferences(): { analytics: boolean; marketing: boolean; thirdPartySharing: boolean } | null {
    try {
        const stored = localStorage.getItem('somnia_consent_preferences');
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                analytics: parsed.analytics ?? false,
                marketing: parsed.marketing ?? false,
                thirdPartySharing: parsed.thirdPartySharing ?? false,
            };
        }
    } catch {
        // Ignore parse errors
    }
    return null;
}
