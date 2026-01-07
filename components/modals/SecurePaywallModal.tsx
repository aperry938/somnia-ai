import React, { useState, useEffect } from 'react';
import {
    PRICING,
    PREMIUM_FEATURES,
    PremiumFeature,
    createCheckoutSession,
    getCachedStatus,
} from '../../services/secureSubscriptionService';

interface SecurePaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature?: PremiumFeature;
    userId: string;
}

export const SecurePaywallModal: React.FC<SecurePaywallModalProps> = ({
    isOpen,
    onClose,
    feature,
    userId
}) => {
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const status = getCachedStatus();

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

    const handleSubscribe = async () => {
        setIsProcessing(true);
        setError(null);

        const priceId = selectedPlan === 'monthly'
            ? PRICING.monthly.priceId
            : PRICING.yearly.priceId;

        if (!priceId) {
            setError('Stripe not configured. Please contact support.');
            setIsProcessing(false);
            return;
        }

        const result = await createCheckoutSession(
            priceId,
            userId,
            `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            window.location.href
        );

        setIsProcessing(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        if (result.url) {
            // Redirect to Stripe Checkout
            window.location.href = result.url;
        }
    };

    const featuredFeature = feature ? PREMIUM_FEATURES[feature] : null;

    // Top 5 features to highlight
    const highlightFeatures: PremiumFeature[] = [
        'ai_analysis',
        'ai_imagery',
        'ai_coach',
        'dream_synthesis',
        'binaural_beats',
    ];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative p-6 pb-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent transition-colors"
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
                        <h2 className="font-serif text-2xl mb-2">Unlock Somnia Premium</h2>
                        {featuredFeature && (
                            <p className="text-day-text-secondary dark:text-night-text-secondary">
                                {featuredFeature.name} requires Premium
                            </p>
                        )}
                    </div>
                </div>

                {/* Features */}
                <div className="p-6">
                    <ul className="space-y-3 mb-6">
                        {highlightFeatures.map(f => (
                            <li key={f} className="flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <span className="font-medium">{PREMIUM_FEATURES[f].name}</span>
                                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                                        {PREMIUM_FEATURES[f].description}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    {/* Pricing Toggle */}
                    <div className="flex justify-center gap-2 mb-4">
                        <button
                            onClick={() => setSelectedPlan('monthly')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedPlan === 'monthly'
                                ? 'bg-day-accent dark:bg-night-accent text-white'
                                : 'bg-day-border dark:bg-night-border'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setSelectedPlan('yearly')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedPlan === 'yearly'
                                ? 'bg-day-accent dark:bg-night-accent text-white'
                                : 'bg-day-border dark:bg-night-border'
                                }`}
                        >
                            Yearly
                            <span className="ml-1 text-xs opacity-80">Save {PRICING.yearly.savings}%</span>
                        </button>
                    </div>

                    {/* Price Display */}
                    <div className="text-center mb-6">
                        <div className="text-4xl font-bold">
                            ${selectedPlan === 'monthly' ? PRICING.monthly.price : PRICING.yearly.price}
                        </div>
                        <div className="text-day-text-secondary dark:text-night-text-secondary">
                            per {selectedPlan === 'monthly' ? 'month' : 'year'}
                        </div>
                        {selectedPlan === 'yearly' && (
                            <div className="text-sm text-green-500 mt-1">
                                That's just ${(PRICING.yearly.price / 12).toFixed(2)}/month
                            </div>
                        )}
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* CTA Button */}
                    <button
                        onClick={handleSubscribe}
                        disabled={isProcessing}
                        className="w-full py-3 bg-gradient-to-r from-day-accent to-purple-600 text-white rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                            </span>
                        ) : (
                            `Subscribe ${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}`
                        )}
                    </button>

                    {/* Security Badge */}
                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-day-text-secondary dark:text-night-text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Secured by Stripe • Cancel anytime
                    </div>
                </div>
            </div>
        </div>
    );
};
