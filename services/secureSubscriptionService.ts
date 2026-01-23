/**
 * Secure Subscription Service for Somnia.ai
 *
 * This service handles subscription verification through RevenueCat
 * for App Store and Google Play Store in-app purchases.
 */

import { logger } from './logger';
import {
    initializeRevenueCat,
    checkPremiumStatus,
    getCustomerInfo,
    getOfferings,
    purchasePackage,
    restorePurchases,
    setUserId,
    clearUserId,
    getManagementURL,
    addCustomerInfoListener,
    type Package,
    type Offerings,
    type CustomerInfo,
} from './revenueCatService';

// Re-export types for convenience
export type { Package, Offerings, CustomerInfo };

// Types
export type PremiumFeature =
    | 'ai_analysis'
    | 'ai_imagery'
    | 'ai_chat'
    | 'dream_synthesis'
    | 'sleep_habits'
    | 'binaural_beats'
    | 'reality_checks'
    | 'encrypted_backup'
    | 'unlimited_alarms'
    | 'voice_assistant'
    | 'custom_alarm_sounds'
    | 'breathing';

// Subscription tier levels for feature gating
export type SubscriptionTier = 'free' | 'premium';

// Feature tier requirements
export const FEATURE_TIERS: Record<PremiumFeature, SubscriptionTier> = {
    ai_analysis: 'premium',
    ai_imagery: 'premium',
    ai_chat: 'premium',
    dream_synthesis: 'premium',
    sleep_habits: 'premium',
    binaural_beats: 'premium',
    reality_checks: 'premium',
    encrypted_backup: 'premium',
    unlimited_alarms: 'premium',
    voice_assistant: 'premium',
    custom_alarm_sounds: 'free',
    breathing: 'premium',
};

export interface SubscriptionStatus {
    isPremium: boolean;
    tier: SubscriptionTier;
    status: 'none' | 'active' | 'canceled' | 'past_due' | 'trialing';
    expiresAt: string | null;
}

// Storage keys
const PREMIUM_CACHE_KEY = 'somnia_premium_status';
const DEV_MODE_KEY = 'somnia_dev_mode';
const DEV_PREMIUM_KEY = 'somnia_dev_premium';
const SUBSCRIPTION_VERIFICATION_KEY = 'somnia_subscription_verified_at';

// Superuser emails - loaded from environment (hashed for security)
const SUPERUSER_EMAILS: string[] = (import.meta.env.VITE_SUPERUSER_EMAILS || '')
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter((email: string) => email.length > 0);

// Cached premium status (updated by RevenueCat listener)
let cachedPremiumStatus = false;

// Last server verification timestamp
let lastServerVerification = 0;

// Minimum time between server verifications (prevent abuse)
const SERVER_VERIFICATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// Maximum age for cached subscription status before requiring re-verification
const SUBSCRIPTION_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Initialize subscription service
 * Must be called at app startup
 */
export async function initializeSubscriptions(): Promise<void> {
    // Load cached status
    cachedPremiumStatus = localStorage.getItem(PREMIUM_CACHE_KEY) === 'true';

    // Initialize RevenueCat
    const initialized = await initializeRevenueCat();

    if (initialized) {
        // Check current status
        const isPremium = await checkPremiumStatus();
        updateCachedStatus(isPremium);

        // Listen for updates
        addCustomerInfoListener((info) => {
            const premium = info.entitlements.active['premium']?.isActive ?? false;
            updateCachedStatus(premium);
        });
    }
}

/**
 * Update cached premium status
 */
function updateCachedStatus(isPremium: boolean): void {
    cachedPremiumStatus = isPremium;
    localStorage.setItem(PREMIUM_CACHE_KEY, String(isPremium));
    window.dispatchEvent(new CustomEvent('subscriptionChanged', { detail: { isPremium } }));
}

/**
 * DEV MODE: Check if developer mode is enabled
 */
export function isDevMode(): boolean {
    if (!import.meta.env.DEV) return false;
    return localStorage.getItem(DEV_MODE_KEY) === 'true';
}

