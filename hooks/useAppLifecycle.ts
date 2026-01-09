/**
 * useAppLifecycle - Handle app foreground/background state changes
 *
 * Important for mobile apps to:
 * - Refresh data when returning from background
 * - Sync widgets when app comes to foreground
 * - Update time-sensitive UI
 * - Check alarm status after returning from background
 */

import { useEffect, useCallback, useRef } from 'react';
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

    // Handle app state changes
    const handleStateChange = useCallback((state: AppState) => {
        logger.log('[AppLifecycle] State changed:', state.isActive ? 'foreground' : 'background');

        if (state.isActive && !isActiveRef.current) {
            // App returned to foreground
            isActiveRef.current = true;
            onForeground?.();

            // Restart tick interval
            if (onTick && !tickIntervalRef.current) {
                tickIntervalRef.current = setInterval(onTick, tickInterval);
            }
        } else if (!state.isActive && isActiveRef.current) {
            // App went to background
            isActiveRef.current = false;
            onBackground?.();

            // Clear tick interval while in background
            if (tickIntervalRef.current) {
                clearInterval(tickIntervalRef.current);
                tickIntervalRef.current = null;
            }
        }
    }, [onForeground, onBackground, onTick, tickInterval]);

    useEffect(() => {
        // Start tick interval if callback provided
        if (onTick) {
            tickIntervalRef.current = setInterval(onTick, tickInterval);
        }

        if (!Capacitor.isNativePlatform()) {
            // On web, use visibility API
            const handleVisibilityChange = () => {
                handleStateChange({ isActive: document.visibilityState === 'visible' });
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                if (tickIntervalRef.current) {
                    clearInterval(tickIntervalRef.current);
                }
            };
        }

        // Native: Listen for app state changes
        const listener = CapacitorApp.addListener('appStateChange', handleStateChange);

        // Also handle resume events (iOS specific)
        const resumeListener = CapacitorApp.addListener('resume', () => {
            logger.log('[AppLifecycle] Resume event');
            handleStateChange({ isActive: true });
        });

        const pauseListener = CapacitorApp.addListener('pause', () => {
            logger.log('[AppLifecycle] Pause event');
            handleStateChange({ isActive: false });
        });

        return () => {
            listener.then(l => l.remove());
            resumeListener.then(l => l.remove());
            pauseListener.then(l => l.remove());
            if (tickIntervalRef.current) {
                clearInterval(tickIntervalRef.current);
            }
        };
    }, [handleStateChange, onTick, tickInterval]);
}

/**
 * Hook to get current app state
 */
export function useAppState(): { isActive: boolean } {
    const isActiveRef = useRef(true);

    useAppLifecycle({
        onForeground: () => { isActiveRef.current = true; },
        onBackground: () => { isActiveRef.current = false; },
    });

    return { isActive: isActiveRef.current };
}
