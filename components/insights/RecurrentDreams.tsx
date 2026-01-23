import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface RecurrentDreamsProps {
    dreams: Dream[];
}

export const RecurrentDreams: React.FC<RecurrentDreamsProps> = React.memo(({ dreams }) => {
    const recurrent = useMemo(() => {
        if (dreams.length < 10) return [];

        // Find similar dreams based on word overlap
        // Cache word sets for each dream to avoid recomputation (O(n) instead of O(n^2))
        const dreamWordSets = new Map<number, Set<string>>();
        const getWordSet = (dream: Dream): Set<string> => {
            let wordSet = dreamWordSets.get(dream.id);
            if (!wordSet) {
                const text = (dream.dreamText || '').toLowerCase();
                wordSet = new Set(text.split(/\s+/).filter(w => w.length > 4));
                dreamWordSets.set(dream.id, wordSet);
            }
            return wordSet;
        };

        const groups: { representative: Dream; count: number; ids: number[]; wordSet: Set<string> }[] = [];

        dreams.forEach(dream => {
            const words = getWordSet(dream);

            let matched = false;
            for (const group of groups) {
                let overlap = 0;
                words.forEach(w => { if (group.wordSet.has(w)) overlap++; });

                if (overlap >= 5) {
                    group.count++;
                    group.ids.push(dream.id);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                groups.push({ representative: dream, count: 1, ids: [dream.id], wordSet: words });
            }
        });

        return groups.filter(g => g.count >= 2).sort((a, b) => b.count - a.count).slice(0, 3);
    }, [dreams]);

    if (recurrent.length === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Recurrent Dream Patterns</h3>
            <div className="space-y-2">
                {recurrent.map(({ representative, count }) => (
                    <div key={representative.id} className="p-2 bg-white/30 dark:bg-black/20 rounded-lg">
                        <div className="flex justify-between mb-1">
                            <span className="font-medium text-sm">{representative.title || 'Untitled'}</span>
                            <span className="text-xs bg-day-accent/10 dark:bg-night-accent/10 text-day-accent dark:text-night-accent px-2 py-0.5 rounded-full">{count}x similar</span>
                        </div>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary line-clamp-1">{representative.dreamText}</p>
                    </div>
                ))}
            </div>
        </div>
    );
});
