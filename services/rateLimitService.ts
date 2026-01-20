/**
 * Rate Limiting Service
 * Prevents API abuse and ensures fair usage of resources.
 *
 * Uses localStorage for persistence - survives page refreshes and app restarts.
 * This is the secondary protection layer; primary protection is the AI credit system.
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

// LocalStorage key prefix
const STORAGE_PREFIX = 'somnia_ratelimit_';

// Default rate limits by category
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
    // AI Analysis - expensive operations
    ai_analysis: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
    ai_imagery: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
    ai_chat: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute

    // Authentication - stricter limits
    auth_login: { maxRequests: 5, windowMs: 5 * 60 * 1000 }, // 5 per 5 minutes
    auth_signup: { maxRequests: 3, windowMs: 10 * 60 * 1000 }, // 3 per 10 minutes
    auth_reset: { maxRequests: 3, windowMs: 15 * 60 * 1000 }, // 3 per 15 minutes

    // Sync operations
    sync: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute

    // General API
    api_default: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
};

/**
 * Get rate limit entry from localStorage
 */
function getEntry(key: string): RateLimitEntry | null {
    try {
        const stored = localStorage.getItem(STORAGE_PREFIX + key);
        if (!stored) return null;
        return JSON.parse(stored) as RateLimitEntry;
    } catch {
        return null;
    }
}

/**
 * Save rate limit entry to localStorage
 */
function setEntry(key: string, entry: RateLimitEntry): void {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch {
        // localStorage full or unavailable - fall back to memory
        logger.warn('[RateLimit] localStorage unavailable, using memory only');
    }
}

/**
 * Remove expired entry from localStorage
 */
function removeEntry(key: string): void {
    try {
        localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
        // Ignore errors
    }
}

/**
 * Check if a request should be allowed based on rate limiting
 * Rate limits persist in localStorage to survive page refreshes.
 *
 * @param category The rate limit category
 * @param identifier Optional identifier (e.g., user ID) for per-user limiting
 * @returns Object with allowed status, remaining count, and reset time
 */
export const checkRateLimit = (
    category: keyof typeof RATE_LIMITS,
    identifier: string = 'global'
): { allowed: boolean; remaining: number; resetIn: number } => {
    const config = RATE_LIMITS[category] ?? RATE_LIMITS.api_default;
    const key = `${category}:${identifier}`;
    const now = Date.now();

    let entry = getEntry(key);

    // If no entry or window has expired, create new entry
    if (!entry || now >= entry.resetTime) {
        entry = {
            count: 0,
            resetTime: now + (config?.windowMs ?? 60000),
        };
    }

    const maxRequests = config?.maxRequests ?? 100;
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetIn = Math.max(0, entry.resetTime - now);

    // Check if rate limited
    if (entry.count >= maxRequests) {
        logger.warn(`[RateLimit] ${category} exceeded for ${identifier}. Reset in ${Math.ceil(resetIn / 1000)}s`);
        return { allowed: false, remaining: 0, resetIn };
    }

    // Increment counter and persist
    entry.count++;
    setEntry(key, entry);

    return { allowed: true, remaining: remaining - 1, resetIn };
};

/**
 * Consume a rate limit slot (use after successful request)
 * This is a no-op since checkRateLimit already increments
 */
export const consumeRateLimit = checkRateLimit;

/**
 * Get remaining requests for a category without consuming a slot
 */
export const getRemainingRequests = (
    category: keyof typeof RATE_LIMITS,
    identifier: string = 'global'
): number => {
    const config = RATE_LIMITS[category] ?? RATE_LIMITS.api_default;
    const key = `${category}:${identifier}`;
    const now = Date.now();

    const entry = getEntry(key);

    if (!entry || now >= entry.resetTime) {
        return config?.maxRequests ?? 100;
    }

    return Math.max(0, (config?.maxRequests ?? 100) - entry.count);
};

/**
 * Wait until rate limit resets (useful for retry logic)
 */
export const waitForRateLimit = async (
    category: keyof typeof RATE_LIMITS,
    identifier: string = 'global'
): Promise<void> => {
    const config = RATE_LIMITS[category] ?? RATE_LIMITS.api_default;
    const key = `${category}:${identifier}`;
    const now = Date.now();

    const entry = getEntry(key);

    if (entry && entry.count >= (config?.maxRequests ?? 100) && now < entry.resetTime) {
        const waitTime = entry.resetTime - now;
        await new Promise(resolve => setTimeout(resolve, waitTime));
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
 * Clean up expired entries from localStorage
 * Note: We collect keys first to avoid index issues when removing during iteration
 */
export const cleanupExpiredEntries = (): void => {
    const now = Date.now();
    try {
        // Collect keys to remove first to avoid modifying localStorage while iterating
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_PREFIX)) {
                const entryKey = key.replace(STORAGE_PREFIX, '');
                const entry = getEntry(entryKey);
                if (entry && now >= entry.resetTime) {
                    keysToRemove.push(entryKey);
                }
            }
        }
        // Now remove all expired entries
        for (const key of keysToRemove) {
            removeEntry(key);
        }
    } catch {
        // Ignore errors during cleanup
    }
};

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
    setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
    // Also cleanup on page load
    cleanupExpiredEntries();
}