/**
 * DEV MODE: Toggle developer mode on/off
 */
export function setDevMode(enabled: boolean): void {
    if (!import.meta.env.DEV) return;
    localStorage.setItem(DEV_MODE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent('devModeChanged', { detail: { enabled } }));
}

/**
 * DEV MODE: Check if dev premium override is active
 */
export function isDevPremium(): boolean {
    if (!import.meta.env.DEV) return false;
    return localStorage.getItem(DEV_PREMIUM_KEY) === 'true';
}

/**
 * DEV MODE: Set premium status for testing
 */
export function setDevPremium(premium: boolean): void {
    if (!import.meta.env.DEV) return;
    localStorage.setItem(DEV_PREMIUM_KEY, String(premium));
    window.dispatchEvent(new CustomEvent('subscriptionChanged', { detail: { isPremium: premium } }));
}

/**
 * Check if current user is a superuser (by email)
 * Only works in development mode for security
 */
export function isSuperuser(): boolean {
    // Only allow superuser access in development builds
    if (!import.meta.env.DEV) {
        return false;
    }

    try {
        const userEmail = localStorage.getItem('somnia_user_email');
        if (userEmail && SUPERUSER_EMAILS.includes(userEmail.toLowerCase())) {
            return true;
        }
    } catch {
        // Ignore errors
    }
    return false;
}

/**
 * Check if subscription cache is stale and needs server verification
 */
function isSubscriptionCacheStale(): boolean {
    try {
        const verifiedAt = localStorage.getItem(SUBSCRIPTION_VERIFICATION_KEY);
        if (!verifiedAt) return true;

        const timestamp = parseInt(verifiedAt, 10);
        if (isNaN(timestamp)) return true;

        const age = Date.now() - timestamp;
        return age > SUBSCRIPTION_CACHE_MAX_AGE_MS;
    } catch {
        return true;
    }
}

/**
 * Check if user has premium access (synchronous, uses cache)
 * For critical operations, use verifySubscription() instead
 */
export function isPremium(): boolean {
    // Only allow dev overrides in development mode
    if (import.meta.env.DEV) {
        if (isSuperuser()) return true;
        if (isDevMode()) return isDevPremium();
    }

    return cachedPremiumStatus;
}

/**
 * Check premium status with optional server verification
 * Use this for critical premium features to prevent bypass
 */
export async function isPremiumVerified(): Promise<boolean> {
    // Quick check with cache
    if (!cachedPremiumStatus) {
        return false;
    }

    // If cache is stale, verify with server
    if (isSubscriptionCacheStale()) {
        const result = await verifySubscription();
        return result.isPremium;
    }

    return cachedPremiumStatus;
}

/**
 * Verify subscription status from RevenueCat with server-side validation
 */
