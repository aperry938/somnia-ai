import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamColorsProps {
    dreams: Dream[];
}

const COLOR_KEYWORDS: Record<string, { keywords: string[]; hex: string }> = {
    'Red': { keywords: ['red', 'crimson', 'scarlet', 'blood', 'ruby', 'fire'], hex: '#ef4444' },
    'Blue': { keywords: ['blue', 'ocean', 'sky', 'azure', 'navy', 'sapphire'], hex: '#3b82f6' },
    'Green': { keywords: ['green', 'grass', 'forest', 'emerald', 'jade', 'nature'], hex: '#22c55e' },
    'Yellow': { keywords: ['yellow', 'gold', 'sun', 'bright', 'golden', 'sunshine'], hex: '#eab308' },
    'Purple': { keywords: ['purple', 'violet', 'lavender', 'amethyst', 'magenta'], hex: '#a855f7' },
    'Black': { keywords: ['black', 'dark', 'shadow', 'darkness', 'night', 'void'], hex: '#1f2937' },
    'White': { keywords: ['white', 'light', 'bright', 'snow', 'pure', 'pale'], hex: '#f3f4f6' },
    'Orange': { keywords: ['orange', 'sunset', 'amber', 'flame', 'copper'], hex: '#f97316' }
};

export const DreamColors: React.FC<DreamColorsProps> = ({ dreams }) => {
    const colors = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { color: string; count: number; hex: string }[] = [];

        Object.entries(COLOR_KEYWORDS).forEach(([color, { keywords, hex }]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = d.dreamText.toLowerCase();
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            if (count > 0) counts.push({ color, count, hex });
        });

        return counts.sort((a, b) => b.count - a.count);
    }, [dreams]);

    if (colors.length === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Dream Colors
            </h3>

            <div className="flex flex-wrap gap-2">
                {colors.map(({ color, count, hex }) => (
                    <div key={color} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-day-border dark:border-night-border">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hex }} />
                        <span className="text-sm">{color}</span>
                        <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">({count})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
