import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamConsistencyProps {
    dreams: Dream[];
}

export const DreamConsistency: React.FC<DreamConsistencyProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 7) return null;

        const dates = new Set<string>();
        dreams.forEach(d => {
            dates.add(new Date(d.timestamp).toDateString());
        });

        // Calculate consistency over last 30 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let daysInLast30 = 0;

        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            if (dates.has(d.toDateString())) daysInLast30++;
        }

        const consistency = Math.round((daysInLast30 / 30) * 100);
        const rating = consistency >= 80 ? 'Excellent' : consistency >= 60 ? 'Good' : consistency >= 40 ? 'Fair' : 'Needs Work';

        return { daysInLast30, consistency, rating };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 dark:border-teal-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Journaling Consistency</h3>

            <div className="text-center mb-3">
                <div className="text-4xl font-bold text-emerald-600 dark:text-teal-400">{stats.consistency}%</div>
                <div className="text-sm text-day-text-secondary dark:text-night-text-secondary">{stats.rating}</div>
            </div>

            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full mb-2">
                <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                    style={{ width: `${stats.consistency}%` }}
                />
            </div>

            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary">
                {stats.daysInLast30} days logged in the last 30 days
            </p>
        </div>
    );
};
