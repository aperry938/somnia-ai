import React from 'react';
import { Dream } from '../../types';

interface MilestoneTrackerProps {
    dreams: Dream[];
}

// SVG icons for milestones
const MilestoneIcon: React.FC<{ type: string; className?: string }> = ({ type, className = "h-4 w-4" }) => {
    const icons: Record<string, React.ReactNode> = {
        seedling: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V6M5 12c0-3.866 3.582-7 8-7s8 3.134 8 7" />
            </svg>
        ),
        moon: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
        ),
        star: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
        ),
        badge: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
        ),
        trophy: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
        crystal: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
        ),
    };
    return <>{icons[type] || icons.star}</>;
};

const MILESTONES = [
    { count: 7, title: 'First Week', description: 'Logged dreams for a week', iconType: 'seedling' },
    { count: 30, title: 'Month Master', description: 'One month of dreaming', iconType: 'moon' },
    { count: 50, title: 'Dream Collector', description: '50 dreams captured', iconType: 'star' },
    { count: 100, title: 'Century Dreamer', description: '100 dreams logged', iconType: 'badge' },
    { count: 365, title: 'Year of Dreams', description: 'A full year of journaling', iconType: 'trophy' },
    { count: 500, title: 'Dream Sage', description: '500 dreams mastered', iconType: 'crystal' }
];

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({ dreams }) => {
    const count = dreams.length;
    const achieved = MILESTONES.filter(m => count >= m.count);
    const next = MILESTONES.find(m => count < m.count);

    if (count < 3) return null;

    return (
        <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 dark:border-yellow-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Milestones
            </h3>

            {/* Achieved milestones */}
            {achieved.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {achieved.map(m => (
                        <div key={m.count} className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 dark:bg-yellow-500/20 rounded-full text-sm" title={m.description}>
                            <MilestoneIcon type={m.iconType} className="h-4 w-4 text-amber-500" />
                            {m.title}
                        </div>
                    ))}
                </div>
            )}

            {/* Progress to next */}
            {next && (
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span>Progress to {next.title}</span>
                        <span className="text-day-text-secondary dark:text-night-text-secondary">{count}/{next.count}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full" style={{ width: `${(count / next.count) * 100}%` }} />
                    </div>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary text-center mt-2 flex items-center justify-center gap-1">
                        {next.count - count} more dreams to unlock <MilestoneIcon type={next.iconType} className="h-3.5 w-3.5 text-amber-500" />
                    </p>
                </div>
            )}
        </div>
    );
};
