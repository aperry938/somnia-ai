/**
 * Secure Subscription Service Tests
 * Tests for subscription verification, premium features, and AI credits
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create localStorage mock
const createLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        _getStore: () => store,
    };
};

const localStorageMock = createLocalStorageMock();
vi.stubGlobal('localStorage', localStorageMock);

// Mock window.dispatchEvent
const mockDispatchEvent = vi.fn();
vi.stubGlobal('dispatchEvent', mockDispatchEvent);

describe('secureSubscriptionService - FEATURE_TIERS', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should have correct tier assignments for all features', async () => {
        const { FEATURE_TIERS } = await import('./secureSubscriptionService');

        // Premium features
        expect(FEATURE_TIERS.ai_analysis).toBe('premium');
        expect(FEATURE_TIERS.ai_imagery).toBe('premium');
        expect(FEATURE_TIERS.ai_chat).toBe('premium');
        expect(FEATURE_TIERS.dream_synthesis).toBe('premium');
        expect(FEATURE_TIERS.sleep_habits).toBe('premium');
        expect(FEATURE_TIERS.binaural_beats).toBe('premium');
        expect(FEATURE_TIERS.reality_checks).toBe('premium');
        expect(FEATURE_TIERS.encrypted_backup).toBe('premium');
        expect(FEATURE_TIERS.unlimited_alarms).toBe('premium');
        expect(FEATURE_TIERS.voice_assistant).toBe('premium');
        expect(FEATURE_TIERS.breathing).toBe('premium');

        // Free features
        expect(FEATURE_TIERS.custom_alarm_sounds).toBe('free');
    });
});

describe('secureSubscriptionService - PREMIUM_FEATURES', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should have all required feature definitions', async () => {
        const { PREMIUM_FEATURES } = await import('./secureSubscriptionService');

        const requiredFeatures = [
            'ai_analysis',
            'ai_imagery',
            'ai_chat',
            'dream_synthesis',
            'sleep_habits',
            'binaural_beats',
            'reality_checks',
            'encrypted_backup',
            'unlimited_alarms',
            'voice_assistant',
            'custom_alarm_sounds',
            'breathing',
        ];

        requiredFeatures.forEach(feature => {
            const def = PREMIUM_FEATURES[feature as keyof typeof PREMIUM_FEATURES];
            expect(def).toBeDefined();
            expect(def.name).toBeTruthy();
            expect(def.description).toBeTruthy();
            expect(def.tier).toBeDefined();
        });
    });

    it('should have meaningful descriptions', async () => {
        const { PREMIUM_FEATURES } = await import('./secureSubscriptionService');

        Object.values(PREMIUM_FEATURES).forEach(feature => {
            expect(feature.description.length).toBeGreaterThan(10);
        });
    });
});

describe('secureSubscriptionService - PRICING', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should have correct pricing structure', async () => {
        const { PRICING } = await import('./secureSubscriptionService');

        expect(PRICING.weekly.price).toBe(3.49);
        expect(PRICING.weekly.currency).toBe('USD');
        expect(PRICING.weekly.interval).toBe('week');

        expect(PRICING.monthly.price).toBe(9.99);
        expect(PRICING.monthly.currency).toBe('USD');
        expect(PRICING.monthly.interval).toBe('month');

        expect(PRICING.yearly.price).toBe(79.99);
        expect(PRICING.yearly.currency).toBe('USD');
        expect(PRICING.yearly.interval).toBe('year');
    });

    it('should show yearly savings', async () => {
        const { PRICING } = await import('./secureSubscriptionService');

        expect(PRICING.yearly.savings).toBe(33);
        expect(PRICING.yearly.savingsVsWeekly).toBe(57);
    });
});

describe('secureSubscriptionService - AI Credits System', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should initialize credits for new users', async () => {
        const { getCredits } = await import('./secureSubscriptionService');

        const credits = getCredits();

        expect(credits.remaining).toBe(3); // FREE_TIER_AI_CREDITS
        expect(credits.resetDate).toBeTruthy();
    });

    it('should maintain credit state across calls within same month', async () => {
        const { getCredits } = await import('./secureSubscriptionService');

        const credits1 = getCredits();
        const credits2 = getCredits();

        expect(credits1.remaining).toBe(credits2.remaining);
        expect(credits1.resetDate).toBe(credits2.resetDate);
    });

    it('should check if AI analysis is available', async () => {
        const { canUseAiAnalysis, getCredits } = await import('./secureSubscriptionService');

        // Fresh user should have credits
        expect(getCredits().remaining).toBe(3);
        expect(canUseAiAnalysis()).toBe(true);
    });
});

describe('secureSubscriptionService - Type Exports', () => {
    it('should export SubscriptionTier type values', async () => {
        const { FEATURE_TIERS } = await import('./secureSubscriptionService');

        // All values should be either 'free' or 'premium'
        Object.values(FEATURE_TIERS).forEach(tier => {
            expect(['free', 'premium']).toContain(tier);
        });
    });

    it('should export PremiumFeature keys', async () => {
        const { FEATURE_TIERS } = await import('./secureSubscriptionService');

        const expectedFeatures = [
            'ai_analysis',
            'ai_imagery',
            'ai_chat',
            'dream_synthesis',
            'sleep_habits',
            'binaural_beats',
            'reality_checks',
            'encrypted_backup',
            'unlimited_alarms',
            'voice_assistant',
            'custom_alarm_sounds',
            'breathing',
        ];

        expectedFeatures.forEach(feature => {
            expect(FEATURE_TIERS[feature as keyof typeof FEATURE_TIERS]).toBeDefined();
        });
    });
});

describe('secureSubscriptionService - canAccessFeature', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should allow access to free features without premium', async () => {
        const { canAccessFeature } = await import('./secureSubscriptionService');

        expect(canAccessFeature('custom_alarm_sounds')).toBe(true);
    });

    it('should deny access to premium features without subscription', async () => {
        // Ensure not premium
        localStorageMock.setItem('somnia_premium_status', 'false');

        const { canAccessFeature } = await import('./secureSubscriptionService');

        expect(canAccessFeature('ai_analysis')).toBe(false);
        expect(canAccessFeature('ai_imagery')).toBe(false);
        expect(canAccessFeature('binaural_beats')).toBe(false);
    });
});

describe('secureSubscriptionService - isPremium', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should return false by default', async () => {
        const { isPremium } = await import('./secureSubscriptionService');

        expect(isPremium()).toBe(false);
    });
});

describe('secureSubscriptionService - clearSubscriptionCache', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should be a callable function', async () => {
        const { clearSubscriptionCache } = await import('./secureSubscriptionService');

        expect(typeof clearSubscriptionCache).toBe('function');

        // Should not throw
        expect(() => clearSubscriptionCache()).not.toThrow();
    });
});

describe('secureSubscriptionService - getRemainingCredits', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should return credits for free users', async () => {
        const { getRemainingCredits } = await import('./secureSubscriptionService');

        const credits = getRemainingCredits();
        expect(credits).toBe(3);
    });
});

describe('secureSubscriptionService - Credit consumption', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('consumeAiCredit should decrement credits', async () => {
        const { consumeAiCredit, getCredits } = await import('./secureSubscriptionService');

        expect(getCredits().remaining).toBe(3);

        const result = consumeAiCredit();
        expect(result).toBe(true);
        expect(getCredits().remaining).toBe(2);
    });

    it('should not allow consumption when credits exhausted', async () => {
        const { consumeAiCredit, canUseAiAnalysis, getCredits } = await import('./secureSubscriptionService');

        // Consume all credits
        consumeAiCredit();
        consumeAiCredit();
        consumeAiCredit();

        expect(getCredits().remaining).toBe(0);
        expect(canUseAiAnalysis()).toBe(false);

        // Further consumption should fail
        const result = consumeAiCredit();
        expect(result).toBe(false);
    });
});
