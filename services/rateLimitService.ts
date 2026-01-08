/**
 * Rate Limiting Service
 * Prevents API abuse and ensures fair usage of resources.
 */

import { logger } from './logger';

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// Storage for rate limit tracking
const rateLimitStore: Map<string, RateLimitEntry> = new Map();

// Default rate limits by category
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
    // AI Analysis - expensive operations
    ai_analysis: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
    ai_imagery: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
    ai_coach: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
    ai_chat: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute

    // Authentication
    auth_login: { maxRequests: 5, windowMs: 5 * 60 * 1000 }, // 5 per 5 minutes
    auth_signup: { maxRequests: 3, windowMs: 10 * 60 * 1000 }, // 3 per 10 minutes
    auth_reset: { maxRequests: 3, windowMs: 15 * 60 * 1000 }, // 3 per 15 minutes

    // Sync operations
    sync: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute

    // General API
    api_default: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
};

/**
 * Check if a request should be allowed based on rate limiting
 * @param category The rate limit category
 * @param identifier Optional identifier (e.g., user ID) for per-user limiting
 * @returns true if request is allowed, false if rate limited
 */
export const checkRateLimit = (
    category: keyof typeof RATE_LIMITS,
    identifier: string = 'global'
): { allowed: boolean; remaining: number; resetIn: number } => {
    const config = RATE_LIMITS[category] || RATE_LIMITS.api_default;
    const key = `${category}:${identifier}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // If no entry or window has expired, create new entry
    if (!entry || now >= entry.resetTime) {
        entry = {
            count: 0,
            resetTime: now + config.windowMs,
        };
        rateLimitStore.set(key, entry);
    }

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetIn = Math.max(0, entry.resetTime - now);

    if (entry.count >= config.maxRequests) {
        return { allowed: false, remaining: 0, resetIn };
    }

    // Increment counter
    entry.count++;

    return { allowed: true, remaining: remaining - 1, resetIn };
};

/**
 * Consume a rate limit slot (use after successful request)
 * This is a no-op since checkRateLimit already increments
 */
export const consumeRateLimit = checkRateLimit;

/**
 * Get remaining requests for a category
 */
export const getRemainingRequests = (
    category: keyof typeof RATE_LIMITS,
    identifier: string = 'global'
): number => {
    const config = RATE_LIMITS[category] || RATE_LIMITS.api_default;
    const key = `${category}:${identifier}`;
    const now = Date.now();

    const entry = rateLimitStore.get(key);

    if (!entry || now >= entry.resetTime) {
        return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - entry.count);
};

/**
 * Wait until rate limit resets (useful for retry logic)
 */
export const waitForRateLimit = async (
    category: keyof typeof RATE_LIMITS,
    identifier: string = 'global'
): Promise<void> => {
    const { allowed, resetIn } = checkRateLimit(category, identifier);

    if (!allowed && resetIn > 0) {
        // Don't decrement count since we're just checking
        const key = `${category}:${identifier}`;
        const entry = rateLimitStore.get(key);
        if (entry) entry.count--; // Undo the increment from checkRateLimit

        await new Promise(resolve => setTimeout(resolve, resetIn));
    }
};

/**
 * Higher-order function to wrap API calls with rate limiting
 */
export const withRateLimit = <T extends unknown[], R>(
    category: keyof typeof RATE_LIMITS,
    fn: (...args: T) => Promise<R>,
    identifier: string = 'global'
): ((...args: T) => Promise<R>) => {
    return async (...args: T): Promise<R> => {
        const { allowed, remaining, resetIn } = checkRateLimit(category, identifier);

        if (!allowed) {
            throw new RateLimitError(
                `Rate limit exceeded for ${category}. Try again in ${Math.ceil(resetIn / 1000)} seconds.`,
                resetIn,
                category
            );
        }

        // Log remaining capacity for monitoring
        if (remaining <= 2) {
            logger.warn(`[RateLimit] Low capacity for ${category}: ${remaining} remaining`);
        }

        return fn(...args);
    };
};

/**
 * Custom error class for rate limit exceeded
 */
export class RateLimitError extends Error {
    public resetIn: number;
    public category: string;

    constructor(message: string, resetIn: number, category: string) {
        super(message);
        this.name = 'RateLimitError';
        this.resetIn = resetIn;
        this.category = category;
    }
}

/**
 * Clean up expired entries (call periodically to prevent memory leaks)
 */
export const cleanupExpiredEntries = (): void => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now >= entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
};

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
    setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}
