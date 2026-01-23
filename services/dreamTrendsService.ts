// Global Dream Trends Service
// Fetches anonymized dream trends from all opted-in users
//
// Mobile App Store Readiness:
// - Rate limiting for API calls
// - Offline fallback with cached/mock data
// - Timeout handling for network requests
// - Input validation for all functions

import { logger } from './logger';
import { logError } from './errorService';
import { checkRateLimit } from './rateLimitService';

export type TrendPeriod = 'today' | 'week' | 'month' | 'all-time';
export type TrendScope = 'global' | 'regional';

/** Request timeout for API calls (10 seconds) */
const API_TIMEOUT = 10000;

/** Rate limit category for trends API */
const TRENDS_RATE_LIMIT = 'api_default';

export interface GlobalTrend {
    topic: string;
    percentage: number; // 0-100
    change: 'up' | 'down' | 'stable';
    sentiment: 'positive' | 'negative' | 'neutral';
}

export interface GlobalStats {
    avgSleepTime: string;
    avgQuality: number;
    activeDreamers: number;
    region?: string; // e.g., "California, US" or "Europe"
}

export interface CountryTopDream {
    country: string;
    countryCode: string; // ISO 3166-1 alpha-2
    topDream: string;
    dreamers: number;
}

export interface GlobalTrendsResponse {
    trends: GlobalTrend[];
    regionalTrends?: GlobalTrend[]; // Trends specific to user's region
    countryTopDreams?: CountryTopDream[]; // Top dream per country
    stats: GlobalStats;
    regionalStats?: GlobalStats;
    cachedAt: string;
    period: TrendPeriod;
}

export interface UserLocation {
    latitude: number;
    longitude: number;
    region?: string; // Reverse geocoded region name
    country?: string;
}

export interface GlobalTrendsPreferences {
    optedIn: boolean;
    locationEnabled: boolean;
    location?: UserLocation;
}

// Storage keys
const PREFS_KEY = 'somnia_global_trends_prefs';
const CACHE_KEY = 'somnia_global_trends_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Backend configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

/**
 * Get global trends preferences
 */
export const getGlobalTrendsPrefs = (): GlobalTrendsPreferences => {
    try {
        const stored = localStorage.getItem(PREFS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore parse errors
    }
    return { optedIn: false, locationEnabled: false };
};

/**
 * Save global trends preferences
 */
const savePrefs = (prefs: GlobalTrendsPreferences): void => {
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
        // Ignore storage errors
    }
};

/**
 * Check if user has opted into global trends
 */
export const isGlobalTrendsOptedIn = (): boolean => {
    return getGlobalTrendsPrefs().optedIn;
};

/**
 * Check if location is enabled for trends
 */
export const isLocationEnabled = (): boolean => {
    return getGlobalTrendsPrefs().locationEnabled;
};

/**
 * Get user's stored location
 */
export const getUserLocation = (): UserLocation | undefined => {
    return getGlobalTrendsPrefs().location;
};

/**
 * Request location permission and get coordinates
 */
export const requestLocation = (): Promise<UserLocation | null> => {
    return new Promise((resolve) => {
        if (!('geolocation' in navigator)) {
            logger.warn('[GlobalTrends] Geolocation not available');
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const location: UserLocation = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                };

                // Try to reverse geocode for region name
                try {
                    const region = await reverseGeocode(location.latitude, location.longitude);
                    if (region) {
                        location.region = region.region;
                        location.country = region.country;
                    }
                } catch (e) {
                    logger.warn('[GlobalTrends] Reverse geocode failed:', e);
                }

                resolve(location);
            },
            (error) => {
                logger.warn('[GlobalTrends] Location permission denied:', error.message);
                resolve(null);
            },
            { timeout: 10000, maximumAge: 3600000 } // 1 hour cache
        );
    });
};

/**
 * Fetch with timeout wrapper
 */
const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
};

/**
 * Reverse geocode coordinates to region name
 */
