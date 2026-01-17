import React, { useState, useEffect } from 'react';
import {
    PRICING,
    PREMIUM_FEATURES,
    PremiumFeature,
    getSubscriptionOfferings,
    purchaseSubscription,
    restoreSubscription,
    type Package,
    type Offerings,
} from '../../services/secureSubscriptionService';
import { useBackButton } from '../../hooks/useBackButton';

interface SecurePaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature?: PremiumFeature;
    onNavigateToTerms?: () => void;
}

export const SecurePaywallModal: React.FC<SecurePaywallModalProps> = ({
    isOpen,
    onClose,
    feature,
    onNavigateToTerms
}) => {
    const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly' | 'yearly'>('yearly');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [offerings, setOfferings] = useState<Offerings | null>(null);
    const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);

    // Handle hardware back button (Android)
    useBackButton(isOpen && !isProcessing, onClose);

    // Load offerings on mount
    useEffect(() => {
        if (!isOpen) return;

        const loadOfferings = async () => {
            setIsLoadingOfferings(true);
            const result = await getSubscriptionOfferings();
            setOfferings(result);
            setIsLoadingOfferings(false);
        };

        loadOfferings();
    }, [isOpen]);

    // Handle Escape key to close modal
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isProcessing) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isProcessing, onClose]);

    if (!isOpen) return null;

    // Get the selected package from offerings
    const getSelectedPackage = (): Package | null => {
        if (!offerings?.current) return null;

        const packages = offerings.current.availablePackages;
        if (selectedPlan === 'weekly') {
            return packages.find(p => p.packageType === 'WEEKLY' || p.identifier.includes('weekly')) ?? null;
        } else if (selectedPlan === 'monthly') {
            return packages.find(p => p.packageType === 'MONTHLY' || p.identifier.includes('monthly')) ?? null;
        } else {
            return packages.find(p => p.packageType === 'ANNUAL' || p.identifier.includes('annual') || p.identifier.includes('yearly')) ?? null;
        }
    };

    const handleSubscribe = async () => {
        const pkg = getSelectedPackage();
        if (!pkg) {
            setError('Unable to load subscription options. Please try again.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        const result = await purchaseSubscription(pkg);

        setIsProcessing(false);

        if (result.error === 'cancelled') {
            // User cancelled - no error message needed
            return;
        }

        if (result.error) {
            setError(result.error);
            return;
        }

        if (result.success) {
            // Purchase successful - close modal
            onClose();
        }
    };

    const handleRestore = async () => {
        setIsRestoring(true);
        setError(null);

        const result = await restoreSubscription();

        setIsRestoring(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        if (result.isPremium) {
            // Restored successfully
            onClose();
        } else {
            setError('No previous purchases found');
        }
    };

    // Get display price from package or fallback to static pricing
    const getDisplayPrice = (plan: 'weekly' | 'monthly' | 'yearly'): string => {
        const pkg = offerings?.current?.availablePackages.find(p =>
            plan === 'weekly'
                ? (p.packageType === 'WEEKLY' || p.identifier.includes('weekly'))
                : plan === 'monthly'
                    ? (p.packageType === 'MONTHLY' || p.identifier.includes('monthly'))
                    : (p.packageType === 'ANNUAL' || p.identifier.includes('annual') || p.identifier.includes('yearly'))
        );

        if (pkg?.product.priceString) {
            return pkg.product.priceString;
        }

        // Fallback to static pricing
        if (plan === 'weekly') return `$${PRICING.weekly.price}`;
        if (plan === 'monthly') return `$${PRICING.monthly.price}`;
        return `$${PRICING.yearly.price}`;
    };

    const featuredFeature = feature ? PREMIUM_FEATURES[feature] : null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 pt-4 pb-[calc(2rem+var(--safe-area-inset-bottom))] bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="paywall-title"
        >
            <div
                className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl max-w-md w-full max-h-[calc(90vh-var(--safe-area-inset-bottom))] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative p-6 pb-0">
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-day-accent to-purple-600 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                        </div>
                        <h2 id="paywall-title" className="font-serif text-2xl mb-2">Unlock Somnia Premium</h2>
                        {featuredFeature && (
                            <p className="text-day-text-secondary dark:text-night-text-secondary">
                                {featuredFeature.name} requires Premium
                            </p>
                        )}
                    </div>
                </div>

                {/* Free vs Premium Comparison */}
                <div className="p-6">
                    <div className="grid grid-cols-3 gap-2 text-sm mb-6">
                        <div className="col-span-1"></div>
                        <div className="text-center font-medium text-day-text-secondary dark:text-night-text-secondary py-2">Free</div>
                        <div className="text-center font-medium py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-t-lg text-amber-600 dark:text-amber-400">Premium</div>

                        {/* Features comparison rows */}
                        {[
                            { name: 'Dream Journal', free: true, premium: true },
                            { name: 'Sleep Tracker', free: true, premium: true },
                            { name: 'Sleep Sounds', free: 'Basic', premium: 'All + Binaural' },
                            { name: 'AI Dream Analysis', free: false, premium: true },
                            { name: 'Dream Chat AI', free: false, premium: true },
                            { name: 'AI Sleep Coach', free: false, premium: true },
                            { name: 'Dream Imagery', free: false, premium: true },
                            { name: 'Breathing Exercises', free: false, premium: true, last: true },
                        ].map((row, idx) => (
                            <React.Fragment key={idx}>
                                <div className="py-2 text-day-text-secondary dark:text-night-text-secondary">{row.name}</div>
                                <div className="text-center py-2">
                                    {typeof row.free === 'boolean' ? (
                                        row.free ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 dark:text-gray-600 inline" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        )
                                    ) : (
                                        <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">{row.free}</span>
                                    )}
                                </div>
                                <div className={`text-center py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 ${row.last ? 'rounded-b-lg' : ''}`}>
                                    {typeof row.premium === 'boolean' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{row.premium}</span>
                                    )}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Loading State */}
                    {isLoadingOfferings ? (
                        <div className="flex justify-center py-4">
                            <svg className="animate-spin h-6 w-6 text-day-accent" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    ) : (
                        <>
                            {/* Pricing Toggle */}
                            <div className="flex justify-center gap-1 mb-4" role="group" aria-label="Subscription plan options">
                                <button
                                    onClick={() => setSelectedPlan('weekly')}
                                    aria-pressed={selectedPlan === 'weekly'}
                                    className={`px-3 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors ${selectedPlan === 'weekly'
                                        ? 'bg-day-accent dark:bg-night-accent text-white'
                                        : 'bg-day-border dark:bg-night-border'
                                        }`}
                                >
                                    Weekly
                                </button>
                                <button
                                    onClick={() => setSelectedPlan('monthly')}
                                    aria-pressed={selectedPlan === 'monthly'}
                                    className={`px-3 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors ${selectedPlan === 'monthly'
                                        ? 'bg-day-accent dark:bg-night-accent text-white'
                                        : 'bg-day-border dark:bg-night-border'
                                        }`}
                                >
                                    Monthly
                                    <span className="ml-1 text-xs opacity-80">-{PRICING.monthly.savingsVsWeekly}%</span>
                                </button>
                                <button
                                    onClick={() => setSelectedPlan('yearly')}
                                    aria-pressed={selectedPlan === 'yearly'}
                                    className={`px-3 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors ${selectedPlan === 'yearly'
                                        ? 'bg-day-accent dark:bg-night-accent text-white'
                                        : 'bg-day-border dark:bg-night-border'
                                        }`}
                                >
                                    Yearly
                                    <span className="ml-1 text-xs opacity-80">-{PRICING.yearly.savingsVsWeekly}%</span>
                                </button>
                            </div>

                            {/* Price Display */}
                            <div className="text-center mb-6">
                                <div className="text-4xl font-bold">
                                    {getDisplayPrice(selectedPlan)}
                                </div>
                                <div className="text-day-text-secondary dark:text-night-text-secondary">
                                    per {selectedPlan === 'weekly' ? 'week' : selectedPlan === 'monthly' ? 'month' : 'year'}
                                </div>
                                {selectedPlan === 'yearly' && (
                                    <div className="text-sm text-green-500 mt-1">
                                        That's just ${(PRICING.yearly.price / 12).toFixed(2)}/month
                                    </div>
                                )}
                                {selectedPlan === 'monthly' && (
                                    <div className="text-sm text-green-500 mt-1">
                                        Save {PRICING.monthly.savingsVsWeekly}% vs weekly
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Terms Checkbox */}
                    <label className="flex items-start gap-3 mb-4 py-2 min-h-[44px] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="mt-0.5 w-5 h-5 rounded border-gray-300 text-day-accent focus:ring-day-accent"
                        />
                        <span className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                            I agree to the{' '}
                            {onNavigateToTerms ? (
                                <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); onClose(); onNavigateToTerms(); }}
                                    className="text-day-accent dark:text-night-accent underline hover:opacity-80"
                                >
                                    Terms of Service
                                </button>
                            ) : (
                                <span className="text-day-accent dark:text-night-accent">Terms of Service</span>
                            )}
                        </span>
                    </label>

                    {/* CTA Button */}
                    <button
                        onClick={handleSubscribe}
                        disabled={isProcessing || !termsAccepted || isLoadingOfferings}
                        className="w-full py-3 min-h-[48px] bg-gradient-to-r from-day-accent to-purple-600 text-white rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                            </span>
                        ) : !termsAccepted ? (
                            'Accept terms to continue'
                        ) : (
                            `Subscribe ${selectedPlan === 'yearly' ? 'Yearly' : selectedPlan === 'monthly' ? 'Monthly' : 'Weekly'}`
                        )}
                    </button>

                    {/* Restore Purchases */}
                    <button
                        onClick={handleRestore}
                        disabled={isRestoring || isProcessing}
                        className="w-full py-2 mt-3 min-h-[44px] text-day-text-secondary dark:text-night-text-secondary text-sm hover:text-day-accent dark:hover:text-night-accent transition-colors disabled:opacity-50"
                    >
                        {isRestoring ? 'Restoring...' : 'Restore Purchases'}
                    </button>

                    {/* Security Badge */}
                    <div className="flex items-center justify-center gap-2 mt-3 text-xs text-day-text-secondary dark:text-night-text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Secure payment via App Store • Cancel anytime
                    </div>
                </div>
            </div>
        </div>
    );
};
