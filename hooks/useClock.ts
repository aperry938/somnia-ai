
import { useState, useEffect } from 'react';
import { Theme } from '../types';
import { useAppContext } from '../contexts/AppContext';

type CircadianPhase = 'night' | 'dawn' | 'day' | 'dusk';

/**
 * Determines circadian phase based on time of day:
 * - Night: 9pm - 4am (deep dark, very dark theme)
 * - Dawn: 4am - 8am (twilight gradient, transitioning to day)
 * - Day: 8am - 6pm (light theme, full brightness)
 * - Dusk: 6pm - 9pm (twilight gradient, transitioning to night)
 */
const getCircadianPhase = (hours: number, minutes: number): { phase: CircadianPhase; progress: number } => {
    const time = hours + minutes / 60;

    // Night: 21:00 (9pm) to 4:00am (deep dark)
    if (time >= 21 || time < 4) {
        return { phase: 'night', progress: 1 };
    }
    // Dawn: 4:00 to 8:00 (4 hour transition - twilight)
    if (time >= 4 && time < 8) {
        const progress = (time - 4) / 4; // 0 at 4am, 1 at 8am
        return { phase: 'dawn', progress };
    }
    // Day: 8:00 to 18:00 (6pm)
    if (time >= 8 && time < 18) {
        return { phase: 'day', progress: 1 };
    }
    // Dusk: 18:00 to 21:00 (3 hour transition - twilight)
    const progress = (time - 18) / 3; // 0 at 6pm, 1 at 9pm
    return { phase: 'dusk', progress };
};

/**
 * Provides current time, date, and derived theme (day/night).
 * Updates every second.
 * In 'auto' (Circadian) mode, applies gradual phase-based transitions.
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

    // Get circadian phase info
    const { phase: circadianPhase, progress: phaseProgress } = getCircadianPhase(hours, minutes);

    // Only DAY phase uses light mode - night, dawn, and dusk all use dark mode
    const shouldBeDark = circadianPhase !== 'day';
    const autoTheme: Theme = shouldBeDark ? 'night' : 'day';

    // Use override if set, otherwise use auto theme based on time
    const theme: Theme = themeOverride === 'auto' ? autoTheme : themeOverride;

    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(" AM", "").replace(" PM", "");
    const dateString = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

    useEffect(() => {
        const root = document.documentElement;

        // Apply dark class for night themes
        if (theme === 'night' || theme === 'deep-night') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Handle manual deep-night theme
        if (themeOverride === 'deep-night') {
            root.dataset.circadianPhase = 'night'; // Uses deep night CSS
        }

        // Only apply circadian styling in auto mode
        if (themeOverride === 'auto') {
            // Set phase as data attribute for potential CSS targeting
            root.dataset.circadianPhase = circadianPhase;

            // Apply phase-specific overlay for color transitions
            // Night: deep dark overlay
            // Dawn: warm orange-pink overlay fading out
            // Day: no overlay
            // Dusk: warm golden-purple overlay fading in
            let overlayOpacity = 0;
            let overlayHue = 0; // 0 = warm orange, 270 = purple

            switch (circadianPhase) {
                case 'night':
                    overlayOpacity = 0.12; // Slight darkening overlay
                    overlayHue = 240; // Blue-ish
                    break;
                case 'dawn':
                    overlayOpacity = 0.08 * (1 - phaseProgress); // Fades out as day approaches
                    overlayHue = 30; // Warm orange
                    break;
                case 'day':
                    overlayOpacity = 0;
                    break;
                case 'dusk':
                    overlayOpacity = 0.06 * phaseProgress; // Fades in as night approaches
                    overlayHue = 280; // Purple-ish
                    break;
            }

            root.style.setProperty('--circadian-overlay-opacity', overlayOpacity.toFixed(3));
            root.style.setProperty('--circadian-overlay-hue', overlayHue.toString());
            root.style.setProperty('--circadian-phase-progress', phaseProgress.toFixed(2));
        } else {
            // Reset when using manual theme
            delete root.dataset.circadianPhase;
            root.style.setProperty('--circadian-overlay-opacity', '0');
            root.style.setProperty('--circadian-overlay-hue', '0');
            root.style.setProperty('--circadian-phase-progress', '1');
        }
    }, [theme, themeOverride, circadianPhase, phaseProgress]);

    return { timeString, dateString, theme, date, circadianPhase, phaseProgress };
};
