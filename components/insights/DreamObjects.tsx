import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamObjectsProps {
    dreams: Dream[];
}

const OBJECT_CATEGORIES: Record<string, string[]> = {
    'Vehicles': ['car', 'train', 'airplane', 'bus', 'boat', 'bicycle', 'motorcycle', 'ship'],
    'Technology': ['phone', 'computer', 'television', 'camera', 'screen', 'device', 'machine'],
    'Food': ['food', 'fruit', 'cake', 'bread', 'meal', 'dinner', 'breakfast', 'eating'],
    'Money': ['money', 'cash', 'wallet', 'bank', 'gold', 'coins', 'treasure', 'rich'],
    'Weapons': ['gun', 'knife', 'sword', 'weapon', 'bullet', 'arrow', 'dagger'],
    'Keys': ['key', 'keys', 'lock', 'door', 'open', 'locked', 'unlock'],
    'Books': ['book', 'reading', 'library', 'pages', 'letter', 'writing', 'document'],
    'Mirrors': ['mirror', 'reflection', 'glass', 'looking glass']
};

export const DreamObjects: React.FC<DreamObjectsProps> = React.memo(({ dreams }) => {
    const objects = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { obj: string; count: number }[] = [];

        Object.entries(OBJECT_CATEGORIES).forEach(([obj, keywords]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = d.dreamText.toLowerCase();
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            if (count > 0) counts.push({ obj, count });
        });

        return counts.sort((a, b) => b.count - a.count).slice(0, 6);
    }, [dreams]);

    if (objects.length === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Significant Objects</h3>
            <div className="flex flex-wrap gap-2">
                {objects.map(({ obj, count }) => (
                    <span key={obj} className="px-3 py-1 bg-day-accent/10 dark:bg-night-accent/10 rounded-full text-sm">
                        {obj} <span className="text-day-text-secondary dark:text-night-text-secondary">({count})</span>
                    </span>
                ))}
            </div>
        </div>
    );
});
