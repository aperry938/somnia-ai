import React from 'react';
import { Dream } from '../../types';

interface MilestoneTrackerProps {
    dreams: Dream[];
}

const MILESTONES = [
    { count: 7, title: 'First Week', description: 'Logged dreams for a week', icon: '🌱' },
    { count: 30, title: 'Month Master', description: 'One month of dreaming', icon: '🌙' },
    { count: 50, title: 'Dream Collector', description: '50 dreams captured', icon: '⭐' },
    { count: 100, title: 'Century Dreamer', description: '100 dreams logged', icon: '💯' },
    { count: 365, title: 'Year of Dreams', description: 'A full year of journaling', icon: '🏆' },
    { count: 500, title: 'Dream Sage', description: '500 dreams mastered', icon: '🔮' }
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
                        <div key={m.count} className="px-2 py-1 bg-amber-500/20 dark:bg-yellow-500/20 rounded-full text-sm" title={m.description}>
                            {m.icon} {m.title}
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
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary text-center mt-2">
                        {next.count - count} more dreams to unlock {next.icon}
                    </p>
                </div>
            )}
        </div>
    );
};
