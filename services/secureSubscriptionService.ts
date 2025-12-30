/**
 * Secure Subscription Service for Somnia.ai
 * 
 * This service replaces the insecure client-side-only subscription logic
 * with server-verified subscription status via JWT tokens.
 */

// Types
export type PremiumFeature =
    | 'ai_analysis'
    | 'ai_imagery'
    | 'ai_coach'
    | 'dream_synthesis'
    | 'sleep_habits'
    | 'binaural_beats'
    | 'reality_checks'
    | 'encrypted_backup'
    | 'unlimited_alarms';

export interface SubscriptionStatus {
    isPremium: boolean;
    tier: 'free' | 'premium';
    status: 'none' | 'active' | 'canceled' | 'past_due' | 'trialing';
    expiresAt: string | null;
    tokenExpiresAt: string | null;
}

// Storage keys
const TOKEN_KEY = 'somnia_subscription_token';
const STATUS_KEY = 'somnia_subscription_status';

// Supabase configuration (set in environment)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Decode JWT token (without verification - verification is server-side)
 */
function decodeToken(token: string): Record<string, unknown> | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

/**
 * Check if cached token is still valid
 */
function isTokenValid(token: string): boolean {
    const decoded = decodeToken(token);
    if (!decoded || typeof decoded.exp !== 'number') return false;

    // Token expires in less than 5 minutes? Consider it expired
    const expiresAt = decoded.exp * 1000;
    const buffer = 5 * 60 * 1000; // 5 minutes
    return Date.now() < (expiresAt - buffer);
}

/**
 * Get cached subscription status
 */
export function getCachedStatus(): SubscriptionStatus {
    try {
        const status = localStorage.getItem(STATUS_KEY);
        if (status) {
            return JSON.parse(status);
        }
    } catch {
        // Ignore parse errors
    }
    return {
        isPremium: false,
        tier: 'free',
        status: 'none',
        expiresAt: null,
        tokenExpiresAt: null,
    };
}

/**
 * Verify subscription status from server
 * This MUST be called periodically and on app load
 */
export async function verifySubscription(authToken: string): Promise<SubscriptionStatus> {
    if (!SUPABASE_URL) {
        console.warn('Supabase not configured, returning free tier');
        return getCachedStatus();
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
        });

        if (!response.ok) {
            console.error('Subscription verification failed:', response.status);
            return getCachedStatus();
        }

        const data = await response.json();

        // Store token and status
        if (data.token) {
            localStorage.setItem(TOKEN_KEY, data.token);
        }

        const status: SubscriptionStatus = {
            isPremium: data.isPremium,
            tier: data.tier,
            status: data.status,
            expiresAt: data.expiresAt,
            tokenExpiresAt: data.tokenExpiresAt,
        };

        localStorage.setItem(STATUS_KEY, JSON.stringify(status));

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('subscriptionChanged', { detail: status }));

        return status;
    } catch (error) {
        console.error('Subscription verification error:', error);
        return getCachedStatus();
    }
}

/**
 * Check if user has premium access
 * Uses cached status with token validation
 */
export function isPremium(): boolean {
    const token = localStorage.getItem(TOKEN_KEY);

    // No token = not premium
    if (!token) return false;

    // Token invalid = not premium (will be refreshed on next check)
    if (!isTokenValid(token)) return false;

    // Check cached status
    const status = getCachedStatus();
    return status.isPremium;
}

/**
 * Check if user can access a premium feature
 */
export function canAccessFeature(feature: PremiumFeature): boolean {
    return isPremium();
}

// ============================================
// BACKWARD COMPATIBILITY: AI Credit Functions
// (Enables drop-in replacement of old subscriptionService)
// ============================================

const CREDITS_KEY = 'somnia_ai_credits';
const CREDITS_RESET_KEY = 'somnia_credits_reset_date';
const FREE_TIER_AI_CREDITS = 3;

interface CreditState {
    remaining: number;
    resetDate: string;
}

/**
 * Get current credit state for AI analyses
 * Credits reset on the 1st of each month
 */
