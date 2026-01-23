import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamCharactersProps {
    dreams: Dream[];
}

const CHARACTER_TYPES = {
    'Family': ['mother', 'father', 'mom', 'dad', 'brother', 'sister', 'parent', 'grandmother', 'grandfather', 'aunt', 'uncle', 'cousin', 'family'],
    'Friends': ['friend', 'buddy', 'companion', 'classmate', 'colleague', 'coworker'],
    'Romantic': ['boyfriend', 'girlfriend', 'partner', 'husband', 'wife', 'lover', 'crush', 'ex'],
    'Strangers': ['stranger', 'unknown', 'unfamiliar', 'someone', 'figure', 'shadow person'],
    'Authority': ['boss', 'teacher', 'police', 'officer', 'judge', 'leader', 'president', 'doctor'],
    'Children': ['child', 'kid', 'baby', 'infant', 'son', 'daughter', 'toddler'],
    'Celebrities': ['celebrity', 'famous', 'actor', 'singer', 'star', 'musician'],
    'Animals': ['dog', 'cat', 'bird', 'snake', 'horse', 'animal', 'pet', 'wolf', 'bear']
};

export const DreamCharacters: React.FC<DreamCharactersProps> = React.memo(({ dreams }) => {
    const characters = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { type: string; count: number }[] = [];

        Object.entries(CHARACTER_TYPES).forEach(([type, keywords]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = (d.dreamText || '').toLowerCase();
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            if (count > 0) counts.push({ type, count });
        });

        return counts.sort((a, b) => b.count - a.count).slice(0, 5);
    }, [dreams]);

    if (characters.length === 0) return null;

    const maxCount = Math.max(...characters.map(c => c.count)) || 1;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Dream Characters
            </h3>

            <div className="space-y-2">
                {characters.map(({ type, count }) => (
                    <div key={type} className="flex items-center gap-2">
                        <span className="w-20 text-sm truncate">{type}</span>
                        <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-full bg-day-accent dark:bg-night-accent rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs text-day-text-secondary dark:text-night-text-secondary w-6">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});