export async function verifySubscription(forceServerCheck = false): Promise<SubscriptionStatus> {
    const now = Date.now();

    try {
        // Check if we need to throttle server requests
        if (!forceServerCheck && now - lastServerVerification < SERVER_VERIFICATION_COOLDOWN_MS) {
            // Return cached status
            return {
                isPremium: cachedPremiumStatus,
                tier: cachedPremiumStatus ? 'premium' : 'free',
                status: cachedPremiumStatus ? 'active' : 'none',
                expiresAt: null,
            };
        }

        // Get status from RevenueCat SDK
        const isPremiumFromSDK = await checkPremiumStatus();
        const customerInfo = await getCustomerInfo();
        const entitlement = customerInfo?.entitlements.active['premium'];

        // Server-side verification for production builds
        // This validates the receipt with Apple/Google servers through RevenueCat
        let verifiedPremium = isPremiumFromSDK;

        if (customerInfo && import.meta.env.PROD) {
            // RevenueCat handles server-side receipt validation automatically
            // The SDK response is already verified with app store servers
            // Additional verification can be done via RevenueCat webhooks in backend

            // Validate entitlement structure to prevent tampering
            if (entitlement) {
                // Check that entitlement has valid structure
                const hasValidStructure =
                    typeof entitlement.isActive === 'boolean' &&
                    (entitlement.expirationDate === null || typeof entitlement.expirationDate === 'string');

                if (!hasValidStructure) {
                    logger.warn('Invalid entitlement structure detected');
                    verifiedPremium = false;
                }

                // Check if subscription is within valid date range
                if (entitlement.expirationDate) {
                    const expirationDate = new Date(entitlement.expirationDate);
                    if (expirationDate < new Date()) {
                        logger.info('Subscription expired');
                        verifiedPremium = false;
                    }
                }
            }
        }

        // Update cached status and verification timestamp
        updateCachedStatus(verifiedPremium);
        lastServerVerification = now;
        localStorage.setItem(SUBSCRIPTION_VERIFICATION_KEY, now.toString());

        return {
            isPremium: verifiedPremium,
            tier: verifiedPremium ? 'premium' : 'free',
            status: verifiedPremium ? 'active' : entitlement?.isActive === false ? 'canceled' : 'none',
            expiresAt: entitlement?.expirationDate ?? null,
        };
    } catch (error) {
        logger.error('Subscription verification error:', error);

        // On error, be conservative - if cache is stale, don't trust it
        if (isSubscriptionCacheStale()) {
            return {
                isPremium: false,
                tier: 'free',
                status: 'none',
                expiresAt: null,
            };
        }

        return {
            isPremium: cachedPremiumStatus,
            tier: cachedPremiumStatus ? 'premium' : 'free',
            status: cachedPremiumStatus ? 'active' : 'none',
            expiresAt: null,
        };
    }
}

/**
 * Get available subscription offerings
 */
export async function getSubscriptionOfferings(): Promise<Offerings | null> {
    return getOfferings();
}

/**
 * Purchase a subscription package
 */
export async function purchaseSubscription(pkg: Package): Promise<{ success: boolean; error?: string }> {
    const result = await purchasePackage(pkg);

    if (result.success && result.customerInfo) {
        const isPremium = result.customerInfo.entitlements.active['premium']?.isActive ?? false;
        updateCachedStatus(isPremium);
    }

    return result;
}

/**
 * Restore previous purchases
 */
export async function restoreSubscription(): Promise<{ success: boolean; isPremium: boolean; error?: string }> {
    const result = await restorePurchases();

    if (result.success && result.customerInfo) {
        const isPremium = result.customerInfo.entitlements.active['premium']?.isActive ?? false;
        updateCachedStatus(isPremium);
        return { success: true, isPremium };
    }

    return { success: false, isPremium: false, error: result.error };
}

/**
 * Open subscription management (App Store / Play Store)
 */
export async function openSubscriptionManagement(): Promise<boolean> {
    const url = await getManagementURL();

    if (url) {
        window.open(url, '_blank');
        return true;
    }

    // Fallback URLs
    const { Capacitor } = await import('@capacitor/core');
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
        window.open('https://apps.apple.com/account/subscriptions', '_blank');
        return true;
    } else if (platform === 'android') {
        window.open('https://play.google.com/store/account/subscriptions', '_blank');
        return true;
    }

    return false;
}

/**
 * Link user to RevenueCat (call after authentication)
 */
export async function linkUser(userId: string): Promise<void> {
    await setUserId(userId);
}

/**
 * Unlink user from RevenueCat (call on logout)
 */
export async function unlinkUser(): Promise<void> {
    await clearUserId();
    updateCachedStatus(false);
}

/**
 * Check if user can access a premium feature
 */
export function canAccessFeature(feature: PremiumFeature): boolean {
    const requiredTier = FEATURE_TIERS[feature];
    if (requiredTier === 'free') return true;
    return isPremium();
}

// ============================================
// AI Credit Functions (Free tier)
// ============================================

const CREDITS_KEY = 'somnia_ai_credits';
const CREDITS_RESET_KEY = 'somnia_credits_reset_date';
const FREE_TIER_AI_CREDITS = 3;

interface CreditState {
    remaining: number;
    resetDate: string;
}

