import React from 'react';
import { Page, Theme } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useClock } from '../hooks/useClock';

interface NavItemProps {
    page: Page;
    label: string;
    icon: React.ReactElement;
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

const NavItem: React.FC<NavItemProps> = ({ page, label, icon, currentPage, setCurrentPage }) => {
    const isActive = currentPage === page;
    return (
        <button
            onClick={() => setCurrentPage(page)}
            className={`flex flex-col items-center w-16 py-1 min-h-[48px] rounded-lg transition-colors duration-300 ${isActive ? 'text-day-accent dark:text-night-accent' : 'text-day-text-secondary dark:text-night-text-secondary'}`}
        >
            {icon}
            <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>{label}</span>
        </button>
    );
};

// Theme toggle button component
const ThemeToggle: React.FC = () => {
    const { themeOverride, setThemeOverride } = useAppContext();
    const { theme } = useClock();

    const cycleTheme = () => {
        // Cycle: auto -> day -> night -> auto
        if (themeOverride === 'auto') {
            setThemeOverride('day');
        } else if (themeOverride === 'day') {
            setThemeOverride('night');
        } else {
            setThemeOverride('auto');
        }
    };

    // Icon based on current effective theme
    const icon = theme === 'night' ? (
        // Moon icon
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
    ) : (
        // Sun icon
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );

    // Label based on override mode
    const label = themeOverride === 'auto' ? 'Auto' : themeOverride === 'day' ? 'Day' : 'Night';

    return (
        <button
            onClick={cycleTheme}
            className="flex flex-col items-center w-12 py-1 rounded-lg transition-colors duration-300 text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent"
            title={`Theme: ${label}`}
            aria-label={`Switch to ${label === 'Auto' ? 'Day' : label === 'Day' ? 'Night' : 'Auto'} Theme`}
        >
            {icon}
            <span className="text-[10px] mt-0.5 opacity-70">{label}</span>
        </button>
    );
};

interface BottomNavProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, setCurrentPage }) => {
    const { dreams } = useAppContext();

    const navItems = [
        { page: 'alarms' as Page, label: 'Alarms', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { page: 'sleep' as Page, label: 'Sleep', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> },
        { page: 'chronicle' as Page, label: 'Chronicle', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v11.494m-9-5.747h18" /></svg>, badge: dreams.length > 0 ? dreams.length : undefined },
        { page: 'insights' as Page, label: 'Insights', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> },
    ];

    return (
        <nav className="flex justify-around items-center p-2 pb-3 safe-area-bottom bg-day-card-bg/80 dark:bg-night-card-bg/80 backdrop-blur-lg border-t border-day-border dark:border-night-border rounded-t-lg">
            {navItems.map(item => (
                <button
                    key={item.page}
                    onClick={() => setCurrentPage(item.page)}
                    className={`flex flex-col items-center w-16 py-1 rounded-lg transition-colors duration-300 relative ${currentPage === item.page ? 'text-day-accent dark:text-night-accent' : 'text-day-text-secondary dark:text-night-text-secondary'}`}
                >
                    <div className="relative">
                        {item.icon}
                        {item.badge && (
                            <span className="absolute -top-1 -right-1 bg-day-accent dark:bg-night-accent text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                {item.badge > 99 ? '99+' : item.badge}
                            </span>
                        )}
                    </div>
                    <span className={`text-xs mt-1 ${currentPage === item.page ? 'font-medium' : ''}`}>{item.label}</span>
                </button>
            ))}
            <div className="border-l border-day-border dark:border-night-border h-8 mx-1" />
            <ThemeToggle />
            <button
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
                className="w-11 h-11 flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent opacity-50 hover:opacity-100 transition-opacity rounded-full active:bg-black/5 dark:active:bg-white/5"
                title="Keyboard shortcuts"
                aria-label="Show keyboard shortcuts"
            >
                <span className="text-xs font-mono">?</span>
            </button>
            <div className="border-l border-day-border dark:border-night-border h-8 mx-1" />
            <button
                onClick={() => setCurrentPage('privacy')}
                className="text-[10px] text-day-text-secondary/50 dark:text-night-text-secondary/50 hover:text-day-accent dark:hover:text-night-accent transition-colors"
            >
                Privacy
            </button>
            <button
                onClick={() => setCurrentPage('terms')}
                className="text-[10px] text-day-text-secondary/50 dark:text-night-text-secondary/50 hover:text-day-accent dark:hover:text-night-accent transition-colors"
            >
                Terms
            </button>
        </nav>
    );
};