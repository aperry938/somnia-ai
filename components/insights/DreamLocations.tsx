import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamLocationsProps {
    dreams: Dream[];
}

const LOCATION_TYPES = {
    'Home': ['home', 'house', 'apartment', 'bedroom', 'kitchen', 'living room', 'bathroom'],
    'School': ['school', 'classroom', 'university', 'college', 'campus', 'teacher', 'student'],
    'Work': ['office', 'work', 'workplace', 'meeting', 'desk', 'computer', 'job'],
    'Nature': ['forest', 'mountain', 'beach', 'ocean', 'river', 'lake', 'garden', 'field', 'tree'],
    'City': ['city', 'street', 'building', 'downtown', 'traffic', 'shop', 'mall', 'restaurant'],
    'Unknown': ['strange place', 'unfamiliar', 'mysterious', 'somewhere', 'nowhere', 'dark place'],
    'Transport': ['car', 'train', 'airplane', 'bus', 'boat', 'driving', 'flying', 'road', 'highway']
};

export const DreamLocations: React.FC<DreamLocationsProps> = ({ dreams }) => {
    const locations = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { loc: string; count: number; emoji: string }[] = [];
        const emojis: Record<string, string> = {
            'Home': '🏠', 'School': '🏫', 'Work': '💼', 'Nature': '🌲',
            'City': '🏙️', 'Unknown': '❓', 'Transport': '🚗'
        };

        Object.entries(LOCATION_TYPES).forEach(([loc, keywords]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = d.dreamText.toLowerCase();
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            if (count > 0) counts.push({ loc, count, emoji: emojis[loc] || '📍' });
        });

        return counts.sort((a, b) => b.count - a.count);
    }, [dreams]);

    if (locations.length === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Dream Locations
            </h3>

            <div className="flex flex-wrap gap-2">
                {locations.map(({ loc, count, emoji }) => (
                    <div key={loc} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 dark:bg-black/20 rounded-full">
                        <span>{emoji}</span>
                        <span className="text-sm">{loc}</span>
                        <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">({count})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