const reverseGeocode = async (lat: number, lng: number): Promise<{ region: string; country: string } | null> => {
    // Input validation
    if (typeof lat !== 'number' || typeof lng !== 'number' ||
        !isFinite(lat) || !isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        logger.warn('[GlobalTrends] Invalid coordinates for geocoding');
        return null;
    }

    try {
        // Use a free reverse geocoding API (OpenStreetMap Nominatim)
        const response = await fetchWithTimeout(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=5`,
            {
                headers: {
                    'User-Agent': 'Somnia Dream App',
                },
            },
            API_TIMEOUT
        );

        if (response.ok) {
            const data = await response.json();
            const address = data.address || {};
            return {
                region: address.state || address.region || address.county || 'Unknown',
                country: address.country || 'Unknown',
            };
        }
    } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
            logger.warn('[GlobalTrends] Reverse geocode timed out');
        } else {
            logger.warn('[GlobalTrends] Reverse geocode failed:', e);
        }
    }
    return null;
};

/**
 * Set global trends opt-in with location
 * Includes proper error handling and timeout for backend sync
 */
export const setGlobalTrendsOptIn = async (
    optIn: boolean,
    enableLocation: boolean = false
): Promise<GlobalTrendsPreferences> => {
    const prefs = getGlobalTrendsPrefs();
    prefs.optedIn = optIn;
    prefs.locationEnabled = enableLocation;

    // If enabling location, request it
    if (optIn && enableLocation) {
        try {
            const location = await requestLocation();
            if (location) {
                prefs.location = location;
            } else {
                // Location denied - still opt in but without location
                prefs.locationEnabled = false;
            }
        } catch (error) {
            logger.warn('[GlobalTrends] Failed to get location:', error);
            prefs.locationEnabled = false;
        }
    }

    // If opting out, clear location
    if (!optIn) {
        prefs.locationEnabled = false;
        prefs.location = undefined;
    }

    savePrefs(prefs);

    // Sync to backend if configured (non-blocking)
    if (SUPABASE_URL && optIn) {
        const token = localStorage.getItem('somnia_auth_token');
        if (token) {
            // Don't await - let it happen in background
            fetchWithTimeout(
                `${SUPABASE_URL}/rest/v1/rpc/set_global_trends_opt_in`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                    },
                    body: JSON.stringify({
                        opt_in: optIn,
                        latitude: prefs.location?.latitude,
                        longitude: prefs.location?.longitude,
                        region: prefs.location?.region,
                        country: prefs.location?.country,
                    }),
                },
                API_TIMEOUT
            ).catch(err => {
                logger.warn('[GlobalTrends] Failed to sync opt-in:', err);
                // Don't throw - local prefs are already saved
            });
        }
    }

    return prefs;
};

/**
 * Get cached trends if still valid
 */
const getCachedTrends = (period: TrendPeriod): GlobalTrendsResponse | null => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const data = JSON.parse(cached);
        if (data.period !== period) return null;

        const cachedTime = new Date(data.cachedAt).getTime();
        if (Date.now() - cachedTime > CACHE_TTL) return null;

        return data;
    } catch {
        return null;
    }
};

/**
 * Cache trends response
 */
const cacheTrends = (response: GlobalTrendsResponse): void => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(response));
    } catch {
        // Ignore cache errors
    }
};

/**
 * Fetch global trends from backend
 * Includes rate limiting, timeout handling, and offline fallback
 */
export const fetchGlobalTrends = async (period: TrendPeriod = 'week'): Promise<GlobalTrendsResponse> => {
    // Validate period
    const validPeriods: TrendPeriod[] = ['today', 'week', 'month', 'all-time'];
    if (!validPeriods.includes(period)) {
        period = 'week';
    }

    // Check cache first
    const cached = getCachedTrends(period);
    if (cached) {
        logger.log('[GlobalTrends] Using cached data');
        return cached;
    }

    // Check if device is online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        logger.log('[GlobalTrends] Offline, using fallback data');
        return createFallbackResponse(period);
    }

    // Rate limit API calls
    const rateCheck = checkRateLimit(TRENDS_RATE_LIMIT);
    if (!rateCheck.allowed) {
        logger.warn('[GlobalTrends] Rate limited, using fallback data');
        return createFallbackResponse(period);
    }

    const prefs = getGlobalTrendsPrefs();

    // Try fetching from backend
    if (SUPABASE_URL) {
        try {
            const params = new URLSearchParams({ period });

            // Include location for regional trends if enabled
            if (prefs.locationEnabled && prefs.location) {
                params.set('lat', prefs.location.latitude.toString());
                params.set('lng', prefs.location.longitude.toString());
                if (prefs.location.region) params.set('region', prefs.location.region);
            }

            const response = await fetchWithTimeout(
                `${SUPABASE_URL}/functions/v1/global-trends?${params}`,
                {
                    headers: {
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                    },
                },
                API_TIMEOUT
            );

            if (response.ok) {
                const json = await response.json();

                // Validate response structure
                if (json.success && json.data && Array.isArray(json.data.trends)) {
                    const result: GlobalTrendsResponse = {
                        trends: json.data.trends,
                        regionalTrends: json.data.regionalTrends,
                        countryTopDreams: json.data.countryTopDreams,
                        stats: json.data.stats,
                        regionalStats: json.data.regionalStats,
                        cachedAt: json.data.cachedAt || new Date().toISOString(),
                        period: json.data.period || period,
                    };
                    cacheTrends(result);
                    return result;
                } else {
                    logger.warn('[GlobalTrends] Invalid response structure from backend');
                }
            } else {
                logger.warn(`[GlobalTrends] Backend returned status ${response.status}`);
            }
        } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
                logger.warn('[GlobalTrends] Backend fetch timed out');
            } else {
                logger.warn('[GlobalTrends] Backend fetch failed:', e);
            }
            logError(e instanceof Error ? e : new Error(String(e)), 'network', { operation: 'fetchGlobalTrends' });
        }
    }

    // Fall back to mock data
    return createFallbackResponse(period);
};

/**
 * Create fallback response with mock data
 */
const createFallbackResponse = (period: TrendPeriod): GlobalTrendsResponse => {
    logger.log('[GlobalTrends] Using fallback data');
    const prefs = getGlobalTrendsPrefs();

    const fallback: GlobalTrendsResponse = {
        trends: getMockTrends(period),
        stats: getMockStats(period),
        countryTopDreams: getMockCountryTopDreams(),
        cachedAt: new Date().toISOString(),
        period,
    };

    // Add mock regional data if location enabled
    if (prefs.locationEnabled && prefs.location) {
        fallback.regionalTrends = getMockRegionalTrends(period);
        fallback.regionalStats = {
            ...getMockStats(period),
            activeDreamers: Math.floor(getMockStats(period).activeDreamers * 0.05),
            region: prefs.location.region || 'Your Region',
        };
    }

    cacheTrends(fallback);
    return fallback;
};

/**
 * Synchronous getter for immediate UI rendering (uses cache or mock)
 */
export const getGlobalDreamTrends = (period: TrendPeriod = 'week'): GlobalTrend[] => {
    const cached = getCachedTrends(period);
    return cached?.trends || getMockTrends(period);
};

export const getGlobalSleepStats = (period: TrendPeriod = 'week'): GlobalStats => {
    const cached = getCachedTrends(period);
    return cached?.stats || getMockStats(period);
};

export const getRegionalTrends = (period: TrendPeriod = 'week'): GlobalTrend[] | undefined => {
    const cached = getCachedTrends(period);
    return cached?.regionalTrends;
};

// Mock data fallback - In production, these are dynamically extracted from
// aggregated dream content using NLP/AI to identify ANY recurring themes,
// not limited to predefined categories. Topics like relationships, death,
// childhood memories, celebrities, intimacy, conflict, etc. all surface naturally.
const getMockTrends = (period: TrendPeriod): GlobalTrend[] => {
    const trendsData: Record<TrendPeriod, GlobalTrend[]> = {
        'today': [
            { topic: 'Flying', percentage: 38, change: 'up', sentiment: 'positive' },
            { topic: 'Work Anxiety', percentage: 31, change: 'up', sentiment: 'negative' },
            { topic: 'Deceased Loved Ones', percentage: 24, change: 'up', sentiment: 'neutral' },
            { topic: 'Romantic Partners', percentage: 19, change: 'stable', sentiment: 'positive' },
            { topic: 'Childhood Home', percentage: 15, change: 'down', sentiment: 'neutral' },
        ],
        'week': [
            { topic: 'Flying', percentage: 42, change: 'up', sentiment: 'positive' },
            { topic: 'Water/Ocean', percentage: 28, change: 'stable', sentiment: 'neutral' },
            { topic: 'Being Chased', percentage: 15, change: 'down', sentiment: 'negative' },
            { topic: 'Late for Exam', percentage: 12, change: 'up', sentiment: 'negative' },
            { topic: 'Lucid Awareness', percentage: 8, change: 'up', sentiment: 'positive' },
        ],
        'month': [
            { topic: 'Flying', percentage: 45, change: 'stable', sentiment: 'positive' },
            { topic: 'Family Members', percentage: 34, change: 'up', sentiment: 'positive' },
            { topic: 'Falling', percentage: 28, change: 'up', sentiment: 'negative' },
            { topic: 'Sexual Content', percentage: 22, change: 'stable', sentiment: 'neutral' },
            { topic: 'Death/Dying', percentage: 18, change: 'down', sentiment: 'negative' },
        ],
        'all-time': [
            { topic: 'Flying', percentage: 48, change: 'stable', sentiment: 'positive' },
            { topic: 'Being Chased', percentage: 35, change: 'stable', sentiment: 'negative' },
            { topic: 'Teeth Falling Out', percentage: 29, change: 'stable', sentiment: 'negative' },
            { topic: 'Loved Ones', percentage: 26, change: 'stable', sentiment: 'positive' },
            { topic: 'Lost/Searching', percentage: 21, change: 'stable', sentiment: 'neutral' },
        ],
    };
    return trendsData[period];
};

// Regional trends - dynamically extracted from dreams in user's country
const getMockRegionalTrends = (period: TrendPeriod): GlobalTrend[] => {
    const regionalData: Record<TrendPeriod, GlobalTrend[]> = {
        'today': [
            { topic: 'Mountains', percentage: 45, change: 'up', sentiment: 'positive' },
            { topic: 'Family Gatherings', percentage: 32, change: 'stable', sentiment: 'positive' },
            { topic: 'Work Stress', percentage: 24, change: 'up', sentiment: 'negative' },
        ],
        'week': [
            { topic: 'Nature/Outdoors', percentage: 38, change: 'up', sentiment: 'positive' },
            { topic: 'Ancestors', percentage: 28, change: 'stable', sentiment: 'neutral' },
            { topic: 'Festivals', percentage: 20, change: 'up', sentiment: 'positive' },
        ],
        'month': [
            { topic: 'Travel', percentage: 42, change: 'up', sentiment: 'positive' },
            { topic: 'Old Friends', percentage: 31, change: 'stable', sentiment: 'positive' },
            { topic: 'Natural Disasters', percentage: 18, change: 'down', sentiment: 'negative' },
        ],
        'all-time': [
            { topic: 'Family', percentage: 44, change: 'stable', sentiment: 'positive' },
            { topic: 'Nature', percentage: 36, change: 'stable', sentiment: 'positive' },
            { topic: 'Spiritual Themes', percentage: 25, change: 'stable', sentiment: 'neutral' },
        ],
    };
    return regionalData[period];
};

const getMockStats = (period: TrendPeriod): GlobalStats => {
    const statsData: Record<TrendPeriod, GlobalStats> = {
        'today': { avgSleepTime: '7h 08m', avgQuality: 3.7, activeDreamers: 3240 },
        'week': { avgSleepTime: '7h 12m', avgQuality: 3.8, activeDreamers: 12450 },
        'month': { avgSleepTime: '7h 18m', avgQuality: 3.9, activeDreamers: 45820 },
        'all-time': { avgSleepTime: '7h 14m', avgQuality: 3.85, activeDreamers: 128500 },
    };
    return statsData[period];
};

// Top dream by country - In production, dynamically computed from aggregated dream themes per country
const getMockCountryTopDreams = (): CountryTopDream[] => [
    { country: 'United States', countryCode: 'US', topDream: 'Flying', dreamers: 42300 },
    { country: 'Japan', countryCode: 'JP', topDream: 'Natural Disasters', dreamers: 18200 },
    { country: 'Brazil', countryCode: 'BR', topDream: 'Water/Ocean', dreamers: 15800 },
    { country: 'Germany', countryCode: 'DE', topDream: 'Being Chased', dreamers: 12400 },
    { country: 'India', countryCode: 'IN', topDream: 'Family Members', dreamers: 28500 },
    { country: 'United Kingdom', countryCode: 'GB', topDream: 'Work Anxiety', dreamers: 9800 },
    { country: 'Australia', countryCode: 'AU', topDream: 'Animals/Wildlife', dreamers: 6200 },
    { country: 'Mexico', countryCode: 'MX', topDream: 'Deceased Loved Ones', dreamers: 8900 },
    { country: 'France', countryCode: 'FR', topDream: 'Romantic Partners', dreamers: 7600 },
    { country: 'South Korea', countryCode: 'KR', topDream: 'Exam Stress', dreamers: 5400 },
    { country: 'Canada', countryCode: 'CA', topDream: 'Nature/Outdoors', dreamers: 4800 },
    { country: 'Italy', countryCode: 'IT', topDream: 'Food/Feasting', dreamers: 4200 },
];

/**
 * Get top dreams by country
 */
export const getCountryTopDreams = (): CountryTopDream[] => {
    const cached = getCachedTrends('week');
    return cached?.countryTopDreams || getMockCountryTopDreams();
};

/**
 * Clear all global trends data (call on user logout)
 * This prevents data leakage between users on shared devices
 */
export const clearGlobalTrendsData = (): void => {
    try {
        localStorage.removeItem(PREFS_KEY);
        localStorage.removeItem(CACHE_KEY);
        logger.log('[GlobalTrends] Cleared all trends data');
    } catch {
        // Ignore storage errors
    }
};
