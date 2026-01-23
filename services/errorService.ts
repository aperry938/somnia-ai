/**
 * Centralized Error Logging and Handling Service
 * Captures and reports errors for debugging and monitoring.
 */

// Error categories for filtering and analytics
export type ErrorCategory =
    | 'network'
    | 'validation'
    | 'auth'
    | 'storage'
    | 'ai'
    | 'audio'
    | 'notification'
    | 'unknown';

interface ErrorLog {
    id: string;
    timestamp: number;
    category: ErrorCategory;
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
}

const ERROR_LOG_KEY = 'somnia_error_log';
const MAX_STORED_ERRORS = 50;

/**
 * Get stored error logs
 */
export const getErrorLogs = (): ErrorLog[] => {
    try {
        const stored = localStorage.getItem(ERROR_LOG_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

/**
 * Store an error log
 */
const storeErrorLog = (log: ErrorLog): void => {
    try {
        const logs = getErrorLogs();
        logs.push(log);
        // Keep only most recent errors
        const trimmed = logs.slice(-MAX_STORED_ERRORS);
        localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmed));
    } catch {
        // Silently fail if storage unavailable
    }
};

/**
 * Clear stored error logs
 */
export const clearErrorLogs = (): void => {
    try {
        localStorage.removeItem(ERROR_LOG_KEY);
    } catch {
        // Silently fail
    }
};

/**
 * Log an error with category and context
 */
export const logError = (
    error: Error | string,
    category: ErrorCategory = 'unknown',
    context?: Record<string, unknown>
): void => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    const log: ErrorLog = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        category,
        message: errorObj.message,
        stack: errorObj.stack,
        context,
    };

    // Store locally
    storeErrorLog(log);

    // Log to console in development
    if (import.meta.env.DEV) {
        console.group(`[Error: ${category}]`);
        console.error(errorObj);
        if (context) console.log('Context:', context);
        console.groupEnd();
    }
};

/**
 * Categorize error based on message patterns
 */
export const categorizeError = (error: Error): ErrorCategory => {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('failed to load')) {
        return 'network';
    }
    if (message.includes('validation') || message.includes('invalid')) {
        return 'validation';
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('permission')) {
        return 'auth';
    }
    if (message.includes('storage') || message.includes('quota') || message.includes('localstorage')) {
        return 'storage';
    }
    if (message.includes('ai') || message.includes('gemini') || message.includes('api_key')) {
        return 'ai';
    }
    if (message.includes('audio') || message.includes('media') || message.includes('sound')) {
        return 'audio';
    }

    return 'unknown';
};

/**
 * User-friendly error messages
 */
export const getUserFriendlyMessage = (error: Error | string, category?: ErrorCategory): string => {
    const cat = category || (error instanceof Error ? categorizeError(error) : 'unknown');

    switch (cat) {
        case 'network':
            return 'Connection issue. Please check your internet and try again.';
        case 'validation':
            return 'Please check your input and try again.';
        case 'auth':
            return 'Authentication issue. Please sign in again.';
        case 'storage':
            return 'Storage is full. Consider clearing old data.';
        case 'ai':
            return 'AI service unavailable. Please try again later.';
        case 'audio':
            return 'Audio playback issue. Check your device settings.';
        default:
            return 'Something went wrong. Please try again.';
    }
};

/**
 * Initialize global error handlers
 * Call this once at app startup
 */
export const initGlobalErrorHandlers = (): void => {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));

        logError(error, categorizeError(error), { type: 'unhandledrejection' });

        // Prevent default browser logging
        event.preventDefault();
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
        logError(
            event.error || new Error(event.message),
            'unknown',
            {
                type: 'window.error',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
            }
        );
    });
};

/**
 * Export debug info for support
 */
export const exportErrorDebugInfo = (): string => {
    const logs = getErrorLogs();
    const info = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errors: logs.slice(-20), // Last 20 errors
    };

    return JSON.stringify(info, null, 2);
};