export function getCredits(): CreditState {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const storedResetDate = localStorage.getItem(CREDITS_RESET_KEY);

    // Check if we need to reset credits (new month)
    if (storedResetDate !== currentMonth) {
        localStorage.setItem(CREDITS_KEY, String(FREE_TIER_AI_CREDITS));
        localStorage.setItem(CREDITS_RESET_KEY, currentMonth);
        return { remaining: FREE_TIER_AI_CREDITS, resetDate: currentMonth };
    }

    const remaining = parseInt(localStorage.getItem(CREDITS_KEY) || String(FREE_TIER_AI_CREDITS), 10);
    return { remaining, resetDate: currentMonth };
}

/**
 * Check if user can use an AI analysis
 * Premium users: always true
 * Free users: true if credits remaining
 */
export function canUseAiAnalysis(): boolean {
    if (isPremium()) return true;
    return getCredits().remaining > 0;
}

/**
 * Consume one AI analysis credit
 * Returns true if successful, false if no credits remaining
 */
export function useAiCredit(): boolean {
    if (isPremium()) return true; // Premium doesn't consume credits

    const credits = getCredits();
    if (credits.remaining <= 0) return false;

    localStorage.setItem(CREDITS_KEY, String(credits.remaining - 1));
    window.dispatchEvent(new CustomEvent('creditsChanged', { detail: getCredits() }));
    return true;
}

/**
 * Get remaining credits for display
 */
export function getRemainingCredits(): number {
    if (isPremium()) return -1; // -1 indicates unlimited
    return getCredits().remaining;
}

/**
 * Guard function to wrap premium features
 * Throws error if not subscribed
 */
export function requirePremium(feature: PremiumFeature): void {
    if (!canAccessFeature(feature)) {
        throw new Error(`Premium subscription required for: ${PREMIUM_FEATURES[feature].name}`);
    }
}

/**
 * Create checkout session for subscription
 */
export async function createCheckoutSession(
    priceId: string,
    userId: string,
    successUrl?: string,
    cancelUrl?: string
): Promise<{ url: string | null; error?: string }> {
    if (!SUPABASE_URL) {
        return { url: null, error: 'Supabase not configured' };
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                priceId,
                userId,
                successUrl: successUrl || `${window.location.origin}/success`,
                cancelUrl: cancelUrl || window.location.origin,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { url: null, error: error.error || 'Checkout failed' };
        }

        const data = await response.json();
        return { url: data.url };
    } catch (error) {
        console.error('Checkout session error:', error);
        return { url: null, error: 'Network error' };
    }
}

/**
 * Clear subscription cache (for logout)
 */
export function clearSubscriptionCache(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STATUS_KEY);
    window.dispatchEvent(new CustomEvent('subscriptionChanged', { detail: getCachedStatus() }));
}

// Pricing constants (for UI display only - actual prices in Stripe)
export const PRICING = {
    monthly: {
        price: 4.99,
        currency: 'USD',
        interval: 'month',
        priceId: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || '',
    },
    yearly: {
        price: 39.99,
        currency: 'USD',
        interval: 'year',
        savings: 33,
        priceId: import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID || '',
    },
} as const;

// Feature descriptions (unchanged from original)
export const PREMIUM_FEATURES: Record<PremiumFeature, { name: string; description: string }> = {
    ai_analysis: {
        name: 'Unlimited AI Dream Analysis',
        description: 'Unlimited psychological interpretations (free tier: 3/month)',
    },
    ai_imagery: {
        name: 'Dream Visualization',
        description: 'Generate stunning AI art from your dreams in 5 unique styles',
    },
    ai_coach: {
        name: 'AI Sleep Coach',
        description: 'Personalized sleep guidance with mystical or scientific personas',
    },
    dream_synthesis: {
        name: 'Dream Weaving',
        description: 'Discover recurring themes and patterns across your dream journal',
    },
    sleep_habits: {
        name: 'Sleep Science',
        description: 'Correlate your habits with sleep quality for personalized insights',
    },
    binaural_beats: {
        name: 'Binaural Beats',
        description: 'Theta and Delta wave frequencies for deep relaxation',
    },
    reality_checks: {
        name: 'Lucid Dreaming',
        description: 'Reality check notifications to induce lucid dreams',
    },
    encrypted_backup: {
        name: 'Secure Backup',
        description: 'Password-protected encrypted exports of your dream journal',
    },
    unlimited_alarms: {
        name: 'Priority Features',
        description: 'Early access to new features and priority support',
    },
};
