import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface FirstPersonCountProps {
    dreams: Dream[];
}

export const FirstPersonCount: React.FC<FirstPersonCountProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let iCount = 0, weCount = 0;

        dreams.forEach(d => {
            const text = d.dreamText || '';
            const matches = text.match(/\b(I|I'm|I've|I'd|I'll|me|my|mine)\b/gi);
            iCount += matches?.length || 0;
            const weMatches = text.match(/\b(we|we're|we've|we'd|us|our|ours)\b/gi);
            weCount += weMatches?.length || 0;
        });

        const total = iCount + weCount;
        const selfFocus = total > 0 ? Math.round((iCount / total) * 100) : 0;

        return { iCount, weCount, selfFocus };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Perspective</h3>
            <div className="flex h-4 rounded-full overflow-hidden mb-3">
                <div className="bg-blue-500" style={{ width: `${stats.selfFocus}%` }} title="I/me/my" />
                <div className="bg-purple-500" style={{ width: `${100 - stats.selfFocus}%` }} title="We/us/our" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
                <div><span className="font-bold text-blue-500">{stats.iCount}</span> self (I/me)</div>
                <div><span className="font-bold text-purple-500">{stats.weCount}</span> group (we/us)</div>
            </div>
        </div>
    );
};
