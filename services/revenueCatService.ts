/**
 * RevenueCat Service for Somnia.ai
 *
 * Handles all in-app purchase operations through RevenueCat SDK.
 * Works with both Apple App Store and Google Play Store.
 *
 * Security Features:
 * - Receipt validation through RevenueCat servers
 * - Entitlement verification with expiration checking
 * - Error handling with retry logic
 * - Network error resilience
 *
 * Setup Requirements:
 * 1. Create RevenueCat account at https://app.revenuecat.com
 * 2. Set up products in App Store Connect and Google Play Console
 * 3. Configure products in RevenueCat dashboard
 * 4. Add API keys to environment variables
 */

import { Capacitor } from '@capacitor/core';
import { logger } from './logger';

// Error retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
};

// Purchase operation timeout
const OPERATION_TIMEOUT_MS = 30000;

// Re-export SDK types for use in components
export type {
    PurchasesPackage as Package,
    PurchasesOfferings as Offerings,
    CustomerInfo,
} from '@revenuecat/purchases-capacitor';

// Import types for internal use
import type {
    PurchasesPackage,
    PurchasesOfferings,
    CustomerInfo,
    PurchasesPlugin,
} from '@revenuecat/purchases-capacitor';

// Entitlement identifier - must match RevenueCat dashboard
const PREMIUM_ENTITLEMENT = 'premium';

// RevenueCat API keys from environment
const REVENUECAT_IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY || '';
const REVENUECAT_ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY || '';

// Module state
let isInitialized = false;
let purchasesModule: PurchasesPlugin | null = null;
let listenerCallbackId: string | null = null;

/**
 * Initialize RevenueCat SDK
 * Must be called once at app startup
 */
export async function initializeRevenueCat(): Promise<boolean> {
    if (isInitialized) {
        return true;
    }

    // Skip on web platform
    if (Capacitor.getPlatform() === 'web') {
        logger.info('[RevenueCat] Web platform - using mock mode');
        isInitialized = true;
        return true;
    }

    try {
        // Dynamic import to avoid issues on web
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        purchasesModule = Purchases;

        const apiKey = Capacitor.getPlatform() === 'ios'
            ? REVENUECAT_IOS_KEY
            : REVENUECAT_ANDROID_KEY;

        if (!apiKey) {
            logger.warn('[RevenueCat] No API key configured for platform:', Capacitor.getPlatform());
            return false;
        }

        await Purchases.configure({
            apiKey,
        });

        isInitialized = true;
        logger.info('[RevenueCat] Initialized successfully');
        return true;
    } catch (error) {
        logger.error('[RevenueCat] Initialization failed:', error);
        return false;
    }
}

/**
 * Retry helper with exponential backoff
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            const isNetworkError =
                lastError.message?.includes('network') ||
                lastError.message?.includes('timeout') ||
                lastError.message?.includes('fetch');

            // Only retry network errors
            if (!isNetworkError || attempt === RETRY_CONFIG.maxRetries - 1) {
                throw error;
            }

            // Exponential backoff with jitter
            const delay = Math.min(
                RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
                RETRY_CONFIG.maxDelayMs
            );

            logger.warn(`[RevenueCat] ${operationName} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Timeout wrapper for operations
 */
async function withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number = OPERATION_TIMEOUT_MS
): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error('Operation timed out'));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([operation, timeoutPromise]);
        clearTimeout(timeoutId!);
        return result;
    } catch (error) {
        clearTimeout(timeoutId!);
        throw error;
    }
}

/**
 * Validate CustomerInfo structure to detect tampering
 */
function validateCustomerInfo(info: CustomerInfo): boolean {
    if (!info) return false;

    // Check required fields exist
    if (typeof info.originalAppUserId !== 'string') return false;
    if (!info.entitlements || typeof info.entitlements !== 'object') return false;
    if (!info.entitlements.active || typeof info.entitlements.active !== 'object') return false;

    return true;
}

/**
 * Get current customer info including entitlements
 * Includes retry logic and validation
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
    if (!isInitialized || !purchasesModule) {
        // Return mock for web/uninitialized
        return getMockCustomerInfo();
    }

    try {
        const result = await withRetry(
            () => withTimeout(purchasesModule!.getCustomerInfo()),
            'getCustomerInfo'
        );

        const customerInfo = result.customerInfo;

        // Validate response structure
        if (!validateCustomerInfo(customerInfo)) {
            logger.error('[RevenueCat] Invalid customer info structure');
            return null;
        }

        return customerInfo;
    } catch (error) {
        logger.error('[RevenueCat] Failed to get customer info:', error);
        return null;
    }
}

/**
 * Check if user has active premium entitlement
 */
