/**
 * RevenueCat Service for Somnia.ai
 *
 * Handles all in-app purchase operations through RevenueCat SDK.
 * Works with both Apple App Store and Google Play Store.
 *
 * Setup Requirements:
 * 1. Create RevenueCat account at https://app.revenuecat.com
 * 2. Set up products in App Store Connect and Google Play Console
 * 3. Configure products in RevenueCat dashboard
 * 4. Add API keys to environment variables
 */

import { Capacitor } from '@capacitor/core';
import { logger } from './logger';

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
 * Get current customer info including entitlements
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
    if (!isInitialized || !purchasesModule) {
        // Return mock for web/uninitialized
        return getMockCustomerInfo();
    }

    try {
        const result = await purchasesModule.getCustomerInfo();
        return result.customerInfo;
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
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
    if (!isInitialized || !purchasesModule) {
        return getMockOfferings();
    }

    try {
        const offerings = await purchasesModule.getOfferings();
        return offerings;
    } catch (error) {
        logger.error('[RevenueCat] Failed to get offerings:', error);
        return null;
    }
}

/**
 * Purchase a package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
    if (!isInitialized || !purchasesModule) {
        return { success: false, error: 'RevenueCat not initialized' };
    }

    try {
        const result = await purchasesModule.purchasePackage({ aPackage: pkg });

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('subscriptionChanged', {
            detail: { isPremium: checkPremiumFromInfo(result.customerInfo) }
        }));

        return { success: true, customerInfo: result.customerInfo };
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string; userCancelled?: boolean };

        // User cancelled is not an error
        if (err.userCancelled || err.code === 'PURCHASE_CANCELLED') {
            return { success: false, error: 'cancelled' };
        }

        logger.error('[RevenueCat] Purchase failed:', error);
        return { success: false, error: err.message || 'Purchase failed' };
    }
}

/**
 * Restore previous purchases (useful for reinstalls or device changes)
 */
export async function restorePurchases(): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
    if (!isInitialized || !purchasesModule) {
        return { success: false, error: 'RevenueCat not initialized' };
    }

    try {
        const result = await purchasesModule.restorePurchases();

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('subscriptionChanged', {
            detail: { isPremium: checkPremiumFromInfo(result.customerInfo) }
        }));

        return { success: true, customerInfo: result.customerInfo };
    } catch (error: unknown) {
        const err = error as { message?: string };
        logger.error('[RevenueCat] Restore failed:', error);
        return { success: false, error: err.message || 'Restore failed' };
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
        return () => {};
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
