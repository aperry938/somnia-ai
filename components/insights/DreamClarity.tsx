import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamClarityProps {
    dreams: Dream[];
}

const CLARITY_LEVELS = {
    vivid: ['vivid', 'clear', 'detailed', 'sharp', 'distinct', 'remember clearly', 'every detail'],
    normal: ['normal', 'usual', 'standard', 'typical'],
    hazy: ['hazy', 'fuzzy', 'blurry', 'vague', 'unclear', 'foggy', 'fragments', 'barely remember']
};

export const DreamClarity: React.FC<DreamClarityProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let vivid = 0, normal = 0, hazy = 0;

        dreams.forEach(d => {
            const text = (d.dreamText || '').toLowerCase();
            if (CLARITY_LEVELS.vivid.some(kw => text.includes(kw))) vivid++;
            else if (CLARITY_LEVELS.hazy.some(kw => text.includes(kw))) hazy++;
            else normal++;
        });

        const total = dreams.length;
        const vividPct = Math.round((vivid / total) * 100);
        const hazyPct = Math.round((hazy / total) * 100);
        // Ensure percentages sum to 100 by calculating normal as remainder
        const normalPct = 100 - vividPct - hazyPct;

        // Determine dominant: compare raw counts, not percentages
        let dominant: 'Vivid' | 'Normal' | 'Hazy' = 'Normal';
        if (vivid >= normal && vivid >= hazy) dominant = 'Vivid';
        else if (hazy >= normal && hazy >= vivid) dominant = 'Hazy';

        return {
            vivid: vividPct,
            normal: Math.max(0, normalPct), // Ensure non-negative due to rounding
            hazy: hazyPct,
            dominant
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Clarity</h3>

            <div className="text-center mb-3">
                <span className={`text-xl font-bold ${stats.dominant === 'Vivid' ? 'text-green-500' : stats.dominant === 'Hazy' ? 'text-gray-500' : 'text-blue-500'}`}>
                    {stats.dominant} Dreams
                </span>
            </div>

            <div className="flex h-4 rounded-full overflow-hidden">
                <div className="bg-green-500" style={{ width: `${stats.vivid}%` }} title={`Vivid: ${stats.vivid}%`} />
                <div className="bg-blue-500" style={{ width: `${stats.normal}%` }} title={`Normal: ${stats.normal}%`} />
                <div className="bg-gray-400" style={{ width: `${stats.hazy}%` }} title={`Hazy: ${stats.hazy}%`} />
            </div>

            <div className="flex justify-between text-xs mt-1 text-day-text-secondary dark:text-night-text-secondary">
                <span>Vivid {stats.vivid}%</span>
                <span>Normal {stats.normal}%</span>
                <span>Hazy {stats.hazy}%</span>
            </div>
        </div>
    );
});
