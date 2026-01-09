// Global Dream Trends Service
// Fetches anonymized dream trends from all opted-in users

import { logger } from './logger';

export type TrendPeriod = 'today' | 'week' | 'month' | 'all-time';
export type TrendScope = 'global' | 'regional';

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

export interface GlobalTrendsResponse {
    trends: GlobalTrend[];
    regionalTrends?: GlobalTrend[]; // Trends specific to user's region
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
 * Reverse geocode coordinates to region name
 */
const reverseGeocode = async (lat: number, lng: number): Promise<{ region: string; country: string } | null> => {
    try {
        // Use a free reverse geocoding API (OpenStreetMap Nominatim)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=5`,
            {
                headers: {
                    'User-Agent': 'Somnia Dream App',
                },
            }
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
        logger.warn('[GlobalTrends] Reverse geocode failed:', e);
    }
    return null;
};

/**
 * Set global trends opt-in with location
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
        const location = await requestLocation();
        if (location) {
            prefs.location = location;
        } else {
            // Location denied - still opt in but without location
            prefs.locationEnabled = false;
        }
    }

    // If opting out, clear location
    if (!optIn) {
        prefs.locationEnabled = false;
        prefs.location = undefined;
    }

    savePrefs(prefs);

    // Sync to backend if configured
    if (SUPABASE_URL && optIn) {
        const token = localStorage.getItem('somnia_auth_token');
        if (token) {
            await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_global_trends_opt_in`, {
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
            }).catch(err => logger.warn('[GlobalTrends] Failed to sync opt-in:', err));
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
 */
export const fetchGlobalTrends = async (period: TrendPeriod = 'week'): Promise<GlobalTrendsResponse> => {
    // Check cache first
    const cached = getCachedTrends(period);
    if (cached) {
        logger.log('[GlobalTrends] Using cached data');
        return cached;
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

            const response = await fetch(
                `${SUPABASE_URL}/functions/v1/global-trends?${params}`,
                {
                    headers: {
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                    },
                }
            );

            if (response.ok) {
                const json = await response.json();
                if (json.success && json.data) {
                    const result: GlobalTrendsResponse = {
                        trends: json.data.trends,
                        regionalTrends: json.data.regionalTrends,
                        stats: json.data.stats,
                        regionalStats: json.data.regionalStats,
                        cachedAt: json.data.cachedAt,
                        period: json.data.period,
                    };
                    cacheTrends(result);
                    return result;
                }
            }
        } catch (e) {
            logger.warn('[GlobalTrends] Backend fetch failed:', e);
        }
    }

    // Fall back to mock data
    logger.log('[GlobalTrends] Using fallback data');
    const fallback: GlobalTrendsResponse = {
        trends: getMockTrends(period),
        stats: getMockStats(period),
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

// Mock data fallback
const getMockTrends = (period: TrendPeriod): GlobalTrend[] => {
    const trendsData: Record<TrendPeriod, GlobalTrend[]> = {
        'today': [
            { topic: 'Flying', percentage: 38, change: 'up', sentiment: 'positive' },
            { topic: 'Work Stress', percentage: 31, change: 'up', sentiment: 'negative' },
            { topic: 'Family', percentage: 22, change: 'stable', sentiment: 'positive' },
            { topic: 'Water/Ocean', percentage: 18, change: 'down', sentiment: 'neutral' },
            { topic: 'Being Late', percentage: 14, change: 'up', sentiment: 'negative' },
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
            { topic: 'Falling', percentage: 32, change: 'up', sentiment: 'negative' },
            { topic: 'Water/Ocean', percentage: 30, change: 'up', sentiment: 'neutral' },
            { topic: 'Being Chased', percentage: 21, change: 'stable', sentiment: 'negative' },
            { topic: 'Lucid Awareness', percentage: 11, change: 'up', sentiment: 'positive' },
        ],
        'all-time': [
            { topic: 'Flying', percentage: 48, change: 'stable', sentiment: 'positive' },
            { topic: 'Water/Ocean', percentage: 35, change: 'stable', sentiment: 'neutral' },
            { topic: 'Being Chased', percentage: 28, change: 'stable', sentiment: 'negative' },
            { topic: 'Falling', percentage: 24, change: 'stable', sentiment: 'negative' },
            { topic: 'Lost/Searching', percentage: 19, change: 'stable', sentiment: 'neutral' },
        ],
    };
    return trendsData[period];
};

const getMockRegionalTrends = (period: TrendPeriod): GlobalTrend[] => {
    // Slightly different trends for regional data
    const regionalData: Record<TrendPeriod, GlobalTrend[]> = {
        'today': [
            { topic: 'Weather Events', percentage: 45, change: 'up', sentiment: 'negative' },
            { topic: 'Flying', percentage: 32, change: 'stable', sentiment: 'positive' },
            { topic: 'Local Landmarks', percentage: 18, change: 'up', sentiment: 'neutral' },
        ],
        'week': [
            { topic: 'Nature', percentage: 38, change: 'up', sentiment: 'positive' },
            { topic: 'Community', percentage: 25, change: 'stable', sentiment: 'positive' },
            { topic: 'Weather', percentage: 20, change: 'down', sentiment: 'neutral' },
        ],
        'month': [
            { topic: 'Seasons', percentage: 42, change: 'up', sentiment: 'neutral' },
            { topic: 'Local Events', percentage: 28, change: 'stable', sentiment: 'positive' },
            { topic: 'Travel', percentage: 22, change: 'up', sentiment: 'positive' },
        ],
        'all-time': [
            { topic: 'Nature', percentage: 40, change: 'stable', sentiment: 'positive' },
            { topic: 'Community', percentage: 30, change: 'stable', sentiment: 'positive' },
            { topic: 'Local Culture', percentage: 25, change: 'stable', sentiment: 'neutral' },
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
