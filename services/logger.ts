/**
 * Production-Safe Logger
 *
 * SECURITY FIX: Wraps console methods to only output in development.
 * Prevents information disclosure in production builds.
 * Includes sensitive data filtering to prevent accidental credential logging.
 */

const isDev = import.meta.env.DEV;

/**
 * SECURITY: Patterns for sensitive data that should never be logged
 */
const SENSITIVE_PATTERNS = [
    /password/i,
    /token/i,
    /api[_-]?key/i,
    /secret/i,
    /credential/i,
    /auth/i,
    /bearer/i,
    /session/i,
];

/**
 * SECURITY: Sanitize arguments to prevent sensitive data from being logged
 * Redacts values that look like tokens, passwords, or API keys
 */
function sanitizeArgs(args: unknown[]): unknown[] {
    return args.map(arg => {
        if (typeof arg === 'string') {
            // Redact strings that look like API keys or tokens
            if (arg.length > 20 && /^[A-Za-z0-9_-]+$/.test(arg)) {
                return '[REDACTED]';
            }
            return arg;
        }
        if (arg && typeof arg === 'object') {
            return sanitizeObject(arg as Record<string, unknown>);
        }
        return arg;
    });
}

/**
 * SECURITY: Recursively sanitize objects to redact sensitive fields
 */
function sanitizeObject(obj: Record<string, unknown>, depth = 0): Record<string, unknown> {
    // Prevent infinite recursion
    if (depth > 5) return { '[TRUNCATED]': 'Object too deep' };

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        // Check if key matches sensitive patterns
        const isSensitiveKey = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));

        if (isSensitiveKey) {
            sanitized[key] = '[REDACTED]';
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value as Record<string, unknown>, depth + 1);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item =>
                item && typeof item === 'object'
                    ? sanitizeObject(item as Record<string, unknown>, depth + 1)
                    : item
            );
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

/**
 * Development-only logger
 * All logs are suppressed in production builds
 */
export const logger = {
    log: (...args: unknown[]): void => {
        if (isDev) console.log(...sanitizeArgs(args));
    },
    warn: (...args: unknown[]): void => {
        if (isDev) console.warn(...sanitizeArgs(args));
    },
    error: (...args: unknown[]): void => {
        // Errors are always logged for debugging, but sanitized in production
        if (isDev) {
            console.error(...sanitizeArgs(args));
        } else {
            // In production, log minimal error info without sensitive details
            console.error('[Error]', args[0] instanceof Error ? args[0].message : 'An error occurred');
        }
    },
    debug: (...args: unknown[]): void => {
        if (isDev) console.debug(...sanitizeArgs(args));
    },
    info: (...args: unknown[]): void => {
        if (isDev) console.info(...sanitizeArgs(args));
    },
    group: (label: string): void => {
        if (isDev) console.group(label);
    },
    groupEnd: (): void => {
        if (isDev) console.groupEnd();
    },
    table: (data: unknown): void => {
        if (isDev) {
            const sanitized = data && typeof data === 'object'
                ? sanitizeObject(data as Record<string, unknown>)
                : data;
            console.table(sanitized);
        }
    },
};

export default logger;
