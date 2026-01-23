import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface NegationCountProps {
    dreams: Dream[];
}

export const NegationCount: React.FC<NegationCountProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let negations = 0;

        dreams.forEach(d => {
            const text = d.dreamText || '';
            negations += (text.match(/\b(not|n't|no|never|nothing|nobody|nowhere|none)\b/gi) || []).length;
        });

        const perDream = negations / dreams.length;

        return { negations, perDream: perDream.toFixed(1) };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Negations</h3>
            <div className="text-center">
                <div className="text-3xl font-bold">{stats.negations}</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Total (not, never, no...)</div>
                <div className="text-sm mt-2">{stats.perDream} per dream</div>
            </div>
        </div>
    );
});
