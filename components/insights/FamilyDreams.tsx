import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface FamilyDreamsProps {
    dreams: Dream[];
}

const FAMILY = ['mother', 'father', 'mom', 'dad', 'sister', 'brother', 'parent', 'family', 'grandma', 'grandpa', 'aunt', 'uncle', 'cousin'];

export const FamilyDreams: React.FC<FamilyDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const familyDreams = dreams.filter(d =>
            FAMILY.some(f => d.dreamText.toLowerCase().includes(f))
        );

        return {
            count: familyDreams.length,
            percentage: Math.round((familyDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/20 dark:border-pink-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Family Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-rose-600 dark:text-pink-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with family</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
