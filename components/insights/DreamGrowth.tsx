import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamGrowthProps {
    dreams: Dream[];
}

export const DreamGrowth: React.FC<DreamGrowthProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 10) return null;

        // Compare first half to second half
        const half = Math.floor(dreams.length / 2);
        const firstHalf = dreams.slice(half);
        const secondHalf = dreams.slice(0, half);

        const firstAvgWords = firstHalf.reduce((s, d) => s + d.dreamText.split(/\s+/).length, 0) / firstHalf.length;
        const secondAvgWords = secondHalf.reduce((s, d) => s + d.dreamText.split(/\s+/).length, 0) / secondHalf.length;

        const growth = firstAvgWords > 0 ? ((secondAvgWords - firstAvgWords) / firstAvgWords) * 100 : 0;

        return {
            firstAvgWords: Math.round(firstAvgWords),
            secondAvgWords: Math.round(secondAvgWords),
            growth: Math.round(growth),
            growing: growth > 10
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className={`bg-gradient-to-br ${stats.growing ? 'from-green-500/10 to-emerald-500/10 border-green-500/20 dark:border-emerald-500/30' : 'from-gray-500/10 to-slate-500/10 border-gray-500/20 dark:border-slate-500/30'} border rounded-xl p-4`}>
            <h3 className="font-serif text-lg mb-3">Detail Growth</h3>

            <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                    <div className="text-xl font-bold">{stats.firstAvgWords}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Earlier</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${stats.growing ? 'text-green-500' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stats.growing ? "M13 7l5 5m0 0l-5 5m5-5H6" : "M17 8l4 4m0 0l-4 4m4-4H3"} />
                </svg>
                <div className="text-center">
                    <div className="text-xl font-bold">{stats.secondAvgWords}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Recent</div>
                </div>
            </div>

            <div className={`text-center mt-3 text-sm font-bold ${stats.growing ? 'text-green-500' : 'text-gray-500'}`}>
                {stats.growth > 0 ? '+' : ''}{stats.growth}% detail growth
            </div>
        </div>
    );
});
