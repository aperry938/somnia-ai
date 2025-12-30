import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface SleepAidImpactProps {
    dreams: Dream[];
}

export const SleepAidImpact: React.FC<SleepAidImpactProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        const withAids = dreams.filter(d => d.sleepAids && Object.values(d.sleepAids).some(v => v));
        const withoutAids = dreams.filter(d => !d.sleepAids || !Object.values(d.sleepAids).some(v => v));

        if (withAids.length < 3 || withoutAids.length < 3) return null;

        const avgWithAids = withAids.reduce((s, d) => s + (d.dreamText?.split(/\s+/).length || 0), 0) / withAids.length;
        const avgWithoutAids = withoutAids.reduce((s, d) => s + (d.dreamText?.split(/\s+/).length || 0), 0) / withoutAids.length;

        const qualityWith = withAids.filter(d => d.sleepQuality).reduce((s, d) => s + (d.sleepQuality || 0), 0);
        const qualityWithout = withoutAids.filter(d => d.sleepQuality).reduce((s, d) => s + (d.sleepQuality || 0), 0);

        const avgQualityWith = qualityWith / withAids.filter(d => d.sleepQuality).length || 0;
        const avgQualityWithout = qualityWithout / withoutAids.filter(d => d.sleepQuality).length || 0;

        return {
            withAids: withAids.length,
            withoutAids: withoutAids.length,
            lengthDiff: Math.round(((avgWithAids - avgWithoutAids) / avgWithoutAids) * 100),
            qualityDiff: (avgQualityWith - avgQualityWithout).toFixed(1)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Sleep Aid Impact</h3>

            <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-2xl font-bold">{stats.withAids}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">With Aids</p>
                </div>
                <div>
                    <p className="text-2xl font-bold">{stats.withoutAids}</p>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Without</p>
                </div>
            </div>

            <div className="mt-4 text-sm text-center">
                <p>Dream length: <span className={stats.lengthDiff > 0 ? 'text-green-500' : 'text-red-500'}>{stats.lengthDiff > 0 ? '+' : ''}{stats.lengthDiff}%</span> with aids</p>
                <p>Quality: <span className={parseFloat(stats.qualityDiff) > 0 ? 'text-green-500' : 'text-red-500'}>{parseFloat(stats.qualityDiff) > 0 ? '+' : ''}{stats.qualityDiff}</span> with aids</p>
            </div>
        </div>
    );
};
