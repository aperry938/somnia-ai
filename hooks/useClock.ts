
import { useState, useEffect } from 'react';
import { Theme } from '../types';
import { useAppContext } from '../contexts/AppContext';

/**
 * Provides current time, date, and derived theme (day/night).
 * Updates every second.
 * In 'auto' mode, switches between light (6am-6pm) and dark.
 */
export const useClock = () => {
    const { themeOverride } = useAppContext();
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setDate(new Date());
        }, 1000);
        return () => clearInterval(timerId);
    }, []);

    const hours = date.getHours();

    // Simple auto theme: light during 6am-6pm, dark otherwise
    const autoTheme: Theme = (hours >= 6 && hours < 18) ? 'day' : 'night';

    // Use override if set, otherwise use auto theme based on time
    const theme: Theme = themeOverride === 'auto' ? autoTheme : themeOverride;

    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(" AM", "").replace(" PM", "");
    const dateString = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

    useEffect(() => {
        const root = document.documentElement;

        // Apply theme classes
        // - 'dark' class enables Tailwind dark mode styles
        // - 'sleep' class enables zero-blue-light amber theme (also needs 'dark' base)
        if (theme === 'night') {
            root.classList.add('dark');
            root.classList.remove('sleep');
        } else if (theme === 'sleep') {
            root.classList.add('dark', 'sleep');
        } else {
            root.classList.remove('dark', 'sleep');
        }
    }, [theme]);

    return { timeString, dateString, theme, date };
};
