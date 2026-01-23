import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface TransformationDreamsProps {
    dreams: Dream[];
}

const TRANSFORM = ['transform', 'change', 'morph', 'become', 'turn into', 'evolve', 'grow', 'shrink', 'shapeshift', 'metamorphosis'];

export const TransformationDreams: React.FC<TransformationDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const transformDreams = dreams.filter(d => {
            const text = d.dreamText?.toLowerCase() ?? '';
            return text && TRANSFORM.some(t => text.includes(t));
        });

        if (transformDreams.length === 0) return null;

        return {
            count: transformDreams.length,
            percentage: Math.round((transformDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Transformation Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-fuchsia-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with change</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
