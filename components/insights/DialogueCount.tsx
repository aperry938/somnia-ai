import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DialogueCountProps {
    dreams: Dream[];
}

export const DialogueCount: React.FC<DialogueCountProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let dreamsWithDialogue = 0;
        let totalQuotes = 0;

        dreams.forEach(d => {
            const quotes = (d.dreamText.match(/[""]|said|asked|replied|yelled|whispered|told/gi) || []).length;
            if (quotes > 0) dreamsWithDialogue++;
            totalQuotes += quotes;
        });

        return {
            dreamsWithDialogue,
            percentage: Math.round((dreamsWithDialogue / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Dialogue</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-day-accent dark:text-night-accent">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with dialogue</div>
                <div className="text-sm mt-2">{stats.dreamsWithDialogue} of {dreams.length} dreams</div>
            </div>
        </div>
    );
};
