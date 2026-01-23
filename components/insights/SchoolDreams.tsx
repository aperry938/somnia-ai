import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface SchoolDreamsProps {
    dreams: Dream[];
}

const SCHOOL = ['school', 'class', 'teacher', 'student', 'exam', 'test', 'homework', 'university', 'college', 'grade', 'classroom'];

export const SchoolDreams: React.FC<SchoolDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const schoolDreams = dreams.filter(d =>
            SCHOOL.some(s => d.dreamText.toLowerCase().includes(s))
        );

        return {
            count: schoolDreams.length,
            percentage: Math.round((schoolDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">School Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-indigo-500">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams about school</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
});
