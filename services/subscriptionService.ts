/**
 * Subscription Service for Somnia.ai
 * Manages freemium tier logic and premium feature access
 */

// Premium feature identifiers
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

// Subscription state
export interface SubscriptionState {
    tier: 'free' | 'premium';
    expiresAt: string | null;
    source: 'none' | 'stripe' | 'apple' | 'google' | 'promotional';
    trialEndsAt: string | null;
}

// Premium tier pricing
export const PRICING = {
    monthly: {
        price: 4.99,
        currency: 'USD',
        interval: 'month',
        stripePriceId: 'price_monthly_placeholder', // Replace with real Stripe ID
    },
    yearly: {
        price: 39.99,
        currency: 'USD',
        interval: 'year',
        savings: 33, // percentage
        stripePriceId: 'price_yearly_placeholder', // Replace with real Stripe ID
    },
} as const;

// Feature descriptions for paywall
export const PREMIUM_FEATURES: Record<PremiumFeature, { name: string; description: string }> = {
    ai_analysis: {
        name: 'AI Dream Analysis',
        description: 'Deep psychological interpretation of your dreams by The Oneironaut',
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
        name: 'Unlimited Alarms',
        description: 'Create as many alarms as you need (free tier: 3 max)',
    },
};

// Free tier limits
export const FREE_TIER_LIMITS = {
    maxAlarms: 3,
    maxSoundscapes: ['white', 'pink', 'brown'], // Only noise types, no binaural
} as const;

// Local storage key
const SUBSCRIPTION_KEY = 'somnia_subscription';

/**
 * Get current subscription state from localStorage
 */
export const getSubscriptionState = (): SubscriptionState => {
    try {
        const stored = localStorage.getItem(SUBSCRIPTION_KEY);
        if (stored) {
            const state = JSON.parse(stored) as SubscriptionState;
            // Check if subscription has expired
            if (state.expiresAt && new Date(state.expiresAt) < new Date()) {
                return { tier: 'free', expiresAt: null, source: 'none', trialEndsAt: null };
            }
            return state;
        }
    } catch (e) {
        console.error('Error reading subscription state:', e);
    }
    return { tier: 'free', expiresAt: null, source: 'none', trialEndsAt: null };
};

/**
 * Check if user has premium access
 */
export const isPremium = (): boolean => {
    const state = getSubscriptionState();
    return state.tier === 'premium';
};

/**
 * Check if a specific feature requires premium
 */
export const requiresPremium = (feature: PremiumFeature): boolean => {
    // All features in PremiumFeature type require premium
    return true;
};

/**
 * Check if user can access a premium feature
 */
export const canAccessFeature = (feature: PremiumFeature): boolean => {
    if (!requiresPremium(feature)) return true;
    return isPremium();
};

/**
 * Save subscription state to localStorage
 * (For dev/testing - real subscriptions would be verified server-side)
 */
export const setSubscriptionState = (state: SubscriptionState): void => {
    localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(state));
    // Dispatch event so UI can react
    window.dispatchEvent(new CustomEvent('subscriptionChanged', { detail: state }));
};

/**
 * Activate a promotional/dev premium subscription
 * (For testing purposes)
 */
export const activatePromotionalPremium = (durationDays: number = 30): void => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    setSubscriptionState({
        tier: 'premium',
        expiresAt: expiresAt.toISOString(),
        source: 'promotional',
        trialEndsAt: null,
    });
};

/**
 * Start a free trial
 */
export const startFreeTrial = (durationDays: number = 7): boolean => {
    const current = getSubscriptionState();

    // Can't start trial if already used
    if (current.trialEndsAt) {
        return false;
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + durationDays);

    setSubscriptionState({
        tier: 'premium',
        expiresAt: trialEnd.toISOString(),
        source: 'promotional',
        trialEndsAt: trialEnd.toISOString(),
    });

    return true;
};

/**
 * Check if user has used their free trial
 */
export const hasUsedTrial = (): boolean => {
    const state = getSubscriptionState();
    return state.trialEndsAt !== null;
};

/**
 * Reset subscription to free (for testing)
 */
export const resetToFree = (): void => {
    localStorage.removeItem(SUBSCRIPTION_KEY);
    window.dispatchEvent(new CustomEvent('subscriptionChanged', { detail: getSubscriptionState() }));
};

/**
 * Error thrown when premium feature is accessed without subscription
 */
export class PremiumRequiredError extends Error {
    feature: PremiumFeature;

    constructor(feature: PremiumFeature) {
        super(`Premium subscription required for: ${PREMIUM_FEATURES[feature].name}`);
        this.name = 'PremiumRequiredError';
        this.feature = feature;
    }
}

/**
 * Guard function to wrap premium features
 * Throws PremiumRequiredError if not subscribed
 */
export const requirePremium = (feature: PremiumFeature): void => {
    if (!canAccessFeature(feature)) {
        throw new PremiumRequiredError(feature);
    }
};
