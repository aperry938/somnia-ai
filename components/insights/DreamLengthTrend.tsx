import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamLengthTrendProps {
    dreams: Dream[];
}

export const DreamLengthTrend: React.FC<DreamLengthTrendProps> = ({ dreams }) => {
    const trend = useMemo(() => {
        if (dreams.length < 10) return null;

        const recent10 = dreams.slice(0, 10);
        const lengths = recent10.map(d => d.dreamText.split(/\s+/).length).reverse();
        const avgFirst5 = lengths.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const avgLast5 = lengths.slice(5).reduce((a, b) => a + b, 0) / 5;

        const direction = avgLast5 > avgFirst5 * 1.1 ? 'increasing' : avgLast5 < avgFirst5 * 0.9 ? 'decreasing' : 'stable';

        return { lengths, direction };
    }, [dreams]);

    if (!trend) return null;

    const max = Math.max(...trend.lengths, 1);

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Length Trend</h3>
            <div className="flex items-end justify-between h-16 gap-1">
                {trend.lengths.map((len, i) => (
                    <div
                        key={i}
                        className="flex-1 bg-day-accent dark:bg-night-accent rounded-t"
                        style={{ height: `${(len / max) * 100}%` }}
                    />
                ))}
            </div>
            <p className={`text-xs text-center mt-2 ${trend.direction === 'increasing' ? 'text-green-500' : trend.direction === 'decreasing' ? 'text-red-500' : 'text-gray-500'}`}>
                {trend.direction === 'increasing' ? '↑' : trend.direction === 'decreasing' ? '↓' : '→'} {trend.direction}
            </p>
        </div>
    );
};
