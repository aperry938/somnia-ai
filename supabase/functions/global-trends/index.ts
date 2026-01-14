// Supabase Edge Function: Global Dream Trends API
// Returns aggregated, anonymized dream trends across all opted-in users

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GlobalTrend {
    topic: string;
    percentage: number;
    change: 'up' | 'down' | 'stable';
    sentiment: 'positive' | 'negative' | 'neutral';
}

interface GlobalStats {
    avgSleepTime: string;
    avgQuality: number;
    activeDreamers: number;
}

interface CountryTopDream {
    country: string;
    country_code: string;
    top_dream: string;
    dreamers: number;
}

interface GlobalTrendsResponse {
    success: boolean;
    data?: {
        trends: GlobalTrend[];
        stats: GlobalStats;
        countryTopDreams?: { country: string; countryCode: string; topDream: string; dreamers: number }[];
        cachedAt: string;
        period: string;
    };
    error?: string;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const period = url.searchParams.get('period') || 'week';

        // Validate period
        const validPeriods = ['today', 'week', 'month', 'all-time'];
        if (!validPeriods.includes(period)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
                } satisfies GlobalTrendsResponse),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Call the aggregation functions in parallel
        const [trendsResult, countryDreamsResult] = await Promise.all([
            supabase.rpc('get_global_trends', { time_period: period }),
            supabase.rpc('get_country_top_dreams')
        ]);

        if (trendsResult.error) {
            console.error('Database error:', trendsResult.error);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Failed to fetch global trends'
                } satisfies GlobalTrendsResponse),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Transform country top dreams to camelCase for client
        const countryTopDreams = (countryDreamsResult.data as CountryTopDream[] || []).map(d => ({
            country: d.country,
            countryCode: d.country_code,
            topDream: d.top_dream,
            dreamers: Number(d.dreamers)
        }));

        const data = trendsResult.data;

        // Transform and return data
        const row = data?.[0];
        if (!row) {
            // Return default mock data if no data available yet
            return new Response(
                JSON.stringify({
                    success: true,
                    data: {
                        trends: getDefaultTrends(period),
                        stats: getDefaultStats(period),
                        countryTopDreams: countryTopDreams.length > 0 ? countryTopDreams : getDefaultCountryTopDreams(),
                        cachedAt: new Date().toISOString(),
                        period
                    }
                } satisfies GlobalTrendsResponse),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    trends: row.trends || [],
                    stats: row.stats || getDefaultStats(period),
                    countryTopDreams: countryTopDreams.length > 0 ? countryTopDreams : getDefaultCountryTopDreams(),
                    cachedAt: row.cached_at || new Date().toISOString(),
                    period
                }
            } satisfies GlobalTrendsResponse),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (err) {
        console.error('Unexpected error:', err);
        return new Response(
            JSON.stringify({
                success: false,
                error: 'Internal server error'
            } satisfies GlobalTrendsResponse),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});

// Default trends when database is empty or during bootstrap
function getDefaultTrends(period: string): GlobalTrend[] {
    const defaultTrends: Record<string, GlobalTrend[]> = {
        'today': [
            { topic: 'Flying', percentage: 38, change: 'up', sentiment: 'positive' },
            { topic: 'Work Stress', percentage: 31, change: 'up', sentiment: 'negative' },
            { topic: 'Family', percentage: 22, change: 'stable', sentiment: 'positive' },
        ],
        'week': [
            { topic: 'Flying', percentage: 42, change: 'up', sentiment: 'positive' },
            { topic: 'Water/Ocean', percentage: 28, change: 'stable', sentiment: 'neutral' },
            { topic: 'Being Chased', percentage: 15, change: 'down', sentiment: 'negative' },
        ],
        'month': [
            { topic: 'Flying', percentage: 45, change: 'stable', sentiment: 'positive' },
            { topic: 'Falling', percentage: 32, change: 'up', sentiment: 'negative' },
            { topic: 'Water/Ocean', percentage: 30, change: 'up', sentiment: 'neutral' },
        ],
        'all-time': [
            { topic: 'Flying', percentage: 48, change: 'stable', sentiment: 'positive' },
            { topic: 'Water/Ocean', percentage: 35, change: 'stable', sentiment: 'neutral' },
            { topic: 'Being Chased', percentage: 28, change: 'stable', sentiment: 'negative' },
        ],
    };
    return defaultTrends[period] || defaultTrends['week'];
}

function getDefaultStats(period: string): GlobalStats {
    const defaultStats: Record<string, GlobalStats> = {
        'today': { avgSleepTime: '7h 08m', avgQuality: 3.7, activeDreamers: 0 },
        'week': { avgSleepTime: '7h 12m', avgQuality: 3.8, activeDreamers: 0 },
        'month': { avgSleepTime: '7h 18m', avgQuality: 3.9, activeDreamers: 0 },
        'all-time': { avgSleepTime: '7h 14m', avgQuality: 3.85, activeDreamers: 0 },
    };
    return defaultStats[period] || defaultStats['week'];
}

// Default country top dreams when database is empty
function getDefaultCountryTopDreams(): { country: string; countryCode: string; topDream: string; dreamers: number }[] {
    return [
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
}
