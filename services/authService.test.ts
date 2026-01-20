/**
 * Auth Service Tests
 * Tests for authentication flow and session management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client
const mockSupabaseAuth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    refreshSession: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
};

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        auth: mockSupabaseAuth,
    })),
}));

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

describe('authService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('signUp', () => {
        it('should return success on valid signup', async () => {
            mockSupabaseAuth.signUp.mockResolvedValueOnce({
                data: { user: { id: '123', email: 'test@example.com' } },
                error: null,
            });

            const { signUp } = await import('./authService');
            const result = await signUp('test@example.com', 'password123');

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
        });

        it('should return error on signup failure', async () => {
            mockSupabaseAuth.signUp.mockResolvedValueOnce({
                data: { user: null },
                error: { message: 'Email already registered' },
            });

            const { signUp } = await import('./authService');
            const result = await signUp('test@example.com', 'password123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Email already registered');
        });
    });

    describe('signIn', () => {
        it('should return success on valid credentials', async () => {
            mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
                data: {
                    user: { id: '123', email: 'test@example.com' },
                    session: { access_token: 'token123' }
                },
                error: null,
            });

            const { signIn } = await import('./authService');
            const result = await signIn('test@example.com', 'password123');

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
        });

        it('should return error on invalid credentials', async () => {
            mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
                data: { user: null, session: null },
                error: { message: 'Invalid login credentials' },
            });

            const { signIn } = await import('./authService');
            const result = await signIn('test@example.com', 'wrongpassword');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid login credentials');
        });
    });

    describe('signOut', () => {
        it('should sign out successfully', async () => {
            mockSupabaseAuth.signOut.mockResolvedValueOnce({ error: null });

            const { signOut } = await import('./authService');
            const result = await signOut();

            expect(result.success).toBe(true);
        });

        it('should handle sign out error', async () => {
            mockSupabaseAuth.signOut.mockResolvedValueOnce({
                error: { message: 'Network error' }
            });

            const { signOut } = await import('./authService');
            const result = await signOut();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });
    });

    describe('getSession', () => {
        it('should return current session', async () => {
            mockSupabaseAuth.getSession.mockResolvedValueOnce({
                data: { session: { access_token: 'token123', user: { id: '123' } } },
                error: null,
            });

            const { getSession } = await import('./authService');
            const session = await getSession();

            expect(session).toBeDefined();
            expect(session?.access_token).toBe('token123');
        });

        it('should return null when no session', async () => {
            mockSupabaseAuth.getSession.mockResolvedValueOnce({
                data: { session: null },
                error: null,
            });

            const { getSession } = await import('./authService');
            const session = await getSession();

            expect(session).toBeNull();
        });
    });

    describe('refreshSession', () => {
        it('should refresh session successfully', async () => {
            mockSupabaseAuth.refreshSession.mockResolvedValueOnce({
                data: { session: { access_token: 'new-token' } },
                error: null,
            });

            const { refreshSession } = await import('./authService');
            const session = await refreshSession();

            expect(session?.access_token).toBe('new-token');
        });

        it('should return null on refresh failure', async () => {
            mockSupabaseAuth.refreshSession.mockResolvedValueOnce({
                data: { session: null },
                error: { message: 'Token expired' },
            });

            const { refreshSession } = await import('./authService');
            const session = await refreshSession();

            expect(session).toBeNull();
        });
    });

    describe('resetPassword', () => {
        it('should send reset email successfully', async () => {
            mockSupabaseAuth.resetPasswordForEmail.mockResolvedValueOnce({
                error: null,
            });

            const { resetPassword } = await import('./authService');
            const result = await resetPassword('test@example.com');

            expect(result.success).toBe(true);
        });

        it('should handle reset email failure', async () => {
            mockSupabaseAuth.resetPasswordForEmail.mockResolvedValueOnce({
                error: { message: 'User not found' },
            });

            const { resetPassword } = await import('./authService');
            const result = await resetPassword('unknown@example.com');

            expect(result.success).toBe(false);
            expect(result.error).toBe('User not found');
        });
    });
});
