/**
 * Production-Safe Logger
 *
 * SECURITY FIX: Wraps console methods to only output in development.
 * Prevents information disclosure in production builds.
 */

const isDev = import.meta.env.DEV;

/**
 * Development-only logger
 * All logs are suppressed in production builds
 */
export const logger = {
    log: (...args: unknown[]): void => {
        if (isDev) console.log(...args);
    },
    warn: (...args: unknown[]): void => {
        if (isDev) console.warn(...args);
    },
    error: (...args: unknown[]): void => {
        // Errors are always logged for debugging, but sanitized in production
        if (isDev) {
            console.error(...args);
        } else {
            // In production, log minimal error info without sensitive details
            console.error('[Error]', args[0] instanceof Error ? args[0].message : 'An error occurred');
        }
    },
    debug: (...args: unknown[]): void => {
        if (isDev) console.debug(...args);
    },
    info: (...args: unknown[]): void => {
        if (isDev) console.info(...args);
    },
    group: (label: string): void => {
        if (isDev) console.group(label);
    },
    groupEnd: (): void => {
        if (isDev) console.groupEnd();
    },
    table: (data: unknown): void => {
        if (isDev) console.table(data);
    },
};

export default logger;
