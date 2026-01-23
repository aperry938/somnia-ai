import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface LucidProgressProps {
    dreams: Dream[];
}

const LUCID_INDICATORS = [
    'lucid', 'aware', 'realized', 'control', 'flying',
    'knew i was dreaming', 'controlled the dream', 'woke up in dream'
];

/**
 * Track progress towards lucid dreaming based on keyword detection.
 */
export const LucidDreamProgress: React.FC<LucidProgressProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length === 0) return null;

        let lucidCount = 0;
        const lucidDreams: { date: Date; title: string }[] = [];

        dreams.forEach(dream => {
            const text = (dream.dreamText || '').toLowerCase();
            const tags = dream.tags?.map(t => t.toLowerCase()) || [];

            const isLucid = LUCID_INDICATORS.some(ind => text.includes(ind)) ||
                tags.includes('lucid');

            if (isLucid) {
                lucidCount++;
                lucidDreams.push({
                    date: new Date(dream.timestamp),
                    title: dream.title || 'Untitled'
                });
            }
        });

        const percentage = Math.round((lucidCount / dreams.length) * 100);
        const recentLucid = lucidDreams.slice(0, 3);

        // Calculate streak to next milestone
        const milestones = [1, 5, 10, 25, 50, 100];
        const nextMilestone = milestones.find(m => m > lucidCount) || lucidCount + 10;

        return {
            lucidCount,
            totalDreams: dreams.length,
            percentage,
            recentLucid,
            nextMilestone,
            progress: Math.round((lucidCount / nextMilestone) * 100)
        };
    }, [dreams]);

    if (!stats || dreams.length < 3) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 dark:border-purple-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Lucid Dream Training
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-purple-400">{stats.lucidCount}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Lucid Dreams</p>
                </div>
                <div>
                    <p className="text-2xl font-bold">{stats.percentage}%</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Lucidity Rate</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.nextMilestone}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Next Milestone</p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
                <div className="flex justify-between text-xs text-day-text-secondary dark:text-night-text-secondary mb-1">
                    <span>Progress to {stats.nextMilestone} lucid dreams</span>
                    <span>{stats.progress}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={stats.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to ${stats.nextMilestone} lucid dreams: ${stats.progress}%`}>
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${stats.progress}%` }}
                        aria-hidden="true"
                    />
                </div>
            </div>

            {/* Recent lucid dreams */}
            {stats.recentLucid.length > 0 && (
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                    <p className="font-medium mb-1">Recent lucid dreams:</p>
                    <ul className="space-y-0.5">
                        {stats.recentLucid.map((ld, i) => (
                            <li key={i} className="truncate">
                                • {ld.date.toLocaleDateString()}: {ld.title}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