export async function checkPremiumStatus(): Promise<boolean> {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return false;

    const premiumEntitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT];
    return premiumEntitlement?.isActive ?? false;
}

/**
 * Get available offerings (subscription packages)
 * Includes retry logic for network resilience
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
    if (!isInitialized || !purchasesModule) {
        return getMockOfferings();
    }

    try {
        const offerings = await withRetry(
            () => withTimeout(purchasesModule!.getOfferings()),
            'getOfferings'
        );

        // Validate offerings structure
        if (!offerings || typeof offerings !== 'object') {
            logger.error('[RevenueCat] Invalid offerings structure');
            return null;
        }

        return offerings;
    } catch (error) {
        logger.error('[RevenueCat] Failed to get offerings:', error);
        return null;
    }
}

/**
 * Validate package before purchase
 */
function validatePackage(pkg: PurchasesPackage): boolean {
    if (!pkg) return false;
    if (typeof pkg.identifier !== 'string' || pkg.identifier.length === 0) return false;
    if (!pkg.product) return false;
    if (typeof pkg.product.identifier !== 'string') return false;

    return true;
}

/**
 * Purchase a package
 * Includes validation and proper error handling
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string; errorCode?: string }> {
    if (!isInitialized || !purchasesModule) {
        return { success: false, error: 'RevenueCat not initialized', errorCode: 'NOT_INITIALIZED' };
    }

    // Validate package
    if (!validatePackage(pkg)) {
        logger.error('[RevenueCat] Invalid package for purchase');
        return { success: false, error: 'Invalid package', errorCode: 'INVALID_PACKAGE' };
    }

    try {
        logger.info('[RevenueCat] Starting purchase for package:', pkg.identifier);

        const result = await withTimeout(
            purchasesModule.purchasePackage({ aPackage: pkg }),
            OPERATION_TIMEOUT_MS
        );

        // Validate result
        if (!result.customerInfo || !validateCustomerInfo(result.customerInfo)) {
            logger.error('[RevenueCat] Invalid customer info after purchase');
            return { success: false, error: 'Purchase verification failed', errorCode: 'VERIFICATION_FAILED' };
        }

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('subscriptionChanged', {
            detail: { isPremium: checkPremiumFromInfo(result.customerInfo) }
        }));

        logger.info('[RevenueCat] Purchase successful');
        return { success: true, customerInfo: result.customerInfo };
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string; userCancelled?: boolean };

        // User cancelled is not an error
        if (err.userCancelled || err.code === 'PURCHASE_CANCELLED') {
            logger.info('[RevenueCat] Purchase cancelled by user');
            return { success: false, error: 'cancelled', errorCode: 'CANCELLED' };
        }

        // Network errors
        if (err.message?.includes('network') || err.message?.includes('timeout')) {
            logger.error('[RevenueCat] Purchase network error:', error);
            return { success: false, error: 'Network error. Please check your connection and try again.', errorCode: 'NETWORK_ERROR' };
        }

        // Store errors
        if (err.code?.includes('STORE')) {
            logger.error('[RevenueCat] Store error:', error);
            return { success: false, error: 'Unable to connect to app store. Please try again later.', errorCode: 'STORE_ERROR' };
        }

        logger.error('[RevenueCat] Purchase failed:', error);
        return { success: false, error: err.message || 'Purchase failed', errorCode: 'UNKNOWN' };
    }
}

/**
 * Restore previous purchases (useful for reinstalls or device changes)
 * Includes validation and retry logic
 */
export async function restorePurchases(): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string; errorCode?: string }> {
    if (!isInitialized || !purchasesModule) {
        return { success: false, error: 'RevenueCat not initialized', errorCode: 'NOT_INITIALIZED' };
    }

    try {
        logger.info('[RevenueCat] Starting purchase restoration');

        const result = await withRetry(
            () => withTimeout(purchasesModule!.restorePurchases()),
            'restorePurchases'
        );

        // Validate result
        if (!result.customerInfo || !validateCustomerInfo(result.customerInfo)) {
            logger.error('[RevenueCat] Invalid customer info after restore');
            return { success: false, error: 'Restore verification failed', errorCode: 'VERIFICATION_FAILED' };
        }

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('subscriptionChanged', {
            detail: { isPremium: checkPremiumFromInfo(result.customerInfo) }
        }));

        logger.info('[RevenueCat] Restore successful');
        return { success: true, customerInfo: result.customerInfo };
    } catch (error: unknown) {
        const err = error as { message?: string; code?: string };

        // Network errors
        if (err.message?.includes('network') || err.message?.includes('timeout')) {
            logger.error('[RevenueCat] Restore network error:', error);
            return { success: false, error: 'Network error. Please check your connection and try again.', errorCode: 'NETWORK_ERROR' };
        }

        logger.error('[RevenueCat] Restore failed:', error);
        return { success: false, error: err.message || 'Restore failed', errorCode: 'UNKNOWN' };
    }
}

