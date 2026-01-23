import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamSymbolsProps {
    dreams: Dream[];
}

const DREAM_SYMBOLS: Record<string, { keywords: string[]; meaning: string }> = {
    'Water': { keywords: ['water', 'ocean', 'river', 'lake', 'swimming'], meaning: 'Emotions, subconscious' },
    'Flying': { keywords: ['fly', 'flying', 'float', 'soar'], meaning: 'Freedom, ambition' },
    'Falling': { keywords: ['fall', 'falling', 'drop'], meaning: 'Loss of control, anxiety' },
    'Teeth': { keywords: ['teeth', 'tooth', 'losing teeth'], meaning: 'Self-image, confidence' },
    'Snake': { keywords: ['snake', 'serpent'], meaning: 'Transformation, hidden fears' },
    'House': { keywords: ['house', 'home', 'room', 'building'], meaning: 'Self, psyche' },
    'Death': { keywords: ['death', 'dying', 'dead'], meaning: 'Endings, transitions' },
    'Baby': { keywords: ['baby', 'infant', 'child'], meaning: 'New beginnings, innocence' }
};

export const DreamSymbols: React.FC<DreamSymbolsProps> = ({ dreams }) => {
    const symbols = useMemo(() => {
        if (dreams.length < 3) return [];

        const found: { symbol: string; count: number; meaning: string }[] = [];

        Object.entries(DREAM_SYMBOLS).forEach(([symbol, { keywords, meaning }]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = (d.dreamText || '').toLowerCase();
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            if (count > 0) found.push({ symbol, count, meaning });
        });

        return found.sort((a, b) => b.count - a.count).slice(0, 5);
    }, [dreams]);

    if (symbols.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 dark:border-orange-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Symbols</h3>
            <div className="space-y-2">
                {symbols.map(({ symbol, count, meaning }) => (
                    <div key={symbol} className="flex justify-between items-center">
                        <div>
                            <span className="font-medium">{symbol}</span>
                            <span className="text-xs text-day-text-secondary dark:text-night-text-secondary ml-2">({count})</span>
                        </div>
                        <span className="text-xs text-amber-600 dark:text-orange-400">{meaning}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
