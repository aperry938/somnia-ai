import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface AIDependencyProps {
    dreams: Dream[];
}

export const AIDependency: React.FC<AIDependencyProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const withAI = dreams.filter(d => d.aiAnalysis).length;
        const withImage = dreams.filter(d => d.imageUrl).length;

        return {
            analyzed: withAI,
            imaged: withImage,
            analyzedPercent: Math.round((withAI / dreams.length) * 100),
            imagedPercent: Math.round((withImage / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">AI Usage</h3>

            <div className="space-y-3">
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span>AI Analyzed</span>
                        <span>{stats.analyzedPercent}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.analyzedPercent}%` }} />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span>AI Imagery</span>
                        <span>{stats.imagedPercent}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${stats.imagedPercent}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
};
