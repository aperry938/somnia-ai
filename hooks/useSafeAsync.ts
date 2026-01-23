import { useCallback, useRef, useEffect, useState } from 'react';
import { logger } from '../services/logger';

/**
 * Result type for async operations
 */
export interface AsyncState<T> {
    data: T | null;
    error: Error | null;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
}

/**
 * Hook for safely executing async functions with automatic cleanup on unmount.
 * Prevents "setState on unmounted component" warnings and memory leaks.
 *
 * @returns {execute, state, reset} - Execute function, current state, and reset function
 *
 * @example
 * const { execute, state } = useSafeAsync<UserData>();
 *
 * const handleClick = () => {
 *   execute(async () => {
 *     const data = await fetchUser(userId);
 *     return data;
 *   });
 * };
 *
 * if (state.isLoading) return <Spinner />;
 * if (state.isError) return <Error message={state.error?.message} />;
 * if (state.data) return <UserProfile user={state.data} />;
 */
export const useSafeAsync = <T>() => {
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    const [state, setState] = useState<AsyncState<T>>({
        data: null,
        error: null,
        isLoading: false,
        isSuccess: false,
        isError: false,
    });

    // Track mounted state
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Abort any in-flight requests on unmount
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    /**
     * Safely set state only if component is still mounted
     */
    const safeSetState = useCallback((newState: Partial<AsyncState<T>>) => {
        if (isMountedRef.current) {
            setState(prev => ({ ...prev, ...newState }));
        }
    }, []);

    /**
     * Execute an async function safely
     * @param asyncFn - Async function to execute
     * @param options - Optional abort signal to use
     */
    const execute = useCallback(async (
        asyncFn: (signal?: AbortSignal) => Promise<T>,
        options?: { signal?: AbortSignal }
    ): Promise<T | null> => {
        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();
        const signal = options?.signal || abortControllerRef.current.signal;

        safeSetState({
            isLoading: true,
            isError: false,
            error: null,
        });

        try {
            const result = await asyncFn(signal);

            // Don't update state if aborted
            if (signal.aborted) {
                return null;
            }

            safeSetState({
                data: result,
                isLoading: false,
                isSuccess: true,
                isError: false,
                error: null,
            });

            return result;
        } catch (error) {
            // Ignore abort errors
            if (error instanceof Error && error.name === 'AbortError') {
                return null;
            }

            logger.error('[useSafeAsync] Async operation failed:', error);

            safeSetState({
                error: error instanceof Error ? error : new Error(String(error)),
                isLoading: false,
                isSuccess: false,
                isError: true,
            });

            return null;
        }
    }, [safeSetState]);

    /**
     * Reset state to initial values
     */
    const reset = useCallback(() => {
        safeSetState({
            data: null,
            error: null,
            isLoading: false,
            isSuccess: false,
            isError: false,
        });
    }, [safeSetState]);

    /**
     * Abort current operation
     */
    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    return { execute, state, reset, abort };
};

/**
 * Simple hook that returns a safe setState that only updates if mounted.
 * Useful for components with simple async operations.
 *
 * @example
 * const isMounted = useMountedRef();
 *
 * useEffect(() => {
 *   fetchData().then(data => {
 *     if (isMounted.current) {
 *       setData(data);
 *     }
 *   });
 * }, []);
 */
export const useMountedRef = () => {
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return isMountedRef;
};

/**
 * Hook to create a safe callback that only executes if component is mounted.
 * Wraps a callback with a mounted check.
 *
 * @example
 * const safeCallback = useSafeCallback((data) => {
 *   setData(data);
 * }, []);
 *
 * // Later:
 * fetchData().then(safeCallback);
 */
export const useSafeCallback = <T extends (...args: unknown[]) => void>(
    callback: T,
    deps: React.DependencyList
): T => {
    const isMountedRef = useMountedRef();

     
    return useCallback(
        ((...args: Parameters<T>) => {
            if (isMountedRef.current) {
                return callback(...args);
            }
        }) as T,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [...deps]
    );
};

export default useSafeAsync;
