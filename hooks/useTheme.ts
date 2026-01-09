import { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useSunTimes } from './useSunTimes';
import { Theme } from '../types';

export const useTheme = () => {
    const { themeOverride } = useAppContext();
    const { isNight } = useSunTimes();
    const [theme, setTheme] = useState<Theme>('day');

    useEffect(() => {
        const checkTheme = () => {
            if (themeOverride !== 'auto') {
                setTheme(themeOverride);
                return;
            }

            // Auto-activate sleep mode during nighttime hours (10 PM - 6 AM) to minimize blue light
            const hour = new Date().getHours();
            if (hour >= 22 || hour < 6) {
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
