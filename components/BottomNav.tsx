import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Page } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { isPremium } from '../services/secureSubscriptionService';
import { useTheme } from '../hooks/useTheme';
import haptics from '../services/hapticsService';

interface BottomNavProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

// Static icon components - memoized to prevent recreation
const AlarmsIcon = React.memo(() => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
));

const SleepIcon = React.memo(() => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
));

const ChronicleIcon = React.memo(() => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
));

const InsightsIcon = React.memo(() => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
));

const BottomNavComponent: React.FC<BottomNavProps> = ({ currentPage, setCurrentPage }) => {
    const { getUnreadDreamCount, markDreamsAsSeen } = useAppContext();
    const { theme } = useTheme();
    const unreadCount = getUnreadDreamCount();
    const userIsPremium = isPremium();

    // Memoized handler to prevent recreation on each render
    const handleNavClick = useCallback((page: Page) => {
        haptics.light();
        // Mark dreams as seen when Chronicle tab is clicked
        if (page === 'chronicle') {
            markDreamsAsSeen();
        }
        setCurrentPage(page);
    }, [markDreamsAsSeen, setCurrentPage]);

    // Memoize navItems to prevent recreation on each render
    const navItems = useMemo(() => [
        { page: 'alarms' as Page, label: 'Alarms', icon: <AlarmsIcon /> },
        { page: 'sleep' as Page, label: 'Sleep', icon: <SleepIcon /> },
        { page: 'chronicle' as Page, label: 'Chronicle', icon: <ChronicleIcon />, badge: unreadCount > 0 ? unreadCount : undefined },
        { page: 'insights' as Page, label: 'Insights', icon: <InsightsIcon />, isPro: !userIsPremium },
    ], [unreadCount, userIsPremium]);

    // Theme-specific styling - Sleep mode uses warm amber/orange tones (no blue light)
    const themeStyles = {
        day: {
            nav: 'bg-gradient-to-t from-slate-100/95 via-slate-50/90 to-white/80 border-slate-200/50 shadow-[0_-8px_32px_rgba(99,102,241,0.1)]',
            activeTab: 'bg-indigo-100/80 text-indigo-700 shadow-[0_0_20px_rgba(99,102,241,0.3)]',
            inactiveTab: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50',
            activeGlow: 'drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]',
            activeDot: 'bg-indigo-500 shadow-[0_0_8px_2px_rgba(99,102,241,0.8)]',
            badge: 'from-indigo-500 to-purple-500',
        },
        night: {
            nav: 'bg-gradient-to-t from-slate-900/95 via-slate-800/90 to-slate-700/80 border-white/10 shadow-[0_-8px_32px_rgba(99,102,241,0.15)]',
            activeTab: 'bg-white/10 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]',
            inactiveTab: 'text-white/50 hover:text-white/70 hover:bg-white/5',
            activeGlow: 'drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]',
            activeDot: 'bg-purple-400 shadow-[0_0_8px_2px_rgba(168,85,247,0.8)]',
            badge: 'from-indigo-500 to-purple-500',
        },
        sleep: {
            // Warm amber/orange tones - NO BLUE LIGHT for sleep mode
            nav: 'bg-gradient-to-t from-stone-950/95 via-stone-900/90 to-stone-800/80 border-amber-900/20 shadow-[0_-8px_32px_rgba(217,119,6,0.1)]',
            activeTab: 'bg-amber-900/30 text-amber-200 shadow-[0_0_20px_rgba(217,119,6,0.3)]',
            inactiveTab: 'text-amber-200/40 hover:text-amber-200/60 hover:bg-amber-900/20',
            activeGlow: 'drop-shadow-[0_0_8px_rgba(217,119,6,0.6)]',
            activeDot: 'bg-amber-500 shadow-[0_0_8px_2px_rgba(217,119,6,0.8)]',
            badge: 'from-amber-600 to-orange-600',
        },
    };

    const styles = themeStyles[theme];

    return (
        <nav
            className={`fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-3 pt-3 pb-[calc(0.75rem+var(--safe-area-inset-bottom))] 
                       backdrop-blur-xl border-t transition-colors duration-500
                       select-none ${styles.nav}`}
            aria-label="Main navigation"
            onDragStart={(e) => e.preventDefault()}
        >
            {navItems.map(item => (
                <motion.button
                    key={item.page}
                    onClick={() => handleNavClick(item.page)}
                    aria-label={`${item.label}${item.badge ? `, ${item.badge} new items` : ''}${item.isPro ? ' (Premium)' : ''}`}
                    aria-current={currentPage === item.page ? 'page' : undefined}
                    className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1.5 rounded-xl transition-colors duration-300 relative
                        ${currentPage === item.page
                            ? styles.activeTab
                            : styles.inactiveTab
                        }`}
                    whileTap={{ scale: 0.95 }}
                    animate={currentPage === item.page ? { scale: 1.05 } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                    <div className="relative">
                        <motion.span
                            aria-hidden="true"
                            className={currentPage === item.page ? styles.activeGlow : ''}
                            animate={currentPage === item.page ? { y: -2 } : { y: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                            {item.icon}
                        </motion.span>
                        {item.badge && (
                            <motion.span
                                className={`absolute -top-1 -right-2 bg-gradient-to-r ${styles.badge} text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-lg`}
                                aria-hidden="true"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                            >
                                {item.badge > 99 ? '99+' : item.badge}
                            </motion.span>
                        )}
                        {item.isPro && (
                            <span className="absolute -top-1 -right-2 inline-flex items-center gap-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] px-1 py-0.5 rounded-full font-bold shadow-lg" aria-hidden="true">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                PRO
                            </span>
                        )}
                    </div>
                    <span className={`text-xs mt-1 ${currentPage === item.page ? 'font-semibold' : ''}`} aria-hidden="true">
                        {item.label}
                    </span>
                </motion.button>
            ))}
        </nav>
    );
};

// Memoize the entire BottomNav to prevent re-renders when parent state changes
export const BottomNav = React.memo(BottomNavComponent);
