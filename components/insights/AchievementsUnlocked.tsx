import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface AchievementsUnlockedProps {
    dreams: Dream[];
}

// SVG icons for achievements
const AchievementIcon: React.FC<{ type: string; className?: string }> = ({ type, className = "h-4 w-4" }) => {
    const icons: Record<string, React.ReactNode> = {
        star: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
        ),
        fire: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
        ),
        crown: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
            </svg>
        ),
        badge: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
        ),
        pencil: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
        ),
        sparkles: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
        ),
    };
    return <>{icons[type] || icons.star}</>;
};

const ACHIEVEMENTS = [
    { id: 'first_dream', name: 'First Dream', condition: (d: Dream[]) => d.length >= 1, iconType: 'star' },
    { id: 'week_streak', name: 'Week Warrior', condition: (d: Dream[]) => d.length >= 7, iconType: 'fire' },
    { id: 'dream_master', name: 'Dream Master', condition: (d: Dream[]) => d.length >= 30, iconType: 'crown' },
    { id: 'centurion', name: 'Centurion', condition: (d: Dream[]) => d.length >= 100, iconType: 'badge' },
    { id: 'wordsmith', name: 'Wordsmith', condition: (d: Dream[]) => d.reduce((s, x) => s + x.dreamText.split(/\s+/).length, 0) > 10000, iconType: 'pencil' },
    { id: 'ai_explorer', name: 'AI Explorer', condition: (d: Dream[]) => d.filter(x => x.aiAnalysis).length >= 10, iconType: 'sparkles' },
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
                    <span key={a.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 dark:bg-amber-500/20 rounded-full text-sm">
                        <AchievementIcon type={a.iconType} className="h-4 w-4 text-amber-500" />
                        {a.name}
                    </span>
                ))}
            </div>
            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary mt-2">
                {unlocked.length} of {ACHIEVEMENTS.length} unlocked
            </p>
        </div>
    );
};
