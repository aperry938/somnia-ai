// supabase/functions/stripe-webhook/index.ts
// Handles Stripe webhook events for subscription lifecycle

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Subscription status type
interface SubscriptionRecord {
    user_id: string;
    stripe_customer_id: string;
    stripe_subscription_id: string;
    tier: 'free' | 'premium';
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    current_period_end: string;
    created_at: string;
    updated_at: string;
}

serve(async (req) => {
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        return new Response('Missing stripe-signature header', { status: 400 });
    }

    try {
        const body = await req.text();
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

        // CRITICAL: Verify webhook signature to prevent spoofing
        const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

        console.log(`Processing webhook: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutComplete(session);
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdate(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionCanceled(subscription);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentFailed(invoice);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentSucceeded(invoice);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err) {
        console.error('Webhook error:', err);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
});

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!userId) {
        console.error('No user ID in checkout session');
        return;
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Store subscription in database
    const { error } = await supabase
        .from('subscriptions')
        .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            tier: 'premium',
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        });

    if (error) {
        console.error('Database error:', error);
        throw error;
    }

    console.log(`Premium activated for user: ${userId}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.userId;

    if (!userId) {
        console.error('No user ID in subscription metadata');
        return;
    }

    const { error } = await supabase
        .from('subscriptions')
        .update({
            status: subscription.status,
            tier: subscription.status === 'active' || subscription.status === 'trialing' ? 'premium' : 'free',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

    if (error) {
        console.error('Database error:', error);
    }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    const { error } = await supabase
        .from('subscriptions')
        .update({
            status: 'canceled',
            tier: 'free',
            updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

    if (error) {
        console.error('Database error:', error);
    }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    const { error } = await supabase
        .from('subscriptions')
        .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);

    if (error) {
        console.error('Database error:', error);
    }

    // TODO: Send email notification to user about failed payment
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    const { error } = await supabase
        .from('subscriptions')
        .update({
            status: 'active',
            tier: 'premium',
            updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);

    if (error) {
        console.error('Database error:', error);
    }
}
