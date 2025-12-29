import { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

export const useTheme = () => {
    const { themeOverride } = useAppContext();
    const [theme, setTheme] = useState<'day' | 'night'>('day');

    useEffect(() => {
        const checkTheme = () => {
            if (themeOverride !== 'auto') {
                setTheme(themeOverride);
                return;
            }
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(systemDark ? 'night' : 'day');
        };

        checkTheme();
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', checkTheme);
        return () => mediaQuery.removeEventListener('change', checkTheme);
    }, [themeOverride]);

    return { theme };
};
