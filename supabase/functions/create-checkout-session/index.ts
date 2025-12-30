// supabase/functions/create-checkout-session/index.ts
// Creates a Stripe checkout session for subscription purchases

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { priceId, userId, successUrl, cancelUrl } = await req.json();

        // Validate required fields
        if (!priceId || !userId) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: priceId, userId' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get price IDs from environment (set in Supabase dashboard)
        const validPriceIds = [
            Deno.env.get('STRIPE_MONTHLY_PRICE_ID'),
            Deno.env.get('STRIPE_YEARLY_PRICE_ID'),
        ];

        if (!validPriceIds.includes(priceId)) {
            return new Response(
                JSON.stringify({ error: 'Invalid price ID' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl || `${Deno.env.get('APP_URL')}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${Deno.env.get('APP_URL')}/`,
            client_reference_id: userId,
            metadata: {
                userId,
                source: 'somnia_app',
            },
            subscription_data: {
                metadata: {
                    userId,
                },
            },
            // Allow promotion codes
            allow_promotion_codes: true,
            // Collect billing address for tax purposes
            billing_address_collection: 'auto',
        });

        return new Response(
            JSON.stringify({
                sessionId: session.id,
                url: session.url
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('Checkout session error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
