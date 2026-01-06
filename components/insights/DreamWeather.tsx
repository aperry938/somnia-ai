import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamWeatherProps {
    dreams: Dream[];
}

// SVG icons for weather types
const WeatherIcon: React.FC<{ type: string; className?: string }> = ({ type, className = "h-8 w-8" }) => {
    const icons: Record<string, React.ReactNode> = {
        Sunny: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
        Rainy: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15zM8 19v2m4-2v2m4-2v2" />
            </svg>
        ),
        Cloudy: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
        ),
        Snowy: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v18m-6-6l6-6 6 6M6 15l6 6 6-6M9 3l3 3 3-3M9 21l3-3 3 3" />
            </svg>
        ),
        Windy: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5a2 2 0 012 2h-2a2 2 0 01-2-2 2 2 0 012-2zM8 9h8a2 2 0 012 2M4 13h12a2 2 0 002-2M10 17h4a2 2 0 002-2" />
            </svg>
        ),
        Night: (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
        ),
    };
    return <>{icons[type] || icons.Cloudy}</>;
};

const WEATHER_KEYWORDS: Record<string, { keywords: string[] }> = {
    'Sunny': { keywords: ['sun', 'sunny', 'bright', 'warm', 'hot', 'sunshine', 'clear sky'] },
    'Rainy': { keywords: ['rain', 'raining', 'wet', 'storm', 'thunder', 'lightning', 'downpour'] },
    'Cloudy': { keywords: ['cloud', 'cloudy', 'overcast', 'gray', 'grey', 'fog', 'mist'] },
    'Snowy': { keywords: ['snow', 'snowing', 'cold', 'ice', 'freezing', 'winter', 'frost'] },
    'Windy': { keywords: ['wind', 'windy', 'breeze', 'gust', 'blowing', 'tornado', 'hurricane'] },
    'Night': { keywords: ['night', 'dark', 'moon', 'stars', 'midnight', 'evening'] }
};

export const DreamWeather: React.FC<DreamWeatherProps> = ({ dreams }) => {
    const weather = useMemo(() => {
        if (dreams.length < 3) return [];

        const counts: { type: string; count: number }[] = [];

        Object.entries(WEATHER_KEYWORDS).forEach(([type, { keywords }]) => {
            let count = 0;
            dreams.forEach(d => {
                const text = d.dreamText.toLowerCase();
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            if (count > 0) counts.push({ type, count });
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
                {weather.map(({ type, count }) => (
                    <div key={type} className="text-center">
                        <div className="text-day-accent dark:text-night-accent mb-1 flex justify-center">
                            <WeatherIcon type={type} />
                        </div>
                        <div className="text-sm font-medium">{type}</div>
                        <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">{count}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
