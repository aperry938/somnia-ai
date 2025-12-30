import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface UniqueWordsProps {
    dreams: Dream[];
}

export const UniqueWords: React.FC<UniqueWordsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const wordSet = new Set<string>();
        let totalWords = 0;

        dreams.forEach(d => {
            const words = d.dreamText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            words.forEach(w => wordSet.add(w));
            totalWords += words.length;
        });

        const uniqueWords = wordSet.size;
        const vocabularyRichness = (uniqueWords / totalWords) * 100;

        return { uniqueWords, totalWords, vocabularyRichness: vocabularyRichness.toFixed(1) };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Vocabulary Richness</h3>

            <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                    <div className="text-2xl font-bold text-day-accent dark:text-night-accent">{stats.uniqueWords.toLocaleString()}</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Unique Words</div>
                </div>
                <div>
                    <div className="text-2xl font-bold">{stats.vocabularyRichness}%</div>
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Diversity</div>
                </div>
            </div>
        </div>
    );
};
