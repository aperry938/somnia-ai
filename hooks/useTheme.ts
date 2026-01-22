import { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useSunTimes } from './useSunTimes';
import { Theme } from '../types';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';

// Theme-specific status bar colors
const STATUS_BAR_COLORS: Record<Theme, string> = {
    sleep: '#1A0A00',   // Warm amber for sleep mode
    night: '#0F172A',   // Dark blue for night mode
    day: '#F0F4F8',     // Light gray for day mode
};

export const useTheme = () => {
    const { themeOverride } = useAppContext();
    const { isNight } = useSunTimes();
    const [theme, setTheme] = useState<Theme>('day');

    // Update native status bar color when theme changes
    useEffect(() => {
        const updateStatusBar = async () => {
            if (!Capacitor.isNativePlatform()) return;

            try {
                const color = STATUS_BAR_COLORS[theme];
                await StatusBar.setBackgroundColor({ color });
            } catch (e) {
                // StatusBar may not be available on all platforms
                console.warn('[useTheme] StatusBar update failed:', e);
            }
        };

        updateStatusBar();
    }, [theme]);

    useEffect(() => {
        const checkTheme = () => {
            if (themeOverride !== 'auto') {
                setTheme(themeOverride);
                return;
            }

            // Auto-activate sleep mode during evening/nighttime hours (7 PM - 6 AM) to minimize blue light
            const hour = new Date().getHours();
            if (hour >= 19 || hour < 6) {
                setTheme('sleep');
                return;
            }

            // Use sun times if available, otherwise fall back to system preference
            if (isNight !== null) {
                setTheme(isNight ? 'night' : 'day');
            } else {
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setTheme(systemDark ? 'night' : 'day');
            }
        };

        checkTheme();
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', checkTheme);
        return () => mediaQuery.removeEventListener('change', checkTheme);
    }, [themeOverride, isNight]);

    return { theme };
};

