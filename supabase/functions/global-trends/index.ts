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

interface GlobalTrendsResponse {
    success: boolean;
    data?: {
        trends: GlobalTrend[];
        stats: GlobalStats;
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

        // Call the aggregation function
        const { data, error } = await supabase.rpc('get_global_trends', {
            time_period: period
        });

        if (error) {
            console.error('Database error:', error);
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
