import React from 'react';
import { useAppContext } from '../../contexts/AppContext';

export const ThemeToggle: React.FC = () => {
    const { themeOverride, setThemeOverride } = useAppContext();

    const cycleTheme = () => {
        if (themeOverride === 'auto') setThemeOverride('day');
        else if (themeOverride === 'day') setThemeOverride('night');
        else setThemeOverride('auto');
    };

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
        }
    };

    return (
        <button
            onClick={cycleTheme}
            className="fixed top-6 left-6 z-40 p-3 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-day-text-primary dark:text-night-text-primary shadow-lg hover:bg-white/20 dark:hover:bg-white/10 transition-all"
            title={`Theme: ${themeOverride.charAt(0).toUpperCase() + themeOverride.slice(1)}`}
        >
            {getIcon()}
        </button>
    );
};
