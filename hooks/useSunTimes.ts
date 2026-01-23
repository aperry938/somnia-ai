import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../services/logger';

interface SunTimes {
    sunrise: Date;
    sunset: Date;
}

interface CachedSunTimes {
    sunrise: string;
    sunset: string;
    timestamp: number;
    latitude?: number;
    longitude?: number;
}

const CACHE_KEY = 'somnia_sun_times';
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours
const FETCH_TIMEOUT = 10000; // 10 seconds
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const GEOLOCATION_TIMEOUT = 5000; // 5 seconds
const GEOLOCATION_MAX_AGE = 3600000; // 1 hour

// Permission status for better error handling
type GeolocationPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

/**
 * Hook that determines if it's currently "night" based on sunrise/sunset times.
 * Uses geolocation and the sunrise-sunset.org API, with caching.
 * Falls back to time-based estimation if geolocation unavailable.
 *
 * Features:
 * - Proper abort controller cleanup
 * - Geolocation permission handling
 * - Robust error handling and fallbacks
 * - Memory-efficient with proper cleanup
 */
export const useSunTimes = () => {
    const [isNight, setIsNight] = useState<boolean | null>(null);
    const [method, setMethod] = useState<'geolocation' | 'fallback'>('fallback');
    const [permissionStatus, setPermissionStatus] = useState<GeolocationPermissionStatus>('prompt');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Refs for cleanup
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);
    const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const geolocationWatchIdRef = useRef<number | null>(null);

    // Check if it's night based on sun times
    const checkNight = useCallback((sunTimes: SunTimes) => {
        if (!isMountedRef.current) return;
        const now = new Date();
        const isCurrentlyNight = now < sunTimes.sunrise || now > sunTimes.sunset;
        setIsNight(isCurrentlyNight);
    }, []);

    // Get cached times with validation
    const getCachedTimes = useCallback((): SunTimes | null => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;

            const data: CachedSunTimes = JSON.parse(cached);
            if (Date.now() - data.timestamp > CACHE_DURATION) {
                // Cache expired, remove it
                localStorage.removeItem(CACHE_KEY);
                return null;
            }

            const sunrise = new Date(data.sunrise);
            const sunset = new Date(data.sunset);

            // Validate dates are valid
            if (isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) {
                localStorage.removeItem(CACHE_KEY);
                return null;
            }

            return { sunrise, sunset };
        } catch (e) {
            logger.warn('[useSunTimes] Failed to parse cached times:', e);
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
    }, []);

    // Cache sun times
    const cacheTimes = useCallback((times: SunTimes, lat?: number, lng?: number) => {
        try {
            const data: CachedSunTimes = {
                sunrise: times.sunrise.toISOString(),
                sunset: times.sunset.toISOString(),
                timestamp: Date.now(),
                latitude: lat,
                longitude: lng,
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (e) {
            logger.warn('[useSunTimes] Failed to cache times:', e);
        }
    }, []);

    // Fetch sun times from API with proper abort handling
    const fetchSunTimes = useCallback(async (lat: number, lng: number): Promise<SunTimes | null> => {
        // Abort any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        // Set up timeout
        const timeoutId = setTimeout(() => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        }, FETCH_TIMEOUT);

        try {
            const response = await fetch(
                `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`,
                { signal }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'OK' && data.results) {
                const sunrise = new Date(data.results.sunrise);
                const sunset = new Date(data.results.sunset);

                // Validate dates
                if (isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) {
                    throw new Error('Invalid date in API response');
                }

                return { sunrise, sunset };
            } else {
                throw new Error(data.status || 'Unknown API error');
            }
        } catch (e) {
            clearTimeout(timeoutId);

            if (e instanceof Error) {
                if (e.name === 'AbortError') {
                    logger.warn('[useSunTimes] Fetch aborted or timed out');
                } else {
                    logger.error('[useSunTimes] Failed to fetch sun times:', e.message);
                }
            }
            return null;
        } finally {
            abortControllerRef.current = null;
        }
    }, []);

    // Get fallback times (7am-7pm)
    const getFallbackTimes = useCallback((): SunTimes => {
        const now = new Date();
        const sunrise = new Date(now);
        sunrise.setHours(7, 0, 0, 0);
        const sunset = new Date(now);
        sunset.setHours(19, 0, 0, 0);
        return { sunrise, sunset };
    }, []);

    // Check geolocation permission status
    const checkGeolocationPermission = useCallback(async (): Promise<GeolocationPermissionStatus> => {
        if (!('geolocation' in navigator)) {
            return 'unavailable';
        }

        if ('permissions' in navigator) {
            try {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                return result.state as GeolocationPermissionStatus;
            } catch {
                // Permissions API not fully supported
                return 'prompt';
            }
        }

        return 'prompt';
    }, []);

    // Initialize sun times
    useEffect(() => {
        isMountedRef.current = true;

        const init = async () => {
            if (!isMountedRef.current) return;

            setIsLoading(true);
            setError(null);

            // Check geolocation permission first
            const permission = await checkGeolocationPermission();
            if (isMountedRef.current) {
                setPermissionStatus(permission);
            }

            // Check cache first
            const cached = getCachedTimes();
            if (cached) {
                if (isMountedRef.current) {
                    setMethod('geolocation');
                    checkNight(cached);
                    setIsLoading(false);
                }
                return;
            }

            // Try geolocation if available and not denied
            if ('geolocation' in navigator && permission !== 'denied') {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        if (!isMountedRef.current) return;

                        const times = await fetchSunTimes(pos.coords.latitude, pos.coords.longitude);
                        if (!isMountedRef.current) return;

                        if (times) {
                            setMethod('geolocation');
                            cacheTimes(times, pos.coords.latitude, pos.coords.longitude);
                            checkNight(times);
                            setPermissionStatus('granted');
                        } else {
                            setMethod('fallback');
                            setError('Failed to fetch sun times');
                            checkNight(getFallbackTimes());
                        }
                        setIsLoading(false);
                    },
                    (posError) => {
                        if (!isMountedRef.current) return;

                        // Handle different error types
                        switch (posError.code) {
                            case posError.PERMISSION_DENIED:
                                setPermissionStatus('denied');
                                setError('Location permission denied');
                                break;
                            case posError.POSITION_UNAVAILABLE:
                                setError('Location unavailable');
                                break;
                            case posError.TIMEOUT:
                                setError('Location request timed out');
                                break;
                        }

                        setMethod('fallback');
                        checkNight(getFallbackTimes());
                        setIsLoading(false);
                    },
                    {
                        timeout: GEOLOCATION_TIMEOUT,
                        maximumAge: GEOLOCATION_MAX_AGE,
                        enableHighAccuracy: false, // Low accuracy is fine for sun times
                    }
                );
            } else {
                if (isMountedRef.current) {
                    setMethod('fallback');
                    if (permission === 'denied') {
                        setError('Location permission denied');
                    }
                    checkNight(getFallbackTimes());
                    setIsLoading(false);
                }
            }
        };

        init();

        // Re-check every 5 minutes
        intervalIdRef.current = setInterval(() => {
            if (!isMountedRef.current) return;

            const cached = getCachedTimes();
            const times = cached || getFallbackTimes();
            checkNight(times);
        }, CHECK_INTERVAL);

        return () => {
            isMountedRef.current = false;

            // Abort any pending fetch
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }

            // Clear interval
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;
            }

            // Clear geolocation watch if any
            if (geolocationWatchIdRef.current !== null) {
                navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
                geolocationWatchIdRef.current = null;
            }
        };
    }, [checkGeolocationPermission, getCachedTimes, fetchSunTimes, getFallbackTimes, checkNight, cacheTimes]);

    // Function to manually refresh sun times
    const refresh = useCallback(async () => {
        if (!isMountedRef.current) return;

        setIsLoading(true);
        setError(null);

        // Clear cache to force fresh fetch
        localStorage.removeItem(CACHE_KEY);

        if ('geolocation' in navigator && permissionStatus !== 'denied') {
            return new Promise<void>((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        if (!isMountedRef.current) {
                            resolve();
                            return;
                        }

                        const times = await fetchSunTimes(pos.coords.latitude, pos.coords.longitude);
                        if (!isMountedRef.current) {
                            resolve();
                            return;
                        }

                        if (times) {
                            setMethod('geolocation');
                            cacheTimes(times, pos.coords.latitude, pos.coords.longitude);
                            checkNight(times);
                        } else {
                            setMethod('fallback');
                            checkNight(getFallbackTimes());
                        }
                        setIsLoading(false);
                        resolve();
                    },
                    () => {
                        if (isMountedRef.current) {
                            setMethod('fallback');
                            checkNight(getFallbackTimes());
                            setIsLoading(false);
                        }
                        resolve();
                    },
                    { timeout: GEOLOCATION_TIMEOUT, enableHighAccuracy: false }
                );
            });
        } else {
            setMethod('fallback');
            checkNight(getFallbackTimes());
            setIsLoading(false);
        }
    }, [permissionStatus, fetchSunTimes, cacheTimes, checkNight, getFallbackTimes]);

    return {
        isNight,
        method,
        permissionStatus,
        isLoading,
        error,
        refresh,
    };
};
