import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Theme } from '../../types';

export const ThemeToggle: React.FC = () => {
    const { themeOverride, setThemeOverride } = useAppContext();
    const [showLabel, setShowLabel] = useState(false);
    const [labelText, setLabelText] = useState('');

    const getThemeLabel = (theme: string) => {
        switch (theme) {
            case 'auto': return 'Auto';
            case 'day': return 'Light';
            case 'night': return 'Dark';
            case 'sleep': return 'Sleep';
            default: return '';
        }
    };

    const cycleTheme = () => {
        let nextTheme: Theme | 'auto';
        if (themeOverride === 'auto') nextTheme = 'day';
        else if (themeOverride === 'day') nextTheme = 'night';
        else if (themeOverride === 'night') nextTheme = 'sleep';
        else nextTheme = 'auto';

        setThemeOverride(nextTheme);
        setLabelText(getThemeLabel(nextTheme));
        setShowLabel(true);
    };

    // Hide label after 1.5 seconds
    useEffect(() => {
        if (showLabel) {
            const timeout = setTimeout(() => setShowLabel(false), 1500);
            return () => clearTimeout(timeout);
        }
    }, [showLabel]);

    const getIcon = () => {
        switch (themeOverride) {
            case 'auto':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'day':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                );
            case 'night':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                );
            case 'sleep':
                // Bed icon for sleep mode (zero blue light)
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                );
        }
    };

    return (
        <>
            <button
                onClick={cycleTheme}
                aria-label={`Toggle theme, currently ${themeOverride}`}
                className="fixed top-[calc(0.5rem+var(--safe-area-inset-top))] left-4 z-40 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/5 dark:bg-black/20 backdrop-blur-md border border-black/10 dark:border-white/10 text-day-text-primary dark:text-night-text-primary shadow-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                title={`Theme: ${themeOverride.charAt(0).toUpperCase() + themeOverride.slice(1)}`}
            >
                {getIcon()}
            </button>

            {/* Floating Label */}
            {showLabel && (
                <div className="fixed top-[calc(3.5rem+var(--safe-area-inset-top))] left-4 z-40 px-3 py-1.5 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-sm border border-black/10 dark:border-white/10 shadow-lg animate-fadeIn">
                    <span className="text-sm font-medium text-day-text-primary dark:text-night-text-primary">
                        {labelText}
                    </span>
                </div>
            )}
        </>
    );
};
