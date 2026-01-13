import React from 'react';
import { Page } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { isPremium } from '../services/secureSubscriptionService';

interface BottomNavProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, setCurrentPage }) => {
    const { getUnreadDreamCount, markDreamsAsSeen } = useAppContext();
    const unreadCount = getUnreadDreamCount();
    const userIsPremium = isPremium();

    const handleNavClick = (page: Page) => {
        // Mark dreams as seen when Chronicle tab is clicked
        if (page === 'chronicle') {
            markDreamsAsSeen();
        }
        setCurrentPage(page);
    };

    const navItems = [
        { page: 'alarms' as Page, label: 'Alarms', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { page: 'sleep' as Page, label: 'Sleep', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> },
        { page: 'chronicle' as Page, label: 'Chronicle', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, badge: unreadCount > 0 ? unreadCount : undefined },
        { page: 'insights' as Page, label: 'Insights', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>, isPro: !userIsPremium },
        { page: 'profile' as Page, label: 'Profile', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-2 pt-2 pb-[calc(0.5rem+var(--safe-area-inset-bottom))] bg-day-card-bg/95 dark:bg-night-card-bg/95 backdrop-blur-lg border-t border-day-border dark:border-night-border" aria-label="Main navigation">
            {navItems.map(item => (
                <button
                    key={item.page}
                    onClick={() => handleNavClick(item.page)}
                    aria-label={`${item.label}${item.badge ? `, ${item.badge} new items` : ''}${item.isPro ? ' (Premium)' : ''}`}
                    aria-current={currentPage === item.page ? 'page' : undefined}
                    className={`flex flex-col items-center justify-end flex-1 min-h-[40px] rounded-lg transition-colors duration-300 relative ${currentPage === item.page
                        ? 'text-day-accent dark:text-night-accent'
                        : 'text-day-text-secondary dark:text-night-text-secondary'
                        }`}
                >
                    <div className="relative">
                        <span aria-hidden="true">{item.icon}</span>
                        {item.badge && (
                            <span className="absolute -top-1 -right-2 bg-day-accent dark:bg-night-accent text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center" aria-hidden="true">
                                {item.badge > 99 ? '99+' : item.badge}
                            </span>
                        )}
                        {item.isPro && (
                            <span className="absolute -top-1 -right-2 inline-flex items-center gap-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] px-1 py-0.5 rounded-full font-bold" aria-hidden="true">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                PRO
                            </span>
                        )}
                    </div>
                    <span className={`text-sm mt-0.5 ${currentPage === item.page ? 'font-medium' : ''}`} aria-hidden="true">
                        {item.label}
                    </span>
                </button>
            ))}
        </nav>
    );
};
