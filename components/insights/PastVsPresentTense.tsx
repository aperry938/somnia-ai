import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface PastVsPresentTenseProps {
    dreams: Dream[];
}

export const PastVsPresentTense: React.FC<PastVsPresentTenseProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let pastCount = 0, presentCount = 0;

        dreams.forEach(d => {
            const text = d.dreamText || '';
            const past = (text.match(/\b(was|were|had|did|went|saw|felt|came|got|made)\b/gi) || []).length;
            const present = (text.match(/\b(is|are|have|do|go|see|feel|come|get|make)\b/gi) || []).length;
            pastCount += past;
            presentCount += present;
        });

        const total = pastCount + presentCount;
        const pastPercent = total > 0 ? Math.round((pastCount / total) * 100) : 50;

        return { pastCount, presentCount, pastPercent };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Narrative Tense</h3>
            <div className="flex h-4 rounded-full overflow-hidden mb-3">
                <div className="bg-amber-500" style={{ width: `${stats.pastPercent}%` }} />
                <div className="bg-cyan-500" style={{ width: `${100 - stats.pastPercent}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
                <div><span className="font-bold text-amber-500">{stats.pastPercent}%</span> Past tense</div>
                <div><span className="font-bold text-cyan-500">{100 - stats.pastPercent}%</span> Present</div>
            </div>
        </div>
    );
});
