import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface TopTagsProps {
    dreams: Dream[];
}

export const TopTags: React.FC<TopTagsProps> = ({ dreams }) => {
    const tags = useMemo(() => {
        const tagCounts: Record<string, number> = {};

        dreams.forEach(d => {
            d.tags?.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        return Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag, count]) => ({ tag, count }));
    }, [dreams]);

    if (tags.length === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Top 5 Tags</h3>
            <div className="space-y-2">
                {tags.map(({ tag, count }, i) => (
                    <div key={tag} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-day-accent/10 dark:bg-night-accent/10 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <span className="flex-1 truncate">#{tag}</span>
                        <span className="text-sm text-day-text-secondary dark:text-night-text-secondary">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
