
import { useState, useEffect } from 'react';
import { Theme } from '../types';
import { useAppContext } from '../contexts/AppContext';

/**
 * Calculates a circadian brightness factor (0-1) based on time of day.
 * 0 = darkest (deep night), 1 = brightest (midday)
 * Smooth sine-wave interpolation throughout the day.
 */
const getCircadianBrightness = (hours: number, minutes: number): number => {
    const timeInHours = hours + minutes / 60;

    // Peak brightness at noon (12:00), darkest at midnight (0:00/24:00)
    // Using cosine wave: cos(0) = 1 at midnight, cos(π) = -1 at noon
    // Invert and normalize to 0-1 range
    const radians = (timeInHours / 24) * 2 * Math.PI;
    const brightness = (1 - Math.cos(radians - Math.PI)) / 2;

    // Apply curve to make transitions more gradual during day, steeper at dusk/dawn
    // This creates: very dark 11pm-5am, gradual brighten 6-10am, bright 10am-4pm, gradual dim 5-10pm
    return Math.pow(brightness, 0.7);
};

/**
 * Provides current time, date, and derived theme (day/night).
 * Updates every second.
 * Handles automatic theme toggling based on hour (6am-7pm = day).
 * In 'auto' mode, also applies gradual circadian brightness.
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
    const minutes = date.getMinutes();
    const autoTheme: Theme = (hours >= 6 && hours < 19) ? 'day' : 'night';

    // Use override if set, otherwise use auto theme based on time
    const theme: Theme = themeOverride === 'auto' ? autoTheme : themeOverride;

    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(" AM", "").replace(" PM", "");
    const dateString = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

    // Calculate circadian brightness for gradual transitions
    const circadianBrightness = getCircadianBrightness(hours, minutes);

    useEffect(() => {
        const root = document.documentElement;

        if (theme === 'night') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Only apply circadian dimming in auto mode
        if (themeOverride === 'auto') {
            // Apply brightness factor as CSS custom property
            // This dims the background gradient during darker hours
            root.style.setProperty('--circadian-brightness', circadianBrightness.toFixed(2));
            root.style.setProperty('--circadian-overlay-opacity', ((1 - circadianBrightness) * 0.15).toFixed(2));
        } else {
            // Reset to defaults when using manual theme
            root.style.setProperty('--circadian-brightness', '1');
            root.style.setProperty('--circadian-overlay-opacity', '0');
        }
    }, [theme, themeOverride, circadianBrightness]);

    return { timeString, dateString, theme, date, circadianBrightness };
};
