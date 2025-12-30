import { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useSunTimes } from './useSunTimes';

export const useTheme = () => {
    const { themeOverride } = useAppContext();
    const { isNight } = useSunTimes();
    const [theme, setTheme] = useState<'day' | 'night'>('day');

    useEffect(() => {
        const checkTheme = () => {
            if (themeOverride !== 'auto') {
                setTheme(themeOverride);
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
