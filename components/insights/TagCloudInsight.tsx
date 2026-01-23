import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface TagCloudInsightProps {
    dreams: Dream[];
}

export const TagCloudInsight: React.FC<TagCloudInsightProps> = React.memo(({ dreams }) => {
    const tags = useMemo(() => {
        const tagCounts: Record<string, number> = {};

        dreams.forEach(d => {
            d.tags?.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        return Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([tag, count]) => ({ tag, count }));
    }, [dreams]);

    if (tags.length === 0 || dreams.length < 3) return null;

    const maxCount = tags[0]?.count || 1; // Already sorted descending, so first element is max

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Your Tags</h3>

            <div className="flex flex-wrap gap-2 justify-center">
                {tags.map(({ tag, count }) => {
                    const scale = 0.75 + (count / maxCount) * 0.5;
                    return (
                        <span
                            key={tag}
                            className="px-2 py-1 bg-day-accent/10 dark:bg-night-accent/10 text-day-accent dark:text-night-accent rounded-full"
                            style={{ fontSize: `${scale}rem` }}
                        >
                            #{tag}
                        </span>
                    );
                })}
            </div>
        </div>
    );
});
