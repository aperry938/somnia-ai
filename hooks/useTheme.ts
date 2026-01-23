import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useSunTimes } from './useSunTimes';
import { Theme } from '../types';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { logger } from '../services/logger';

// Theme-specific status bar colors
const STATUS_BAR_COLORS: Record<Theme, string> = {
    sleep: '#1A0A00', // Warm amber for sleep mode
    night: '#0F172A', // Dark blue for night mode
    day: '#F0F4F8', // Light gray for day mode
};

// Status bar style (light/dark icons)
const STATUS_BAR_STYLES: Record<Theme, Style> = {
    sleep: Style.Light, // Light icons on dark background
    night: Style.Light, // Light icons on dark background
    day: Style.Dark, // Dark icons on light background
};

// Theme check interval (every minute for time-based auto theme)
const THEME_CHECK_INTERVAL = 60 * 1000;

/**
 * Hook to manage app theme with proper cleanup and native status bar integration.
 *
 * Features:
 * - Auto theme based on time of day and sun times
 * - Native status bar color and style updates
 * - System preference detection
 * - Proper cleanup of intervals and listeners
 */
export const useTheme = () => {
    const { themeOverride } = useAppContext();
    const { isNight } = useSunTimes();
    const [theme, setTheme] = useState<Theme>('day');

    // Refs for cleanup
    const isMountedRef = useRef(true);
    const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const statusBarUpdateInProgressRef = useRef(false);

    // Update native status bar color and style when theme changes
    const updateStatusBar = useCallback(async (newTheme: Theme) => {
        if (!Capacitor.isNativePlatform()) return;

        // Prevent concurrent updates
        if (statusBarUpdateInProgressRef.current) return;
        statusBarUpdateInProgressRef.current = true;

        try {
            const color = STATUS_BAR_COLORS[newTheme];
            const style = STATUS_BAR_STYLES[newTheme];

            // Update both color and style for proper appearance
            await Promise.all([
                StatusBar.setBackgroundColor({ color }),
                StatusBar.setStyle({ style }),
            ]);

            logger.log('[useTheme] Status bar updated:', { color, style });
        } catch (e) {
            // StatusBar may not be available on all platforms (e.g., Android without translucent status bar)
            logger.warn('[useTheme] StatusBar update failed:', e);
        } finally {
            statusBarUpdateInProgressRef.current = false;
        }
    }, []);

    // Update status bar when theme changes
    useEffect(() => {
        updateStatusBar(theme);
    }, [theme, updateStatusBar]);

    // Calculate the appropriate theme
    const calculateTheme = useCallback((): Theme => {
        if (themeOverride !== 'auto') {
            return themeOverride;
        }

        // Auto-activate sleep mode during evening/nighttime hours (7 PM - 6 AM) to minimize blue light
        const hour = new Date().getHours();
        if (hour >= 19 || hour < 6) {
            return 'sleep';
        }

        // Use sun times if available, otherwise fall back to system preference
        if (isNight !== null) {
            return isNight ? 'night' : 'day';
        }

        // Fall back to system preference
        if (typeof window !== 'undefined') {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return systemDark ? 'night' : 'day';
        }

        return 'day';
    }, [themeOverride, isNight]);

    // Check and update theme
    const checkTheme = useCallback(() => {
        if (!isMountedRef.current) return;
        const newTheme = calculateTheme();
        setTheme(prevTheme => (prevTheme !== newTheme ? newTheme : prevTheme));
    }, [calculateTheme]);

    // Set up theme checking
    useEffect(() => {
        isMountedRef.current = true;

        // Initial check
        checkTheme();

        // Set up periodic check for time-based auto theme
        if (themeOverride === 'auto') {
            checkIntervalRef.current = setInterval(checkTheme, THEME_CHECK_INTERVAL);
        }

        // Listen for system preference changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = () => {
            if (isMountedRef.current) {
                checkTheme();
            }
        };
        mediaQuery.addEventListener('change', handleMediaChange);

        return () => {
            isMountedRef.current = false;

            // Clear interval
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }

            // Remove media query listener
            mediaQuery.removeEventListener('change', handleMediaChange);
        };
    }, [themeOverride, checkTheme]);

    // Re-check theme when dependencies change
    useEffect(() => {
        checkTheme();
    }, [themeOverride, isNight, checkTheme]);

    return { theme };
};

