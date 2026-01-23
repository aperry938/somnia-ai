/**
 * useAppLifecycle - Handle app foreground/background state changes
 *
 * Important for mobile apps to:
 * - Refresh data when returning from background
 * - Sync widgets when app comes to foreground
 * - Update time-sensitive UI
 * - Check alarm status after returning from background
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp, AppState } from '@capacitor/app';
import { logger } from '../services/logger';

interface AppLifecycleOptions {
    /**
     * Called when app returns to foreground
     */
    onForeground?: () => void;

    /**
     * Called when app goes to background
     */
    onBackground?: () => void;

    /**
     * Called periodically while in foreground (for time updates)
     * Interval in milliseconds (default: 60000 = 1 minute)
     */
    tickInterval?: number;
    onTick?: () => void;
}

export function useAppLifecycle({
    onForeground,
    onBackground,
    tickInterval = 60000,
    onTick,
}: AppLifecycleOptions = {}): void {
    const isActiveRef = useRef(true);
    const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Track mounted state for async operations
    const isMountedRef = useRef(true);

    // Store callbacks in refs to avoid effect re-runs
    const onForegroundRef = useRef(onForeground);
    const onBackgroundRef = useRef(onBackground);
    const onTickRef = useRef(onTick);

    // Keep refs updated
    useEffect(() => {
        onForegroundRef.current = onForeground;
        onBackgroundRef.current = onBackground;
        onTickRef.current = onTick;
    }, [onForeground, onBackground, onTick]);

    // Handle app state changes
    const handleStateChange = useCallback((state: AppState) => {
        // Check if still mounted
        if (!isMountedRef.current) return;

        logger.log('[AppLifecycle] State changed:', state.isActive ? 'foreground' : 'background');

        if (state.isActive && !isActiveRef.current) {
            // App returned to foreground
            isActiveRef.current = true;
            onForegroundRef.current?.();

            // Restart tick interval
            if (onTickRef.current && !tickIntervalRef.current && isMountedRef.current) {
                tickIntervalRef.current = setInterval(() => {
                    if (isMountedRef.current) {
                        onTickRef.current?.();
                    }
                }, tickInterval);
            }
        } else if (!state.isActive && isActiveRef.current) {
            // App went to background
            isActiveRef.current = false;
            onBackgroundRef.current?.();

            // Clear tick interval while in background
            if (tickIntervalRef.current) {
                clearInterval(tickIntervalRef.current);
                tickIntervalRef.current = null;
            }
        }
    }, [tickInterval]);

    useEffect(() => {
        isMountedRef.current = true;

        // Start tick interval if callback provided
        if (onTickRef.current) {
            tickIntervalRef.current = setInterval(() => {
                if (isMountedRef.current) {
                    onTickRef.current?.();
                }
            }, tickInterval);
        }

        if (!Capacitor.isNativePlatform()) {
            // On web, use visibility API
            const handleVisibilityChange = () => {
                if (isMountedRef.current) {
                    handleStateChange({ isActive: document.visibilityState === 'visible' });
                }
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
                isMountedRef.current = false;
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                if (tickIntervalRef.current) {
                    clearInterval(tickIntervalRef.current);
                    tickIntervalRef.current = null;
                }
            };
        }

        // Native: Store listener handles for proper cleanup
        let appStateListener: { remove: () => Promise<void> } | null = null;
        let resumeListenerHandle: { remove: () => Promise<void> } | null = null;
        let pauseListenerHandle: { remove: () => Promise<void> } | null = null;

        // Helper to safely remove a listener
        const safeRemoveListener = (
            listener: { remove: () => Promise<void> } | null,
            name: string
        ) => {
            if (listener) {
                listener.remove().catch(err =>
                    logger.error(`[AppLifecycle] Failed to remove ${name} listener:`, err)
                );
            }
        };

        // Listen for app state changes
        CapacitorApp.addListener('appStateChange', handleStateChange)
            .then(handle => {
                if (isMountedRef.current) {
                    appStateListener = handle;
                } else {
                    handle.remove().catch(() => {});
                }
            })
            .catch(err => logger.error('[AppLifecycle] Failed to add appStateChange listener:', err));

        // Also handle resume events (iOS specific)
        CapacitorApp.addListener('resume', () => {
            if (isMountedRef.current) {
                logger.log('[AppLifecycle] Resume event');
                handleStateChange({ isActive: true });
            }
        })
            .then(handle => {
                if (isMountedRef.current) {
                    resumeListenerHandle = handle;
                } else {
                    handle.remove().catch(() => {});
                }
            })
            .catch(err => logger.error('[AppLifecycle] Failed to add resume listener:', err));

        CapacitorApp.addListener('pause', () => {
            if (isMountedRef.current) {
                logger.log('[AppLifecycle] Pause event');
                handleStateChange({ isActive: false });
            }
        })
            .then(handle => {
                if (isMountedRef.current) {
                    pauseListenerHandle = handle;
                } else {
                    handle.remove().catch(() => {});
                }
            })
            .catch(err => logger.error('[AppLifecycle] Failed to add pause listener:', err));

        return () => {
            isMountedRef.current = false;
            safeRemoveListener(appStateListener, 'appStateChange');
            safeRemoveListener(resumeListenerHandle, 'resume');
            safeRemoveListener(pauseListenerHandle, 'pause');
            if (tickIntervalRef.current) {
                clearInterval(tickIntervalRef.current);
                tickIntervalRef.current = null;
            }
        };
    }, [handleStateChange, tickInterval]);
}

/**
 * Hook to get current app state
 */
export function useAppState(): { isActive: boolean } {
    const [isActive, setIsActive] = useState(true);
    const isActiveRef = useRef(true);

    useAppLifecycle({
        onForeground: () => {
            isActiveRef.current = true;
            setIsActive(true);
        },
        onBackground: () => {
            isActiveRef.current = false;
            setIsActive(false);
        },
    });

    return { isActive };
}
