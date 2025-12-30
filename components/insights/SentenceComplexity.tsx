import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface SentenceComplexityProps {
    dreams: Dream[];
}

export const SentenceComplexity: React.FC<SentenceComplexityProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let totalSentences = 0;
        let totalWords = 0;

        dreams.forEach(d => {
            const sentences = d.dreamText.split(/[.!?]+/).filter(s => s.trim().length > 0);
            totalSentences += sentences.length;
            totalWords += d.dreamText.split(/\s+/).length;
        });

        const avgWordsPerSentence = totalWords / totalSentences;
        const complexity = avgWordsPerSentence > 20 ? 'Complex' : avgWordsPerSentence > 12 ? 'Moderate' : 'Simple';

        return { avgWordsPerSentence: avgWordsPerSentence.toFixed(1), totalSentences, complexity };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Writing Style</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-day-accent dark:text-night-accent">{stats.avgWordsPerSentence}</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Words per sentence</div>
                <div className={`mt-2 text-sm ${stats.complexity === 'Complex' ? 'text-purple-500' : stats.complexity === 'Moderate' ? 'text-blue-500' : 'text-green-500'}`}>
                    {stats.complexity} style
                </div>
            </div>
        </div>
    );
};
