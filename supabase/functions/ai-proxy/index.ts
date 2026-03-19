// Supabase Edge Function: AI Proxy
// Proxies Gemini API calls so the API key stays server-side.
// The client sends operation details; this function authenticates the user,
// enforces rate limits, calls Gemini, logs usage, and returns the response.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Operation = 'analyze' | 'chat' | 'synthesize' | 'habits' | 'image_prompt' | 'title' | 'embedding';

interface ProxyRequest {
    operation: Operation;
    model: string;
    contents: unknown[];
    config?: Record<string, unknown>;
    timeout?: number;
}

// Map operation -> rate-limit category used in the api_usage / check_user_rate_limit tables
const OPERATION_CATEGORY: Record<Operation, string> = {
    analyze: 'ai_analysis',
    chat: 'ai_chat',
    synthesize: 'ai_synthesis',
    habits: 'ai_analysis',
    image_prompt: 'ai_imagery',
    title: 'ai_analysis',
    embedding: 'ai_embedding',
};

// Per-user hourly limits (mirrors check-rate-limit edge function)
const HOURLY_LIMITS: Record<string, number> = {
    ai_analysis: 60,
    ai_imagery: 30,
    ai_chat: 120,
    ai_synthesis: 10,
    ai_embedding: 100,
};

const ALLOWED_MODELS = new Set([
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'text-embedding-004',
]);

const DEFAULT_TIMEOUT = 30_000;
const EXTENDED_TIMEOUT = 60_000;

// Operations that get an extended timeout by default
const EXTENDED_TIMEOUT_OPS = new Set<Operation>(['synthesize', 'habits']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

/**
 * Call the Gemini REST API directly (no SDK needed in Deno).
 */
async function callGemini(
    apiKey: string,
    model: string,
    contents: unknown[],
    config: Record<string, unknown> | undefined,
    timeoutMs: number,
    isEmbedding: boolean,
): Promise<Response> {
    const endpoint = isEmbedding ? 'embedContent' : 'generateContent';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${apiKey}`;

    // Build request body
    const body: Record<string, unknown> = { contents };
    if (config && !isEmbedding) {
        // Gemini REST API uses generationConfig at the top level
        const { responseMimeType, responseSchema, ...rest } = config;
        const generationConfig: Record<string, unknown> = { ...rest };
        if (responseMimeType) generationConfig.responseMimeType = responseMimeType;
        if (responseSchema) generationConfig.responseSchema = responseSchema;
        body.generationConfig = generationConfig;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timer);
    }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
        // ------------------------------------------------------------------
        // 1. Authenticate
        // ------------------------------------------------------------------
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return jsonResponse({ error: 'Missing authorization' }, 401);
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return jsonResponse({ error: 'Invalid token' }, 401);
        }

        // ------------------------------------------------------------------
        // 2. Validate request body
        // ------------------------------------------------------------------
        const body: ProxyRequest = await req.json();
        const { operation, model, contents, config, timeout } = body;

        if (!operation || !OPERATION_CATEGORY[operation]) {
            return jsonResponse({ error: 'Invalid operation' }, 400);
        }
        if (!model || !ALLOWED_MODELS.has(model)) {
            return jsonResponse({ error: `Invalid model: ${model}` }, 400);
        }
        if (!contents || !Array.isArray(contents) || contents.length === 0) {
            return jsonResponse({ error: 'Contents array is required' }, 400);
        }

        // ------------------------------------------------------------------
        // 3. Rate limit (check usage in last hour)
        // ------------------------------------------------------------------
        const category = OPERATION_CATEGORY[operation];
        const maxPerHour = HOURLY_LIMITS[category] ?? 60;

        const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
        const { count: usageCount, error: countError } = await supabase
            .from('api_usage')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('category', category)
            .gte('created_at', oneHourAgo);

        if (!countError && usageCount !== null && usageCount >= maxPerHour) {
            return jsonResponse({
                error: 'Rate limit exceeded',
                category,
                limit: maxPerHour,
                resetIn: 3600_000, // approximate
            }, 429);
        }

        // ------------------------------------------------------------------
        // 4. Call Gemini
        // ------------------------------------------------------------------
        const geminiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiKey) {
            console.error('GEMINI_API_KEY not set in edge function secrets');
            return jsonResponse({ error: 'AI service not configured' }, 503);
        }

        const isEmbedding = operation === 'embedding';
        const defaultTimeout = EXTENDED_TIMEOUT_OPS.has(operation)
            ? EXTENDED_TIMEOUT
            : DEFAULT_TIMEOUT;
        const timeoutMs = timeout ?? defaultTimeout;

        let geminiResponse: Response;
        try {
            geminiResponse = await callGemini(
                geminiKey,
                model,
                contents,
                config as Record<string, unknown> | undefined,
                timeoutMs,
                isEmbedding,
            );
        } catch (err) {
            // Timeout or network error calling Gemini
            const msg = (err as Error).message || '';
            if (msg.includes('abort')) {
                return jsonResponse({ error: 'AI request timed out' }, 504);
            }
            console.error('Gemini call failed:', err);
            return jsonResponse({ error: 'AI service unavailable' }, 502);
        }

        // ------------------------------------------------------------------
        // 5. Handle Gemini error responses
        // ------------------------------------------------------------------
        if (!geminiResponse.ok) {
            const errBody = await geminiResponse.text();
            console.error(`Gemini returned ${geminiResponse.status}:`, errBody.slice(0, 500));

            if (geminiResponse.status === 429) {
                return jsonResponse({ error: 'AI rate limit exceeded' }, 429);
            }
            return jsonResponse({
                error: 'AI service error',
                status: geminiResponse.status,
            }, 502);
        }

        // ------------------------------------------------------------------
        // 6. Return response & log usage (fire-and-forget)
        // ------------------------------------------------------------------
        const geminiData = await geminiResponse.json();

        // Fire-and-forget usage log (don't await)
        const estimatedTokens = JSON.stringify(contents).length / 4;
        supabase.from('api_usage').insert({
            user_id: user.id,
            category,
            model,
            estimated_tokens: Math.ceil(estimatedTokens),
        }).then(() => { /* logged */ }).catch(() => { /* ignore */ });

        return jsonResponse(geminiData);

    } catch (err) {
        console.error('AI proxy error:', err);
        return jsonResponse({ error: 'Internal server error' }, 500);
    }
});
