import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface ExclamationIntensityProps {
    dreams: Dream[];
}

export const ExclamationIntensity: React.FC<ExclamationIntensityProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let totalExclamations = 0;

        dreams.forEach(d => {
            totalExclamations += (d.dreamText.match(/!/g) || []).length;
        });

        const perDream = totalExclamations / dreams.length;
        const intensity = perDream > 3 ? 'High' : perDream > 1 ? 'Moderate' : 'Low';

        return { totalExclamations, perDream: perDream.toFixed(1), intensity };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Emotional Intensity</h3>
            <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalExclamations}</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Exclamations (!)</div>
                <div className={`mt-2 text-sm ${stats.intensity === 'High' ? 'text-red-500' : stats.intensity === 'Moderate' ? 'text-yellow-500' : 'text-green-500'}`}>
                    {stats.intensity} emotional intensity
                </div>
            </div>
        </div>
    );
};
