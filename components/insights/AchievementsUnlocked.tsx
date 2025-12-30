import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface AchievementsUnlockedProps {
    dreams: Dream[];
}

const ACHIEVEMENTS = [
    { id: 'first_dream', name: 'First Dream', condition: (d: Dream[]) => d.length >= 1, icon: '🌟' },
    { id: 'week_streak', name: 'Week Warrior', condition: (d: Dream[]) => d.length >= 7, icon: '🔥' },
    { id: 'dream_master', name: 'Dream Master', condition: (d: Dream[]) => d.length >= 30, icon: '👑' },
    { id: 'centurion', name: 'Centurion', condition: (d: Dream[]) => d.length >= 100, icon: '💯' },
    { id: 'wordsmith', name: 'Wordsmith', condition: (d: Dream[]) => d.reduce((s, x) => s + x.dreamText.split(/\s+/).length, 0) > 10000, icon: '✍️' },
    { id: 'ai_explorer', name: 'AI Explorer', condition: (d: Dream[]) => d.filter(x => x.aiAnalysis).length >= 10, icon: '🤖' },
];

export const AchievementsUnlocked: React.FC<AchievementsUnlockedProps> = ({ dreams }) => {
    const unlocked = useMemo(() => {
        return ACHIEVEMENTS.filter(a => a.condition(dreams));
    }, [dreams]);

    if (unlocked.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 dark:border-amber-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Achievements</h3>
            <div className="flex flex-wrap gap-2 justify-center">
                {unlocked.map(a => (
                    <span key={a.id} className="px-3 py-1 bg-yellow-500/20 dark:bg-amber-500/20 rounded-full text-sm">
                        {a.icon} {a.name}
                    </span>
                ))}
            </div>
            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary mt-2">
                {unlocked.length} of {ACHIEVEMENTS.length} unlocked
            </p>
        </div>
    );
};
