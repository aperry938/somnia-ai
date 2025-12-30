import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamRelationshipsProps {
    dreams: Dream[];
}

const RELATIONSHIP_KEYWORDS: Record<string, string[]> = {
    'Romantic': ['love', 'kiss', 'romance', 'dating', 'intimate', 'passion', 'heart', 'lover'],
    'Conflict': ['argue', 'fight', 'angry', 'yell', 'conflict', 'argue', 'hate', 'enemy'],
    'Friendship': ['friend', 'buddy', 'together', 'laughing', 'fun', 'hang out', 'companion'],
    'Family': ['family', 'parent', 'child', 'sibling', 'mother', 'father', 'home'],
    'Loss': ['miss', 'gone', 'lost', 'alone', 'separated', 'goodbye', 'leaving', 'death'],
    'Reunion': ['reunion', 'together again', 'found', 'reconnect', 'return', 'back']
};

export const DreamRelationships: React.FC<DreamRelationshipsProps> = ({ dreams }) => {
    const relationships = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { type: string; count: number }[] = [];

        Object.entries(RELATIONSHIP_KEYWORDS).forEach(([type, keywords]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = d.dreamText.toLowerCase();
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            if (count > 0) counts.push({ type, count });
        });

        return counts.sort((a, b) => b.count - a.count);
    }, [dreams]);

    if (relationships.length === 0) return null;

    const total = relationships.reduce((s, r) => s + r.count, 0);

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Relationships</h3>
            <div className="space-y-2">
                {relationships.slice(0, 5).map(({ type, count }) => (
                    <div key={type} className="flex items-center gap-2">
                        <span className="w-20 text-sm">{type}</span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                        </div>
                        <span className="text-xs w-6">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
