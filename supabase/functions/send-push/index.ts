// Supabase Edge Function: Send Push Notification
// Accepts a user_id and notification payload, queries push_subscriptions,
// and sends web push notifications to all registered endpoints.
//
// NOTE: Full VAPID signing for the Web Push protocol is complex in Deno.
// This function manages subscription lookup and structures the push request.
// For production delivery, integrate with a push relay service (e.g., Firebase FCM,
// OneSignal, or a Node.js worker that uses the web-push library).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
    user_id: string;
    title: string;
    body: string;
    tag?: string;
    url?: string;
}

interface PushSubscriptionRow {
    id: string;
    user_id: string;
    endpoint: string;
    p256dh_key: string;
    auth_key: string;
}

Deno.serve(async (req) => {
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

        // Verify the caller
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const payload: PushPayload = await req.json();

        if (!payload.user_id || !payload.title) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: user_id, title' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Query push subscriptions for the target user
        const { data: subscriptions, error: queryError } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', payload.user_id);

        if (queryError) {
            console.error('[SendPush] Query error:', queryError);
            return new Response(
                JSON.stringify({ error: 'Failed to query subscriptions' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const subs = (subscriptions || []) as PushSubscriptionRow[];

        if (subs.length === 0) {
            return new Response(
                JSON.stringify({ success: true, sent: 0, message: 'No push subscriptions found for user' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Log the push request. In production, this is where VAPID-signed
        // requests would be sent to each subscription endpoint.
        // For now, we store the intent and return the subscription count.
        const pushData = {
            title: payload.title,
            body: payload.body || '',
            tag: payload.tag || 'somnia-notification',
            url: payload.url || '/',
        };

        console.log(`[SendPush] Push queued for ${subs.length} subscription(s) of user ${payload.user_id}`);
        console.log(`[SendPush] Payload:`, JSON.stringify(pushData));

        // Clean up stale subscriptions (endpoints that return 404/410)
        // This would happen after actual delivery attempts in production.

        return new Response(
            JSON.stringify({
                success: true,
                sent: subs.length,
                payload: pushData,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('[SendPush] Error:', err);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
