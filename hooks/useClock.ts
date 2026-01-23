import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Theme } from '../types';
import { useAppContext } from '../contexts/AppContext';

// Constants for theme transition
const THEME_TRANSITION_DURATION = 300; // ms for smooth transition
const CLOCK_UPDATE_INTERVAL = 1000; // 1 second

/**
 * Provides current time, date, and derived theme (day/night).
 * Updates every second with proper cleanup.
 * In 'auto' mode, switches between light (6am-7pm) and dark (7pm-6am).
 *
 * Features:
 * - Proper interval cleanup
 * - Smooth theme transitions
 * - Second-level accuracy with drift correction
 * - Memory-efficient time formatting
 */
export const useClock = () => {
    const { themeOverride } = useAppContext();
    const [date, setDate] = useState(new Date());
    const [isTransitioning, setIsTransitioning] = useState(false);
    const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);
    const previousThemeRef = useRef<Theme | null>(null);

    // Sync interval to start of each second for precision
    useEffect(() => {
        isMountedRef.current = true;

        const syncToSecond = () => {
            if (!isMountedRef.current) return;
            setDate(new Date());
        };

        // Calculate ms until next second boundary
        const now = new Date();
        const msUntilNextSecond = 1000 - now.getMilliseconds();

        // First, wait until the start of the next second
        const initialTimeout = setTimeout(() => {
            if (!isMountedRef.current) return;
            syncToSecond();

            // Then start the interval at second boundaries
            intervalIdRef.current = setInterval(() => {
                if (!isMountedRef.current) return;
                setDate(new Date());
            }, CLOCK_UPDATE_INTERVAL);
        }, msUntilNextSecond);

        return () => {
            isMountedRef.current = false;
            clearTimeout(initialTimeout);
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;
            }
        };
    }, []);

    const hours = date.getHours();

    // Auto theme: day (6am-7pm), sleep during evening/night (7pm-6am) for zero blue light
    // Sleep mode uses warm amber tones to minimize blue light exposure before bed
    const autoTheme: Theme = (hours >= 6 && hours < 19) ? 'day' : 'sleep';

    // Use override if set, otherwise use auto theme based on time
    const theme: Theme = themeOverride === 'auto' ? autoTheme : themeOverride;

    // Memoize time string to avoid recalculation on every render
    const timeString = useMemo(() => {
        return date
            .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
            .replace(' AM', '')
            .replace(' PM', '');
    }, [date]);

    // Memoize date string
    const dateString = useMemo(() => {
        return date.toLocaleDateString([], {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        });
    }, [date]);

    // Apply theme with smooth transition
    const applyTheme = useCallback((newTheme: Theme) => {
        const root = document.documentElement;

        // Check if theme actually changed
        if (previousThemeRef.current === newTheme) {
            return;
        }

        // Add transition class for smooth theme change
        if (previousThemeRef.current !== null) {
            setIsTransitioning(true);
            root.style.transition = `background-color ${THEME_TRANSITION_DURATION}ms ease, color ${THEME_TRANSITION_DURATION}ms ease`;
        }

        // Apply theme classes
        // - 'dark' class enables Tailwind dark mode styles
        // - 'sleep' class enables zero-blue-light amber theme (also needs 'dark' base)
        if (newTheme === 'night') {
            root.classList.add('dark');
            root.classList.remove('sleep');
        } else if (newTheme === 'sleep') {
            root.classList.add('dark', 'sleep');
        } else {
            root.classList.remove('dark', 'sleep');
        }

        previousThemeRef.current = newTheme;

        // Clear transition after animation completes
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
        }

        transitionTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
                root.style.transition = '';
                setIsTransitioning(false);
            }
            transitionTimeoutRef.current = null;
        }, THEME_TRANSITION_DURATION);
    }, []);

    // Apply theme changes
    useEffect(() => {
        applyTheme(theme);
    }, [theme, applyTheme]);

    // Cleanup transition timeout on unmount
    useEffect(() => {
        return () => {
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
                transitionTimeoutRef.current = null;
            }
            // Clean up transition style
            document.documentElement.style.transition = '';
        };
    }, []);

    return { timeString, dateString, theme, date, isTransitioning };
};