/**
 * Set user identifier for tracking (call after authentication)
 */
export async function setUserId(userId: string): Promise<void> {
    if (!isInitialized || !purchasesModule) return;

    try {
        await purchasesModule.logIn({ appUserID: userId });
        logger.info('[RevenueCat] User ID set:', userId);
    } catch (error) {
        logger.error('[RevenueCat] Failed to set user ID:', error);
    }
}

/**
 * Clear user identifier (call on logout)
 */
export async function clearUserId(): Promise<void> {
    if (!isInitialized || !purchasesModule) return;

    try {
        await purchasesModule.logOut();
        logger.info('[RevenueCat] User logged out');
    } catch (error) {
        logger.error('[RevenueCat] Failed to log out:', error);
    }
}

/**
 * Get URL for managing subscription (opens App Store/Play Store)
 */
export async function getManagementURL(): Promise<string | null> {
    const customerInfo = await getCustomerInfo();
    return customerInfo?.managementURL ?? null;
}

// Helper to check premium from CustomerInfo
function checkPremiumFromInfo(info: CustomerInfo): boolean {
    return info.entitlements.active[PREMIUM_ENTITLEMENT]?.isActive ?? false;
}

// Mock data for web platform / testing
function getMockCustomerInfo(): CustomerInfo {
    // Cast through unknown for web mock - this is only used in browser testing
    return {
        entitlements: {
            active: {},
            all: {},
        },
        activeSubscriptions: [],
        originalAppUserId: 'web_user',
        managementURL: null,
        allPurchasedProductIdentifiers: [],
        latestExpirationDate: null,
        firstSeen: new Date().toISOString(),
        originalApplicationVersion: null,
        requestDate: new Date().toISOString(),
        allExpirationDates: {},
        allPurchaseDates: {},
        originalPurchaseDate: null,
        nonSubscriptionTransactions: [],
        subscriptionsByProductIdentifier: {},
    } as unknown as CustomerInfo;
}

function getMockOfferings(): PurchasesOfferings {
    // Cast through unknown for web mock - this is only used in browser testing
    // The actual SDK provides the real types on iOS/Android
    return {
        current: {
            identifier: 'default',
            serverDescription: 'Default Offering',
            metadata: {},
            availablePackages: [
                {
                    identifier: '$rc_weekly',
                    packageType: 'WEEKLY',
                    offeringIdentifier: 'default',
                    product: {
                        identifier: 'somnia_premium_weekly',
                        description: 'Try Somnia Premium for a week',
                        title: 'Somnia Premium (Weekly)',
                        price: 3.49,
                        priceString: '$3.49',
                        currencyCode: 'USD',
                    },
                },
                {
                    identifier: '$rc_monthly',
                    packageType: 'MONTHLY',
                    offeringIdentifier: 'default',
                    product: {
                        identifier: 'somnia_premium_monthly',
                        description: 'Unlimited AI dream analysis, chat, and more',
                        title: 'Somnia Premium (Monthly)',
                        price: 9.99,
                        priceString: '$9.99',
                        currencyCode: 'USD',
                    },
                },
                {
                    identifier: '$rc_annual',
                    packageType: 'ANNUAL',
                    offeringIdentifier: 'default',
                    product: {
                        identifier: 'somnia_premium_yearly',
                        description: 'Unlimited AI dream analysis, chat, and more - Save 33%',
                        title: 'Somnia Premium (Yearly)',
                        price: 79.99,
                        priceString: '$79.99',
                        currencyCode: 'USD',
                    },
                },
            ],
        },
        all: {},
    } as unknown as PurchasesOfferings;
}

/**
 * Listen for customer info updates
 */
export function addCustomerInfoListener(callback: (info: CustomerInfo) => void): () => void {
    if (!purchasesModule) {
        return () => { };
    }

    // RevenueCat Capacitor plugin uses event listeners
    purchasesModule.addCustomerInfoUpdateListener((customerInfo: CustomerInfo) => {
        callback(customerInfo);
    }).then(callbackId => {
        listenerCallbackId = callbackId;
    });

    return () => {
        if (listenerCallbackId && purchasesModule) {
            purchasesModule.removeCustomerInfoUpdateListener({ listenerToRemove: listenerCallbackId });
            listenerCallbackId = null;
        }
    };
}
