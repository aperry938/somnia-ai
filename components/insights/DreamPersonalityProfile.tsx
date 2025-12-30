import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface PersonalityProfileProps {
    dreams: Dream[];
}

const PERSONALITY_TRAITS = {
    'Explorer': ['adventure', 'travel', 'discover', 'new place', 'journey', 'explore', 'mountain', 'forest'],
    'Guardian': ['protect', 'save', 'rescue', 'defend', 'help', 'shield', 'care', 'family', 'children'],
    'Creator': ['build', 'create', 'make', 'design', 'art', 'music', 'write', 'paint', 'invent'],
    'Seeker': ['search', 'find', 'looking', 'question', 'truth', 'meaning', 'mystery', 'hidden'],
    'Warrior': ['fight', 'battle', 'conflict', 'compete', 'win', 'strong', 'courage', 'brave'],
    'Healer': ['heal', 'comfort', 'peace', 'calm', 'restore', 'love', 'gentle', 'nurture']
};

export const DreamPersonalityProfile: React.FC<PersonalityProfileProps> = ({ dreams }) => {
    const profile = useMemo(() => {
        if (dreams.length < 5) return null;

        const scores: Record<string, number> = {};

        Object.entries(PERSONALITY_TRAITS).forEach(([trait, keywords]) => {
            let score = 0;
            dreams.forEach(dream => {
                const text = dream.dreamText.toLowerCase();
                keywords.forEach(kw => {
                    if (text.includes(kw)) score++;
                });
            });
            scores[trait] = score;
        });

        const total = Object.values(scores).reduce((a, b) => a + b, 0);
        if (total === 0) return null;

        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const dominant = sorted[0];
        const secondary = sorted[1];

        return { scores, dominant, secondary, total };
    }, [dreams]);

    if (!profile) return null;

    return (
        <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 dark:border-fuchsia-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-500 dark:text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Dream Personality
            </h3>

            <div className="text-center mb-4">
                <p className="text-2xl font-bold text-violet-600 dark:text-fuchsia-400">{profile.dominant[0]}</p>
                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                    with {profile.secondary[0]} tendencies
                </p>
            </div>

            <div className="space-y-2">
                {Object.entries(profile.scores).slice(0, 4).map(([trait, score]) => {
                    const pct = Math.round((score / profile.total) * 100);
                    return (
                        <div key={trait}>
                            <div className="flex justify-between text-xs mb-0.5">
                                <span>{trait}</span>
                                <span className="text-day-text-secondary dark:text-night-text-secondary">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
