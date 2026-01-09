/**
 * Tests for rateLimitService
 * Tests rate limiting functionality for API abuse prevention
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Reset the module before each test to clear rate limit store
beforeEach(async () => {
    vi.resetModules();
});

describe('rateLimitService', () => {
    describe('RATE_LIMITS', () => {
        it('should have defined rate limits for all categories', async () => {
            const { RATE_LIMITS } = await import('./rateLimitService');

            expect(RATE_LIMITS).toHaveProperty('ai_analysis');
            expect(RATE_LIMITS).toHaveProperty('ai_imagery');
            expect(RATE_LIMITS).toHaveProperty('ai_chat');
            expect(RATE_LIMITS).toHaveProperty('auth_login');
            expect(RATE_LIMITS).toHaveProperty('auth_signup');
            expect(RATE_LIMITS).toHaveProperty('auth_reset');
            expect(RATE_LIMITS).toHaveProperty('sync');
            expect(RATE_LIMITS).toHaveProperty('api_default');
        });

        it('should have reasonable limits for auth operations', async () => {
            const { RATE_LIMITS } = await import('./rateLimitService');

            // Auth limits should be strict
            expect(RATE_LIMITS.auth_login.maxRequests).toBeLessThanOrEqual(10);
            expect(RATE_LIMITS.auth_signup.maxRequests).toBeLessThanOrEqual(5);
            expect(RATE_LIMITS.auth_reset.maxRequests).toBeLessThanOrEqual(5);
        });
    });

    describe('checkRateLimit', () => {
        it('should allow first request', async () => {
            const { checkRateLimit } = await import('./rateLimitService');

            const result = checkRateLimit('api_default');
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBeGreaterThanOrEqual(0);
        });

        it('should track requests per identifier', async () => {
            const { checkRateLimit } = await import('./rateLimitService');

            // Different users should have separate limits
            const user1 = checkRateLimit('api_default', 'user1');
            const user2 = checkRateLimit('api_default', 'user2');

            expect(user1.allowed).toBe(true);
            expect(user2.allowed).toBe(true);
            // Both should have same remaining (first request each)
        });

        it('should block requests when limit exceeded', async () => {
            const { checkRateLimit, RATE_LIMITS } = await import('./rateLimitService');

            const maxRequests = RATE_LIMITS.auth_login.maxRequests;

            // Use up all requests
            for (let i = 0; i < maxRequests; i++) {
                checkRateLimit('auth_login', 'test-user');
            }

            // Next request should be blocked
            const result = checkRateLimit('auth_login', 'test-user');
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it('should return reset time when blocked', async () => {
            const { checkRateLimit, RATE_LIMITS } = await import('./rateLimitService');

            const maxRequests = RATE_LIMITS.auth_login.maxRequests;

            // Exhaust the limit
            for (let i = 0; i < maxRequests; i++) {
                checkRateLimit('auth_login', 'block-test');
            }

            const result = checkRateLimit('auth_login', 'block-test');
            expect(result.allowed).toBe(false);
            expect(result.resetIn).toBeGreaterThan(0);
        });

        it('should decrement remaining with each request', async () => {
            const { checkRateLimit, RATE_LIMITS } = await import('./rateLimitService');

            const first = checkRateLimit('ai_analysis', 'decrement-test');
            const second = checkRateLimit('ai_analysis', 'decrement-test');

            expect(second.remaining).toBeLessThan(first.remaining);
        });

        it('should use default limit for unknown category', async () => {
            const { checkRateLimit, RATE_LIMITS } = await import('./rateLimitService');

            // @ts-expect-error - testing unknown category
            const result = checkRateLimit('unknown_category');
            expect(result.allowed).toBe(true);
            // Should use api_default (remaining = max - 1 after first request)
            expect(result.remaining).toBe(RATE_LIMITS.api_default.maxRequests - 1);
        });
    });

    describe('getRemainingRequests', () => {
        it('should return max requests when no activity', async () => {
            const { getRemainingRequests, RATE_LIMITS } = await import('./rateLimitService');

            const remaining = getRemainingRequests('sync', 'fresh-user');
            expect(remaining).toBe(RATE_LIMITS.sync.maxRequests);
        });

        it('should return accurate count after requests', async () => {
            const { checkRateLimit, getRemainingRequests, RATE_LIMITS } = await import('./rateLimitService');

            const identifier = 'remaining-test';
            const category = 'ai_imagery';

            // Make 3 requests
            checkRateLimit(category, identifier);
            checkRateLimit(category, identifier);
            checkRateLimit(category, identifier);

            const remaining = getRemainingRequests(category, identifier);
            expect(remaining).toBe(RATE_LIMITS[category].maxRequests - 3);
        });
    });

    describe('RateLimitError', () => {
        it('should create error with correct properties', async () => {
            const { RateLimitError } = await import('./rateLimitService');

            const error = new RateLimitError('Test error', 5000, 'test_category');

            expect(error.name).toBe('RateLimitError');
            expect(error.message).toBe('Test error');
            expect(error.resetIn).toBe(5000);
            expect(error.category).toBe('test_category');
        });

        it('should be instance of Error', async () => {
            const { RateLimitError } = await import('./rateLimitService');

            const error = new RateLimitError('Test', 1000, 'test');
            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('withRateLimit', () => {
        it('should call function when within limits', async () => {
            const { withRateLimit } = await import('./rateLimitService');

            const mockFn = vi.fn().mockResolvedValue('success');
            const wrapped = withRateLimit('api_default', mockFn, 'wrap-test');

            const result = await wrapped('arg1', 'arg2');

            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
        });

        it('should throw RateLimitError when limit exceeded', async () => {
            const { withRateLimit, checkRateLimit, RATE_LIMITS, RateLimitError } = await import('./rateLimitService');

            const identifier = 'exceed-test';
            const category = 'auth_login';

            // Exhaust the limit
            const max = RATE_LIMITS[category].maxRequests;
            for (let i = 0; i < max; i++) {
                checkRateLimit(category, identifier);
            }

            const mockFn = vi.fn().mockResolvedValue('success');
            const wrapped = withRateLimit(category, mockFn, identifier);

            await expect(wrapped()).rejects.toThrow(RateLimitError);
            expect(mockFn).not.toHaveBeenCalled();
        });
    });

    describe('cleanupExpiredEntries', () => {
        it('should be a callable function', async () => {
            const { cleanupExpiredEntries } = await import('./rateLimitService');

            expect(typeof cleanupExpiredEntries).toBe('function');
            // Should not throw
            cleanupExpiredEntries();
        });
    });

    describe('consumeRateLimit', () => {
        it('should be an alias for checkRateLimit', async () => {
            const { checkRateLimit, consumeRateLimit } = await import('./rateLimitService');

            expect(consumeRateLimit).toBe(checkRateLimit);
        });
    });
});
