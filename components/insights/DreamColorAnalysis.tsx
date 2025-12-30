import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamColorAnalysisProps {
    dreams: Dream[];
}

const COLORS: Record<string, string> = {
    red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
    black: '#171717', white: '#f5f5f5', purple: '#a855f7', orange: '#f97316',
    pink: '#ec4899', brown: '#92400e', gray: '#6b7280', gold: '#fbbf24'
};

export const DreamColorAnalysis: React.FC<DreamColorAnalysisProps> = ({ dreams }) => {
    const colors = useMemo(() => {
        if (dreams.length < 5) return [];

        const colorCounts: Record<string, number> = {};

        dreams.forEach(d => {
            const text = d.dreamText.toLowerCase();
            Object.keys(COLORS).forEach(color => {
                if (text.includes(color)) {
                    colorCounts[color] = (colorCounts[color] || 0) + 1;
                }
            });
        });

        return Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [dreams]);

    if (colors.length === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Colors</h3>
            <div className="flex gap-2 justify-center">
                {colors.map(([color, count]) => (
                    <div key={color} className="text-center">
                        <div
                            className="w-8 h-8 rounded-full mx-auto mb-1 border-2 border-white/50"
                            style={{ backgroundColor: COLORS[color] }}
                        />
                        <div className="text-xs capitalize">{color}</div>
                        <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">{count}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
