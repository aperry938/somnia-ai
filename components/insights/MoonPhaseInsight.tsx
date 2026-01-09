import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface MoonPhaseInsightProps {
    dreams: Dream[];
}

// Simple moon phase calculation
const getMoonPhase = (date: Date): string => {
    const lunation = 29.53; // days
    const known = new Date('2024-01-11'); // Known new moon
    const diff = (date.getTime() - known.getTime()) / (1000 * 60 * 60 * 24);
    const phase = ((diff % lunation) + lunation) % lunation;

    if (phase < 3.7) return 'New Moon';
    if (phase < 7.4) return 'Waxing Crescent';
    if (phase < 11.1) return 'First Quarter';
    if (phase < 14.8) return 'Waxing Gibbous';
    if (phase < 18.5) return 'Full Moon';
    if (phase < 22.2) return 'Waning Gibbous';
    if (phase < 25.9) return 'Last Quarter';
    return 'Waning Crescent';
};

const PHASES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];

export const MoonPhaseInsight: React.FC<MoonPhaseInsightProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 10) return null;

        const phaseCounts: Record<string, number> = {};
        PHASES.forEach(p => phaseCounts[p] = 0);

        dreams.forEach(d => {
            const phase = getMoonPhase(new Date(d.timestamp));
            phaseCounts[phase] = (phaseCounts[phase] ?? 0) + 1;
        });

        const sorted = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1]);
        return { phaseCounts, mostActive: sorted[0]?.[0] ?? 'Unknown', leastActive: sorted[sorted.length - 1]?.[0] ?? 'Unknown' };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-slate-500/10 to-indigo-500/10 border border-slate-500/20 dark:border-indigo-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Moon Phase Activity</h3>

            <div className="flex justify-between items-center mb-2">
                {PHASES.slice(0, 4).map(phase => (
                    <div key={phase} className="text-center flex-1">
                        <div className="text-lg">{stats.phaseCounts[phase]}</div>
                        <div className="text-[8px] text-day-text-secondary dark:text-night-text-secondary truncate">{phase}</div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center">
                {PHASES.slice(4).map(phase => (
                    <div key={phase} className="text-center flex-1">
                        <div className="text-lg">{stats.phaseCounts[phase]}</div>
                        <div className="text-[8px] text-day-text-secondary dark:text-night-text-secondary truncate">{phase}</div>
                    </div>
                ))}
            </div>

            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary mt-3">
                Most dreams on <span className="font-bold">{stats.mostActive}</span>
            </p>
        </div>
    );
};
