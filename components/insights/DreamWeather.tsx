import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamWeatherProps {
    dreams: Dream[];
}

const WEATHER_KEYWORDS: Record<string, { keywords: string[]; emoji: string }> = {
    'Sunny': { keywords: ['sun', 'sunny', 'bright', 'warm', 'hot', 'sunshine', 'clear sky'], emoji: '☀️' },
    'Rainy': { keywords: ['rain', 'raining', 'wet', 'storm', 'thunder', 'lightning', 'downpour'], emoji: '🌧️' },
    'Cloudy': { keywords: ['cloud', 'cloudy', 'overcast', 'gray', 'grey', 'fog', 'mist'], emoji: '☁️' },
    'Snowy': { keywords: ['snow', 'snowing', 'cold', 'ice', 'freezing', 'winter', 'frost'], emoji: '❄️' },
    'Windy': { keywords: ['wind', 'windy', 'breeze', 'gust', 'blowing', 'tornado', 'hurricane'], emoji: '💨' },
    'Night': { keywords: ['night', 'dark', 'moon', 'stars', 'midnight', 'evening'], emoji: '🌙' }
};

export const DreamWeather: React.FC<DreamWeatherProps> = ({ dreams }) => {
    const weather = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { type: string; count: number; emoji: string }[] = [];

        Object.entries(WEATHER_KEYWORDS).forEach(([type, { keywords, emoji }]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = d.dreamText.toLowerCase();
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            if (count > 0) counts.push({ type, count, emoji });
        });

        return counts.sort((a, b) => b.count - a.count);
    }, [dreams]);

    if (weather.length === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                Dream Weather
            </h3>

            <div className="flex flex-wrap gap-3 justify-center">
                {weather.map(({ type, count, emoji }) => (
                    <div key={type} className="text-center">
                        <div className="text-3xl mb-1">{emoji}</div>
                        <div className="text-sm font-medium">{type}</div>
                        <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">{count}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
