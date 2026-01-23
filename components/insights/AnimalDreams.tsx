import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface AnimalDreamsProps {
    dreams: Dream[];
}

const ANIMALS = ['dog', 'cat', 'bird', 'horse', 'snake', 'fish', 'wolf', 'bear', 'spider', 'insect', 'lion', 'tiger', 'elephant', 'mouse', 'rabbit'];

export const AnimalDreams: React.FC<AnimalDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const animalCounts: Record<string, number> = {};

        dreams.forEach(d => {
            const text = (d.dreamText || '').toLowerCase();
            ANIMALS.forEach(animal => {
                if (text.includes(animal)) {
                    animalCounts[animal] = (animalCounts[animal] || 0) + 1;
                }
            });
        });

        const sorted = Object.entries(animalCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const total = sorted.reduce((s, [, c]) => s + c, 0);

        return { animals: sorted, total };
    }, [dreams]);

    if (!stats || stats.total === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Animal Dreams</h3>
            <div className="space-y-1">
                {stats.animals.map(([animal, count]) => (
                    <div key={animal} className="flex items-center gap-2">
                        <span className="capitalize text-sm w-16">{animal}</span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(count / stats.total) * 100}%` }} />
                        </div>
                        <span className="text-xs">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});
