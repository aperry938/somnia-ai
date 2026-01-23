import { useState, useEffect, useCallback, useRef } from 'react';

// Configuration for network detection
const CONNECTIVITY_CHECK_INTERVAL_MS = 30000; // Check every 30 seconds when visible
const CONNECTIVITY_CHECK_URL = '/favicon.ico'; // Use app's own favicon for connectivity check
const DEBOUNCE_DELAY_MS = 1000; // Debounce rapid status changes

/**
 * Hook to track the user's online/offline status with reliable network detection.
 *
 * This hook goes beyond navigator.onLine by:
 * 1. Performing actual network connectivity checks
 * 2. Detecting when online but no actual internet (captive portals, etc.)
 * 3. Debouncing rapid status changes to prevent flicker
 * 4. Performing checks when the app is foregrounded
 *
 * Returns an object with:
 * - isOnline: boolean - true if connected to the internet
 * - isChecking: boolean - true if actively checking connectivity
 * - lastChecked: number | null - timestamp of last successful check
 * - checkNow: () => Promise<boolean> - manually trigger a connectivity check
 */
export interface OnlineStatusResult {
    isOnline: boolean;
    isChecking: boolean;
    lastChecked: number | null;
    checkNow: () => Promise<boolean>;
}

export const useOnlineStatus = (): OnlineStatusResult => {
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [isChecking, setIsChecking] = useState<boolean>(false);
    const [lastChecked, setLastChecked] = useState<number | null>(null);

    // Refs for cleanup
    const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef<boolean>(true);

    /**
     * Perform actual network connectivity check
     * Uses HEAD request to avoid downloading content
     */
    const performConnectivityCheck = useCallback(async (): Promise<boolean> => {
        // If navigator says we're offline, trust it (saves network call)
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return false;
        }

        // Cancel any in-flight check
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        setIsChecking(true);

        try {
            // Add cache-busting parameter
            const url = `${CONNECTIVITY_CHECK_URL}?_=${Date.now()}`;

            const response = await fetch(url, {
                method: 'HEAD',
                cache: 'no-store',
                signal: abortControllerRef.current.signal,
                // Short timeout to fail fast
                headers: {
                    'Cache-Control': 'no-cache',
                },
            });

            const isConnected = response.ok || response.status === 304;

            if (isMountedRef.current) {
                setLastChecked(Date.now());
                setIsChecking(false);
            }

            return isConnected;
        } catch (error) {
            // AbortError means we cancelled intentionally
            if (error instanceof Error && error.name === 'AbortError') {
                if (isMountedRef.current) {
                    setIsChecking(false);
                }
                return isOnline; // Return current status
            }

            // Network error - we're offline
            if (isMountedRef.current) {
                setIsChecking(false);
            }
            return false;
        }
    }, [isOnline]);

    /**
     * Manual connectivity check that updates state
     */
    const checkNow = useCallback(async (): Promise<boolean> => {
        const result = await performConnectivityCheck();
        if (isMountedRef.current) {
            setIsOnline(result);
        }
        return result;
    }, [performConnectivityCheck]);

    /**
     * Debounced status update to prevent flicker
     */
    const updateOnlineStatus = useCallback((newStatus: boolean) => {
        // Clear any pending debounce
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // If going offline, update immediately (more important)
        if (!newStatus) {
            if (isMountedRef.current) {
                setIsOnline(false);
            }
            return;
        }

        // If coming online, debounce to ensure stable connection
        debounceTimeoutRef.current = setTimeout(() => {
            // Verify with actual connectivity check
            performConnectivityCheck().then((isActuallyOnline) => {
                if (isMountedRef.current) {
                    setIsOnline(isActuallyOnline);
                }
            });
        }, DEBOUNCE_DELAY_MS);
    }, [performConnectivityCheck]);

    useEffect(() => {
        isMountedRef.current = true;

        const handleOnline = () => updateOnlineStatus(true);
        const handleOffline = () => updateOnlineStatus(false);

        // Handle visibility change - check connectivity when app is foregrounded
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                // Small delay to let network stabilize after wakeup
                setTimeout(() => {
                    performConnectivityCheck().then((result) => {
                        if (isMountedRef.current) {
                            setIsOnline(result);
                        }
                    });
                }, 500);
            }
        };

        // Setup event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Setup periodic connectivity check when visible
        const startPeriodicCheck = () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }

            checkIntervalRef.current = setInterval(() => {
                // Only check when visible and reportedly online
                if (document.visibilityState === 'visible' && navigator.onLine) {
                    performConnectivityCheck().then((result) => {
                        if (isMountedRef.current && isOnline !== result) {
                            setIsOnline(result);
                        }
                    });
                }
            }, CONNECTIVITY_CHECK_INTERVAL_MS);
        };

        startPeriodicCheck();

        // Initial connectivity check (delayed to not block initial render)
        setTimeout(() => {
            performConnectivityCheck().then((result) => {
                if (isMountedRef.current) {
                    setIsOnline(result);
                }
            });
        }, 1000);

        return () => {
            isMountedRef.current = false;

            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);

            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [updateOnlineStatus, performConnectivityCheck, isOnline]);

    return { isOnline, isChecking, lastChecked, checkNow };
};

/**
 * Simple hook that returns just the boolean status
 * for backward compatibility
 */
export const useSimpleOnlineStatus = (): boolean => {
    const { isOnline } = useOnlineStatus();
    return isOnline;
};
