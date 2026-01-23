import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface IndoorVsOutdoorProps {
    dreams: Dream[];
}

const INDOOR = ['room', 'house', 'building', 'office', 'home', 'apartment', 'kitchen', 'bedroom', 'bathroom', 'hallway', 'basement'];
const OUTDOOR = ['outside', 'outdoor', 'sky', 'sun', 'field', 'forest', 'ocean', 'beach', 'mountain', 'street', 'road', 'park', 'garden'];

export const IndoorVsOutdoor: React.FC<IndoorVsOutdoorProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let indoor = 0, outdoor = 0;

        dreams.forEach(d => {
            const text = d.dreamText?.toLowerCase() ?? '';
            if (INDOOR.some(kw => text.includes(kw))) indoor++;
            if (OUTDOOR.some(kw => text.includes(kw))) outdoor++;
        });

        const total = indoor + outdoor || 1;

        return {
            indoor,
            outdoor,
            indoorPct: Math.round((indoor / total) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Indoor vs Outdoor</h3>
            <div className="flex h-4 rounded-full overflow-hidden mb-3">
                <div className="bg-amber-500" style={{ width: `${stats.indoorPct}%` }} />
                <div className="bg-green-500" style={{ width: `${100 - stats.indoorPct}%` }} />
            </div>
            <div className="flex justify-between text-sm">
                <span><span className="font-bold text-amber-500">{stats.indoor}</span> Indoor</span>
                <span><span className="font-bold text-green-500">{stats.outdoor}</span> Outdoor</span>
            </div>
        </div>
    );
});
