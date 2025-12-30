import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamSensesProps {
    dreams: Dream[];
}

const SENSE_KEYWORDS: Record<string, { keywords: string[]; icon: string }> = {
    'Sight': { keywords: ['see', 'saw', 'look', 'looking', 'watch', 'watching', 'color', 'bright', 'dark', 'vision'], icon: '👁️' },
    'Sound': { keywords: ['hear', 'heard', 'sound', 'voice', 'music', 'noise', 'loud', 'quiet', 'silence', 'scream'], icon: '👂' },
    'Touch': { keywords: ['feel', 'felt', 'touch', 'touched', 'soft', 'hard', 'cold', 'warm', 'smooth', 'rough'], icon: '✋' },
    'Smell': { keywords: ['smell', 'scent', 'odor', 'fragrance', 'stink', 'fresh', 'perfume'], icon: '👃' },
    'Taste': { keywords: ['taste', 'tasted', 'eat', 'eating', 'food', 'sweet', 'bitter', 'sour', 'delicious'], icon: '👅' }
};

export const DreamSenses: React.FC<DreamSensesProps> = ({ dreams }) => {
    const senses = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { sense: string; count: number; icon: string }[] = [];

        Object.entries(SENSE_KEYWORDS).forEach(([sense, { keywords, icon }]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = d.dreamText.toLowerCase();
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            counts.push({ sense, count, icon });
        });

        return counts.sort((a, b) => b.count - a.count);
    }, [dreams]);

    const maxCount = Math.max(...senses.map(s => s.count), 1);
    const hasData = senses.some(s => s.count > 0);

    if (!hasData) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Senses</h3>

            <div className="space-y-2">
                {senses.map(({ sense, count, icon }) => (
                    <div key={sense} className="flex items-center gap-2">
                        <span className="text-lg w-6">{icon}</span>
                        <span className="w-12 text-sm">{sense}</span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-full bg-day-accent dark:bg-night-accent rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs text-day-text-secondary dark:text-night-text-secondary w-6">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
