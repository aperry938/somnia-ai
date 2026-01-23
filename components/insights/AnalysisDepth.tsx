import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface AnalysisDepthProps {
    dreams: Dream[];
}

export const AnalysisDepth: React.FC<AnalysisDepthProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const withAnalysis = dreams.filter(d => d.aiAnalysis).length;
        const withImage = dreams.filter(d => d.imageUrl).length;
        const withTags = dreams.filter(d => d.tags && d.tags.length > 0).length;
        const withQuality = dreams.filter(d => d.sleepQuality !== null).length;

        const total = dreams.length;

        return {
            analysis: Math.round((withAnalysis / total) * 100),
            image: Math.round((withImage / total) * 100),
            tags: Math.round((withTags / total) * 100),
            quality: Math.round((withQuality / total) * 100),
            overall: Math.round(((withAnalysis + withImage + withTags + withQuality) / (total * 4)) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 dark:border-blue-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Journal Depth</h3>

            <div className="text-center mb-4">
                <div className="text-4xl font-bold text-cyan-600 dark:text-blue-400">{stats.overall}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Enrichment Score</div>
            </div>

            <div className="space-y-2">
                {[
                    { label: 'AI Analysis', value: stats.analysis },
                    { label: 'Dream Art', value: stats.image },
                    { label: 'Tagged', value: stats.tags },
                    { label: 'Sleep Quality', value: stats.quality }
                ].map(({ label, value }) => (
                    <div key={label}>
                        <div className="flex justify-between text-xs mb-0.5">
                            <span>{label}</span>
                            <span className="text-day-text-secondary dark:text-night-text-secondary">{value}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${value}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});
