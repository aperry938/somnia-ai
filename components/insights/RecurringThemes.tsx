import React from 'react';
import { Dream } from '../../types';

interface RecurringThemesProps {
    dreams: Dream[];
}

// Common dream themes and their associated keywords
const THEME_KEYWORDS: Record<string, string[]> = {
    'Chase': ['chase', 'chased', 'chasing', 'running', 'escape', 'fled', 'pursued', 'hunting'],
    'Flying': ['fly', 'flying', 'flew', 'floating', 'soaring', 'wings', 'levitate', 'hover'],
    'Falling': ['fall', 'falling', 'fell', 'dropping', 'plummeting', 'cliff', 'height'],
    'Water': ['water', 'ocean', 'sea', 'swimming', 'drowning', 'wave', 'river', 'lake', 'rain', 'flood'],
    'Death': ['death', 'dead', 'dying', 'funeral', 'grave', 'coffin', 'killing', 'killed'],
    'Teeth': ['teeth', 'tooth', 'falling out', 'crumbling', 'dental'],
    'Naked': ['naked', 'nude', 'exposed', 'undressed', 'embarrassed', 'clothes missing'],
    'Test': ['exam', 'test', 'unprepared', 'school', 'class', 'failing', 'late for'],
    'Lost': ['lost', 'searching', 'maze', 'cannot find', "can't find", 'wandering', 'confused'],
    'Animals': ['animal', 'dog', 'cat', 'snake', 'bird', 'wolf', 'bear', 'spider', 'insect']
};

export const RecurringThemes: React.FC<RecurringThemesProps> = ({ dreams }) => {
    const themes = React.useMemo(() => {
        if (dreams.length < 3) return [];

        const themeCounts: { theme: string; count: number; dreams: string[] }[] = [];

        Object.entries(THEME_KEYWORDS).forEach(([theme, keywords]) => {
            const matchingDreams: string[] = [];

            dreams.forEach(dream => {
                const text = dream.dreamText.toLowerCase();
                if (keywords.some(kw => text.includes(kw))) {
                    matchingDreams.push(dream.title || 'Untitled');
                }
            });

            if (matchingDreams.length > 0) {
                themeCounts.push({ theme, count: matchingDreams.length, dreams: matchingDreams.slice(0, 3) });
            }
        });

        return themeCounts.sort((a, b) => b.count - a.count).slice(0, 5);
    }, [dreams]);

    if (themes.length === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recurring Themes
            </h3>

            <div className="space-y-3">
                {themes.map(({ theme, count, dreams: _themeDreams }) => (
                    <div key={theme} className="flex items-center justify-between">
                        <div>
                            <span className="font-medium">{theme}</span>
                            <span className="text-xs text-day-text-secondary dark:text-night-text-secondary ml-2">
                                ({count} dream{count !== 1 ? 's' : ''})
                            </span>
                        </div>
                        <div className="flex gap-1" aria-hidden="true">
                            {[...Array(Math.min(count, 5))].map((_, i) => (
                                <div key={i} className="w-2 h-2 rounded-full bg-day-accent dark:bg-night-accent" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
