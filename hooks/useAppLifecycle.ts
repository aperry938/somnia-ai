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
        logger.log('[AppLifecycle] State changed:', state.isActive ? 'foreground' : 'background');

        if (state.isActive && !isActiveRef.current) {
            // App returned to foreground
            isActiveRef.current = true;
            onForegroundRef.current?.();

            // Restart tick interval
            if (onTickRef.current && !tickIntervalRef.current) {
                tickIntervalRef.current = setInterval(() => onTickRef.current?.(), tickInterval);
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
        // Start tick interval if callback provided
        if (onTickRef.current) {
            tickIntervalRef.current = setInterval(() => onTickRef.current?.(), tickInterval);
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
