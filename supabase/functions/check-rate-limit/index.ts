// Supabase Edge Function: Rate Limit Check + API Usage Logging
// Authenticated users call this to check rate limits and log API usage

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Server-side rate limits (per user, per window)
const SERVER_RATE_LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
    ai_analysis: { maxRequests: 60, windowSeconds: 3600 },     // 60 per hour
    ai_imagery: { maxRequests: 30, windowSeconds: 3600 },      // 30 per hour
    ai_chat: { maxRequests: 120, windowSeconds: 3600 },        // 120 per hour
    ai_synthesis: { maxRequests: 10, windowSeconds: 3600 },    // 10 per hour
    ai_embedding: { maxRequests: 100, windowSeconds: 3600 },   // 100 per hour
};

interface RequestBody {
    category: string;
    estimated_tokens?: number;
    model?: string;
    action?: 'check' | 'log';  // 'check' = check + log, 'log' = log only (fire-and-forget)
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        // Authenticate user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const body: RequestBody = await req.json();
        const { category, estimated_tokens, model, action = 'check' } = body;

        if (!category) {
            return new Response(
                JSON.stringify({ error: 'Category required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Log-only mode: just insert the usage record and return
        if (action === 'log') {
            await supabase.from('api_usage').insert({
                user_id: user.id,
                category,
                model: model || null,
                estimated_tokens: estimated_tokens || 0,
            });

            return new Response(
                JSON.stringify({ logged: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check mode: verify rate limit, then log if allowed
        const limits = SERVER_RATE_LIMITS[category];
        if (!limits) {
            // Unknown category — allow but log
            await supabase.from('api_usage').insert({
                user_id: user.id,
                category,
                model: model || null,
                estimated_tokens: estimated_tokens || 0,
            });

            return new Response(
                JSON.stringify({ allowed: true, remaining: -1 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check rate limit via database function
        const { data: rateData, error: rateError } = await supabase
            .rpc('check_user_rate_limit', {
                user_id_input: user.id,
                category_input: category,
                window_seconds: limits.windowSeconds,
                max_requests: limits.maxRequests,
            })
            .single();

        if (rateError) {
            console.error('Rate limit check error:', rateError);
            // On error, allow the request (fail open) but don't log
            return new Response(
                JSON.stringify({ allowed: true, remaining: -1, error: 'check_failed' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!rateData.allowed) {
            const resetIn = new Date(rateData.reset_at).getTime() - Date.now();
            return new Response(
                JSON.stringify({
                    allowed: false,
                    remaining: 0,
                    resetIn: Math.max(0, resetIn),
                    count: Number(rateData.current_count),
                }),
                { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Allowed — log the usage
        await supabase.from('api_usage').insert({
            user_id: user.id,
            category,
            model: model || null,
            estimated_tokens: estimated_tokens || 0,
        });

        const remaining = limits.maxRequests - Number(rateData.current_count) - 1;

        return new Response(
            JSON.stringify({
                allowed: true,
                remaining: Math.max(0, remaining),
                count: Number(rateData.current_count) + 1,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('Rate limit error:', err);
        // Fail open — don't block users on infrastructure errors
        return new Response(
            JSON.stringify({ allowed: true, remaining: -1, error: 'internal' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
