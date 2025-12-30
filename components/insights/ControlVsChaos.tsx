import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface ControlVsChaosProps {
    dreams: Dream[];
}

const CONTROL_KEYWORDS = ['control', 'decide', 'choose', 'power', 'fly', 'lead', 'command', 'direct', 'lucid', 'aware'];
const CHAOS_KEYWORDS = ['chaos', 'confused', 'lost', 'chase', 'escape', 'trapped', 'helpless', 'random', 'strange', 'weird'];

export const ControlVsChaos: React.FC<ControlVsChaosProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let control = 0, chaos = 0;

        dreams.forEach(d => {
            const text = d.dreamText.toLowerCase();
            if (CONTROL_KEYWORDS.some(kw => text.includes(kw))) control++;
            if (CHAOS_KEYWORDS.some(kw => text.includes(kw))) chaos++;
        });

        const total = control + chaos || 1;

        return {
            control,
            chaos,
            controlPct: Math.round((control / total) * 100),
            style: control > chaos ? 'In Control' : chaos > control ? 'Chaotic' : 'Balanced'
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Control vs Chaos</h3>
            <div className="flex h-4 rounded-full overflow-hidden mb-3">
                <div className="bg-blue-500" style={{ width: `${stats.controlPct}%` }} />
                <div className="bg-red-500" style={{ width: `${100 - stats.controlPct}%` }} />
            </div>
            <div className="flex justify-between text-sm">
                <span><span className="font-bold text-blue-500">{stats.control}</span> Control</span>
                <span><span className="font-bold text-red-500">{stats.chaos}</span> Chaos</span>
            </div>
            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary mt-2">{stats.style}</p>
        </div>
    );
};
