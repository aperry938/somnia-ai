// supabase/functions/verify-subscription/index.ts
// Verifies subscription status and returns signed JWT token

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { create, verify, getNumericDate } from 'https://deno.land/x/djwt@v3.0.1/mod.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate crypto key for JWT signing
async function getJwtKey() {
    const secret = Deno.env.get('JWT_SECRET')!;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get user ID from authorization header (Supabase JWT)
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify Supabase JWT and get user
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid authorization token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get subscription from database
        const { data: subscription, error: dbError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Determine subscription status
        let tier: 'free' | 'premium' = 'free';
        let expiresAt: Date | null = null;
        let status = 'none';

        if (subscription && !dbError) {
            const periodEnd = new Date(subscription.current_period_end);

            if (subscription.status === 'active' || subscription.status === 'trialing') {
                if (periodEnd > new Date()) {
                    tier = 'premium';
                    expiresAt = periodEnd;
                    status = subscription.status;
                }
            }
        }

        // Generate signed JWT token (valid for 1 hour)
        const key = await getJwtKey();
        const now = new Date();
        const exp = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

        const subscriptionToken = await create(
            { alg: 'HS256', typ: 'JWT' },
            {
                sub: user.id,
                tier,
                status,
                expiresAt: expiresAt?.toISOString() || null,
                iat: getNumericDate(now),
                exp: getNumericDate(exp),
            },
            key
        );

        return new Response(
            JSON.stringify({
                isPremium: tier === 'premium',
                tier,
                status,
                expiresAt: expiresAt?.toISOString() || null,
                token: subscriptionToken,
                tokenExpiresAt: exp.toISOString(),
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('Verify subscription error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
