import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamActionsProps {
    dreams: Dream[];
}

const ACTION_VERBS = {
    'Running': ['run', 'running', 'ran', 'sprint', 'jog', 'escape', 'chase'],
    'Flying': ['fly', 'flying', 'flew', 'soar', 'float', 'hover', 'levitate'],
    'Fighting': ['fight', 'fighting', 'punch', 'kick', 'battle', 'attack', 'defend'],
    'Talking': ['talk', 'talking', 'spoke', 'speaking', 'conversation', 'said', 'told'],
    'Searching': ['search', 'searching', 'looking', 'find', 'look for', 'seek'],
    'Falling': ['fall', 'falling', 'fell', 'drop', 'plummet'],
    'Swimming': ['swim', 'swimming', 'swam', 'dive', 'underwater'],
    'Hiding': ['hide', 'hiding', 'hid', 'hidden', 'sneak', 'crouch']
};

export const DreamActions: React.FC<DreamActionsProps> = ({ dreams }) => {
    const actions = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { action: string; count: number }[] = [];

        Object.entries(ACTION_VERBS).forEach(([action, verbs]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = d.dreamText.toLowerCase();
                if (verbs.some(v => text.includes(v))) count++;
            });
            if (count > 0) counts.push({ action, count });
        });

        return counts.sort((a, b) => b.count - a.count).slice(0, 6);
    }, [dreams]);

    if (actions.length === 0) return null;

    const maxCount = Math.max(...actions.map(a => a.count));

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Dream Actions
            </h3>

            <div className="grid grid-cols-2 gap-2">
                {actions.map(({ action, count }) => (
                    <div key={action} className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-full bg-day-accent dark:bg-night-accent rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs w-16 truncate">{action}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
