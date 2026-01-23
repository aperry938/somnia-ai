import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamSupernaturalProps {
    dreams: Dream[];
}

const SUPERNATURAL_KEYWORDS: Record<string, string[]> = {
    'Magic': ['magic', 'magical', 'spell', 'wizard', 'witch', 'wand', 'potion', 'supernatural'],
    'Ghosts': ['ghost', 'spirit', 'haunted', 'apparition', 'phantom', 'dead person'],
    'Monsters': ['monster', 'creature', 'demon', 'beast', 'dragon', 'vampire', 'werewolf'],
    'Powers': ['power', 'telekinesis', 'telepathy', 'invisible', 'superhuman', 'ability'],
    'Aliens': ['alien', 'ufo', 'spaceship', 'extraterrestrial', 'outer space', 'spacecraft'],
    'Time': ['time travel', 'future', 'past', 'different era', 'time machine']
};

export const DreamSupernatural: React.FC<DreamSupernaturalProps> = React.memo(({ dreams }) => {
    const supernatural = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { type: string; count: number }[] = [];

        Object.entries(SUPERNATURAL_KEYWORDS).forEach(([type, keywords]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = d.dreamText?.toLowerCase() ?? '';
                if (text && keywords.some(kw => text.includes(kw))) count++;
            });
            if (count > 0) counts.push({ type, count });
        });

        return counts.sort((a, b) => b.count - a.count);
    }, [dreams]);

    if (supernatural.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 dark:border-indigo-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Supernatural Elements</h3>
            <div className="flex flex-wrap gap-2">
                {supernatural.map(({ type, count }) => (
                    <span key={type} className="px-3 py-1 bg-purple-500/20 dark:bg-indigo-500/20 rounded-full text-sm">
                        {type} ({count})
                    </span>
                ))}
            </div>
        </div>
    );
});
