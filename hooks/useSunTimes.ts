import { useState, useEffect } from 'react';

interface SunTimes {
    sunrise: Date;
    sunset: Date;
}

const CACHE_KEY = 'somnia_sun_times';
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Hook that determines if it's currently "night" based on sunrise/sunset times.
 * Uses geolocation and the sunrise-sunset.org API, with caching.
 * Falls back to time-based estimation if geolocation unavailable.
 */
export const useSunTimes = () => {
    const [isNight, setIsNight] = useState<boolean | null>(null);
    const [method, setMethod] = useState<'geolocation' | 'fallback'>('fallback');

    useEffect(() => {
        let interval: number;

        const checkNight = (sunTimes: SunTimes) => {
            const now = new Date();
            const isCurrentlyNight = now < sunTimes.sunrise || now > sunTimes.sunset;
            setIsNight(isCurrentlyNight);
        };

        const getCachedTimes = (): SunTimes | null => {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (!cached) return null;
                const { sunrise, sunset, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp > CACHE_DURATION) return null;
                return {
                    sunrise: new Date(sunrise),
                    sunset: new Date(sunset),
                };
            } catch {
                return null;
            }
        };

        const cacheTimes = (times: SunTimes) => {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                sunrise: times.sunrise.toISOString(),
                sunset: times.sunset.toISOString(),
                timestamp: Date.now(),
            }));
        };

        const fetchSunTimes = async (lat: number, lng: number): Promise<SunTimes | null> => {
            try {
                const response = await fetch(
                    `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`
                );
                const data = await response.json();
                if (data.status === 'OK') {
                    return {
                        sunrise: new Date(data.results.sunrise),
                        sunset: new Date(data.results.sunset),
                    };
                }
            } catch (e) {
                console.error('Failed to fetch sun times:', e);
            }
            return null;
        };

        // Fallback: night is 7pm to 7am
        const getFallbackTimes = (): SunTimes => {
            const now = new Date();
            const sunrise = new Date(now);
            sunrise.setHours(7, 0, 0, 0);
            const sunset = new Date(now);
            sunset.setHours(19, 0, 0, 0);
            return { sunrise, sunset };
        };

        const init = async () => {
            // Check cache first
            const cached = getCachedTimes();
            if (cached) {
                setMethod('geolocation');
                checkNight(cached);
                return;
            }

            // Try geolocation
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        const times = await fetchSunTimes(pos.coords.latitude, pos.coords.longitude);
                        if (times) {
                            setMethod('geolocation');
                            cacheTimes(times);
                            checkNight(times);
                        } else {
                            setMethod('fallback');
                            checkNight(getFallbackTimes());
                        }
                    },
                    () => {
                        // Permission denied or error
                        setMethod('fallback');
                        checkNight(getFallbackTimes());
                    },
                    { timeout: 5000, maximumAge: 3600000 }
                );
            } else {
                setMethod('fallback');
                checkNight(getFallbackTimes());
            }
        };

        init();

        // Re-check every 5 minutes
        interval = window.setInterval(() => {
            const cached = getCachedTimes();
            const times = cached || getFallbackTimes();
            checkNight(times);
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    return { isNight, method };
};
