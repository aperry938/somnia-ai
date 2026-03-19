/**
 * Push Subscription Service
 *
 * Manages Web Push notification subscriptions.
 * Handles permission requests, service worker registration,
 * PushManager subscription, and server-side storage via Supabase.
 */

import { logger } from './logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/** Whether the current browser supports push notifications */
export function isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

/** Get the current Notification permission state */
export function getPushPermissionState(): NotificationPermission | 'unsupported' {
    if (!isPushSupported()) return 'unsupported';
    return Notification.permission;
}

/** Check if there is an active push subscription */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
    if (!isPushSupported()) return null;

    try {
        const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
        if (!registration) return null;
        return await registration.pushManager.getSubscription();
    } catch (error) {
        logger.error('[PushSubscription] Failed to get existing subscription:', error);
        return null;
    }
}

/**
 * Convert a base64 VAPID key to a Uint8Array for PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function getAuthToken(): string | null {
    try {
        const session = JSON.parse(localStorage.getItem('somnia_supabase_session') || '');
        return session?.access_token || null;
    } catch {
        return null;
    }
}

/**
 * Subscribe to push notifications.
 * 1. Requests notification permission
 * 2. Registers the push service worker
 * 3. Subscribes via PushManager with VAPID key
 * 4. Saves subscription to server
 *
 * @returns The PushSubscription if successful, null otherwise
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
    if (!isPushSupported()) {
        logger.warn('[PushSubscription] Push not supported in this browser');
        return null;
    }

    if (!VAPID_PUBLIC_KEY) {
        logger.error('[PushSubscription] VITE_VAPID_PUBLIC_KEY not configured');
        return null;
    }

    try {
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            logger.info('[PushSubscription] Permission denied by user');
            return null;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw-push.js', {
            scope: '/',
        });

        // Wait for SW to be ready
        await navigator.serviceWorker.ready;

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        // Save to server
        const saved = await savePushSubscription(subscription);
        if (!saved) {
            logger.warn('[PushSubscription] Subscribed locally but failed to save to server');
        }

        logger.info('[PushSubscription] Successfully subscribed');
        return subscription;
    } catch (error) {
        logger.error('[PushSubscription] Subscribe failed:', error);
        return null;
    }
}

/**
 * Unsubscribe from push notifications.
 * Removes the subscription locally and from the server.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    if (!isPushSupported()) return false;

    try {
        const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
        if (!registration) return true;

        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return true;

        // Remove from server first
        await removePushSubscription(subscription.endpoint);

        // Unsubscribe locally
        const success = await subscription.unsubscribe();
        if (success) {
            logger.info('[PushSubscription] Successfully unsubscribed');
        }
        return success;
    } catch (error) {
        logger.error('[PushSubscription] Unsubscribe failed:', error);
        return false;
    }
}

/**
 * Save a push subscription to Supabase for server-side push delivery.
 */
export async function savePushSubscription(subscription: PushSubscription): Promise<boolean> {
    const token = getAuthToken();
    if (!token || !SUPABASE_URL) {
        logger.warn('[PushSubscription] Cannot save: no auth token or Supabase URL');
        return false;
    }

    try {
        const keys = subscription.toJSON().keys;
        if (!keys) {
            logger.error('[PushSubscription] Subscription has no keys');
            return false;
        }

        // Get user ID
        const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY || '',
            },
        });
        if (!userResponse.ok) return false;
        const user = (await userResponse.json()) as { id: string };

        // Upsert subscription
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/push_subscriptions`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY || '',
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates',
                },
                body: JSON.stringify({
                    user_id: user.id,
                    endpoint: subscription.endpoint,
                    p256dh_key: keys.p256dh || '',
                    auth_key: keys.auth || '',
                }),
            }
        );

        return response.ok;
    } catch (error) {
        logger.error('[PushSubscription] Failed to save subscription:', error);
        return false;
    }
}

/**
 * Remove a push subscription from the server by endpoint.
 */
async function removePushSubscription(endpoint: string): Promise<boolean> {
    const token = getAuthToken();
    if (!token || !SUPABASE_URL) return false;

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY || '',
                },
            }
        );
        return response.ok;
    } catch (error) {
        logger.error('[PushSubscription] Failed to remove subscription:', error);
        return false;
    }
}
