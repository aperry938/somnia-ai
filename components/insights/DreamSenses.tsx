import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamSensesProps {
    dreams: Dream[];
}

// SVG icons for senses
const SenseIcon: React.FC<{ type: string; className?: string }> = ({ type, className = "h-5 w-5" }) => {
    const icons: Record<string, React.ReactNode> = {
        Sight: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        ),
        Sound: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
        ),
        Touch: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
        ),
        Smell: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
        Taste: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
        ),
    };
    return <>{icons[type] || icons.Sight}</>;
};

const SENSE_KEYWORDS: Record<string, { keywords: string[] }> = {
    'Sight': { keywords: ['see', 'saw', 'look', 'looking', 'watch', 'watching', 'color', 'bright', 'dark', 'vision'] },
    'Sound': { keywords: ['hear', 'heard', 'sound', 'voice', 'music', 'noise', 'loud', 'quiet', 'silence', 'scream'] },
    'Touch': { keywords: ['feel', 'felt', 'touch', 'touched', 'soft', 'hard', 'cold', 'warm', 'smooth', 'rough'] },
    'Smell': { keywords: ['smell', 'scent', 'odor', 'fragrance', 'stink', 'fresh', 'perfume'] },
    'Taste': { keywords: ['taste', 'tasted', 'eat', 'eating', 'food', 'sweet', 'bitter', 'sour', 'delicious'] }
};

export const DreamSenses: React.FC<DreamSensesProps> = ({ dreams }) => {
    const senses = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { sense: string; count: number }[] = [];

        Object.entries(SENSE_KEYWORDS).forEach(([sense, { keywords }]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = d.dreamText.toLowerCase();
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            counts.push({ sense, count });
        });

        return counts.sort((a, b) => b.count - a.count);
    }, [dreams]);

    const maxCount = Math.max(...senses.map(s => s.count), 1);
    const hasData = senses.some(s => s.count > 0);

    if (!hasData) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Senses</h3>

            <div className="space-y-2">
                {senses.map(({ sense, count }) => (
                    <div key={sense} className="flex items-center gap-2">
                        <span className="w-6 text-day-accent dark:text-night-accent">
                            <SenseIcon type={sense} />
                        </span>
                        <span className="w-12 text-sm">{sense}</span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-full bg-day-accent dark:bg-night-accent rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs text-day-text-secondary dark:text-night-text-secondary w-6">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
