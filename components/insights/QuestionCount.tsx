import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface QuestionCountProps {
    dreams: Dream[];
}

export const QuestionCount: React.FC<QuestionCountProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let totalQuestions = 0;
        let dreamsWithQuestions = 0;

        dreams.forEach(d => {
            const text = d.dreamText || '';
            const q = (text.match(/\?/g) || []).length;
            if (q > 0) dreamsWithQuestions++;
            totalQuestions += q;
        });

        return {
            totalQuestions,
            dreamsWithQuestions,
            avgPerDream: (totalQuestions / dreams.length).toFixed(1)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Questions</h3>
            <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalQuestions}</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Questions in your dreams</div>
                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-2">
                    {stats.dreamsWithQuestions} dreams had questions ({stats.avgPerDream} avg)
                </p>
            </div>
        </div>
    );
});