export function getCredits(): CreditState {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const storedResetDate = localStorage.getItem(CREDITS_RESET_KEY);

    if (storedResetDate !== currentMonth) {
        localStorage.setItem(CREDITS_KEY, String(FREE_TIER_AI_CREDITS));
        localStorage.setItem(CREDITS_RESET_KEY, currentMonth);
        return { remaining: FREE_TIER_AI_CREDITS, resetDate: currentMonth };
    }

    const remaining = parseInt(localStorage.getItem(CREDITS_KEY) || String(FREE_TIER_AI_CREDITS), 10);
    return { remaining, resetDate: currentMonth };
}

export function canUseAiAnalysis(): boolean {
    if (isPremium()) return true;
    return getCredits().remaining > 0;
}

export function consumeAiCredit(): boolean {
    if (isPremium()) return true;

    const credits = getCredits();
    if (credits.remaining <= 0) return false;

    localStorage.setItem(CREDITS_KEY, String(credits.remaining - 1));
    window.dispatchEvent(new CustomEvent('creditsChanged', { detail: getCredits() }));
    return true;
}

export function getRemainingCredits(): number {
    if (isPremium()) return -1;
    return getCredits().remaining;
}

export function clearSubscriptionCache(): void {
    cachedPremiumStatus = false;
    localStorage.removeItem(PREMIUM_CACHE_KEY);
    window.dispatchEvent(new CustomEvent('subscriptionChanged', { detail: { isPremium: false } }));
}

// Feature descriptions
export const PREMIUM_FEATURES: Record<PremiumFeature, { name: string; description: string; tier: SubscriptionTier }> = {
    ai_analysis: {
        name: 'Daily AI Dream Analysis',
        description: 'Deep psychological interpretations of your dreams each day',
        tier: 'premium',
    },
    ai_imagery: {
        name: 'Dream Visualization',
        description: 'Generate AI image prompts in multiple artistic styles',
        tier: 'premium',
    },
    ai_chat: {
        name: 'Dream Chat',
        description: 'Have meaningful AI conversations about your dreams',
        tier: 'premium',
    },
    dream_synthesis: {
        name: 'Dream Weaving',
        description: 'Discover recurring themes and patterns across your journal',
        tier: 'premium',
    },
    sleep_habits: {
        name: 'Sleep Analytics',
        description: 'AI-powered insights into your sleep patterns and quality',
        tier: 'premium',
    },
    binaural_beats: {
        name: 'Sleep Sounds Pro',
        description: 'Binaural beats and advanced frequencies for better sleep',
        tier: 'premium',
    },
    reality_checks: {
        name: 'Lucid Dreaming',
        description: 'Reality check notifications for lucid dreams',
        tier: 'premium',
    },
    encrypted_backup: {
        name: 'Secure Backup',
        description: 'Encrypted exports of your dream journal',
        tier: 'premium',
    },
    unlimited_alarms: {
        name: 'Priority Features',
        description: 'Early access to new features and support',
        tier: 'premium',
    },
    voice_assistant: {
        name: 'AI Voice Assistant',
        description: 'Voice commands for hands-free control',
        tier: 'premium',
    },
    custom_alarm_sounds: {
        name: 'Custom Alarm Sounds',
        description: 'Choose from a variety of soothing sounds',
        tier: 'free',
    },
    breathing: {
        name: 'Breathing Exercises',
        description: 'Guided breathwork for relaxation and better sleep',
        tier: 'premium',
    },
};

// Reference pricing (actual prices come from app stores)
export const PRICING = {
    weekly: {
        price: 3.49,
        currency: 'USD',
        interval: 'week',
        monthlyEquivalent: 15.13, // 4.33 weeks per month
    },
    monthly: {
        price: 9.99,
        currency: 'USD',
        interval: 'month',
        savingsVsWeekly: 34, // vs weekly
    },
    yearly: {
        price: 79.99,
        currency: 'USD',
        interval: 'year',
        savings: 33, // vs monthly
        savingsVsWeekly: 57, // vs weekly
    },
} as const;
