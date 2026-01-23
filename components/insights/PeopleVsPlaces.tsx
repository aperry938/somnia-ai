import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface PeopleVsPlacesProps {
    dreams: Dream[];
}

const PEOPLE_KEYWORDS = ['friend', 'family', 'mother', 'father', 'sister', 'brother', 'stranger', 'man', 'woman', 'child', 'person', 'people', 'group', 'crowd'];
const PLACE_KEYWORDS = ['house', 'home', 'building', 'city', 'street', 'forest', 'ocean', 'mountain', 'room', 'school', 'work', 'office', 'beach', 'garden'];

export const PeopleVsPlaces: React.FC<PeopleVsPlacesProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let peopleCount = 0, placeCount = 0;

        dreams.forEach(d => {
            const text = d.dreamText.toLowerCase();
            if (PEOPLE_KEYWORDS.some(kw => text.includes(kw))) peopleCount++;
            if (PLACE_KEYWORDS.some(kw => text.includes(kw))) placeCount++;
        });

        const total = peopleCount + placeCount || 1;

        return {
            peopleCount,
            placeCount,
            peoplePct: Math.round((peopleCount / total) * 100),
            focus: peopleCount > placeCount ? 'People-focused' : placeCount > peopleCount ? 'Place-focused' : 'Balanced'
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Dream Focus</h3>
            <div className="flex h-4 rounded-full overflow-hidden mb-3">
                <div className="bg-pink-500" style={{ width: `${stats.peoplePct}%` }} />
                <div className="bg-teal-500" style={{ width: `${100 - stats.peoplePct}%` }} />
            </div>
            <div className="flex justify-between text-sm">
                <span><span className="font-bold text-pink-500">{stats.peopleCount}</span> People</span>
                <span><span className="font-bold text-teal-500">{stats.placeCount}</span> Places</span>
            </div>
            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary mt-2">
                {stats.focus}
            </p>
        </div>
    );
});
