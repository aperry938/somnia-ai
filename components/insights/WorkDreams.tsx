import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface WorkDreamsProps {
    dreams: Dream[];
}

const WORK = ['work', 'job', 'office', 'boss', 'colleague', 'meeting', 'deadline', 'project', 'email', 'presentation', 'interview'];

export const WorkDreams: React.FC<WorkDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const workDreams = dreams.filter(d =>
            WORK.some(w => d.dreamText.toLowerCase().includes(w))
        );

        return {
            count: workDreams.length,
            percentage: Math.round((workDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Work Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams about work</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
