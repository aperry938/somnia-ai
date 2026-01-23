import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamMovementProps {
    dreams: Dream[];
}

const MOVEMENT_KEYWORDS: Record<string, string[]> = {
    'Walking': ['walk', 'walking', 'walked', 'step', 'stroll', 'wander'],
    'Running': ['run', 'running', 'ran', 'sprint', 'jog', 'race'],
    'Flying': ['fly', 'flying', 'flew', 'soar', 'glide', 'hover', 'float'],
    'Swimming': ['swim', 'swimming', 'swam', 'dive', 'underwater', 'ocean'],
    'Falling': ['fall', 'falling', 'fell', 'drop', 'plunge', 'descend'],
    'Climbing': ['climb', 'climbing', 'climbed', 'ascend', 'ladder', 'mountain'],
    'Driving': ['drive', 'driving', 'drove', 'car', 'vehicle', 'road']
};

export const DreamMovement: React.FC<DreamMovementProps> = ({ dreams }) => {
    const movements = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { type: string; count: number }[] = [];

        Object.entries(MOVEMENT_KEYWORDS).forEach(([type, keywords]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = d.dreamText?.toLowerCase() ?? '';
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            if (count > 0) counts.push({ type, count });
        });

        return counts.sort((a, b) => b.count - a.count).slice(0, 5);
    }, [dreams]);

    if (movements.length === 0) return null;

    const maxCount = Math.max(...movements.map(m => m.count), 1);

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Movement</h3>
            <div className="space-y-2">
                {movements.map(({ type, count }) => (
                    <div key={type} className="flex items-center gap-2">
                        <span className="w-16 text-sm">{type}</span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-full bg-day-accent dark:bg-night-accent rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs w-6">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
