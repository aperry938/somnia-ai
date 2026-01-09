// Global Dream Trends Service
// Fetches anonymized dream trends from all opted-in users

import { logger } from './logger';

export type TrendPeriod = 'today' | 'week' | 'month' | 'all-time';

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
}

export interface GlobalTrendsResponse {
    trends: GlobalTrend[];
    stats: GlobalStats;
    cachedAt: string;
    period: TrendPeriod;
}

// Storage keys
const OPT_IN_KEY = 'somnia_global_trends_opt_in';
const CACHE_KEY = 'somnia_global_trends_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Backend configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

/**
 * Check if user has opted into global trends
 */
export const isGlobalTrendsOptedIn = (): boolean => {
    try {
        return localStorage.getItem(OPT_IN_KEY) === 'true';
    } catch {
        return false;
    }
};

/**
 * Set global trends opt-in status
 */
export const setGlobalTrendsOptIn = async (optIn: boolean): Promise<void> => {
    try {
        localStorage.setItem(OPT_IN_KEY, optIn ? 'true' : 'false');

        // If backend is configured, sync opt-in status
        if (SUPABASE_URL) {
            const token = localStorage.getItem('somnia_auth_token');
            if (token) {
                await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_global_trends_opt_in`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                    },
                    body: JSON.stringify({ opt_in: optIn }),
                }).catch(err => logger.warn('[GlobalTrends] Failed to sync opt-in:', err));
            }
        }
    } catch (e) {
        logger.error('[GlobalTrends] Failed to save opt-in:', e);
    }
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

    // Try fetching from backend
    if (SUPABASE_URL) {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/functions/v1/global-trends?period=${period}`,
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
                        stats: json.data.stats,
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

const getMockStats = (period: TrendPeriod): GlobalStats => {
    const statsData: Record<TrendPeriod, GlobalStats> = {
        'today': { avgSleepTime: '7h 08m', avgQuality: 3.7, activeDreamers: 3240 },
        'week': { avgSleepTime: '7h 12m', avgQuality: 3.8, activeDreamers: 12450 },
        'month': { avgSleepTime: '7h 18m', avgQuality: 3.9, activeDreamers: 45820 },
        'all-time': { avgSleepTime: '7h 14m', avgQuality: 3.85, activeDreamers: 128500 },
    };
    return statsData[period];
};
