import React, { useState, useEffect } from 'react';
import {
    PRICING,
    PREMIUM_FEATURES,
    PremiumFeature,
    createCheckoutSession,
} from '../../services/secureSubscriptionService';

interface SecurePaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature?: PremiumFeature;
    userId: string;
    onNavigateToTerms?: () => void;
}

export const SecurePaywallModal: React.FC<SecurePaywallModalProps> = ({
    isOpen,
    onClose,
    feature,
    userId,
    onNavigateToTerms
}) => {
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);

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

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="paywall-title"
        >
            <div
                className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
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
                        {/* Header */}
                        <div className="col-span-1"></div>
                        <div className="text-center font-medium text-day-text-secondary dark:text-night-text-secondary py-2">Free</div>
                        <div className="text-center font-medium py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-t-lg text-amber-600 dark:text-amber-400">Premium</div>

                        {/* Dream Journaling */}
                        <div className="py-2 text-day-text-secondary dark:text-night-text-secondary">Dream Journal</div>
                        <div className="text-center py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-center py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>

                        {/* Sleep Tracking */}
                        <div className="py-2 text-day-text-secondary dark:text-night-text-secondary">Sleep Tracker</div>
                        <div className="text-center py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-center py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>

                        {/* Basic Sleep Sounds */}
                        <div className="py-2 text-day-text-secondary dark:text-night-text-secondary">Sleep Sounds</div>
                        <div className="text-center py-2 text-xs text-day-text-secondary dark:text-night-text-secondary">Basic</div>
                        <div className="text-center py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-xs font-medium text-amber-600 dark:text-amber-400">All + Binaural</div>

                        {/* AI Analysis */}
                        <div className="py-2 text-day-text-secondary dark:text-night-text-secondary">AI Dream Analysis</div>
                        <div className="text-center py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 dark:text-gray-600 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-center py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>

                        {/* Dream Chat */}
                        <div className="py-2 text-day-text-secondary dark:text-night-text-secondary">Dream Chat AI</div>
                        <div className="text-center py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 dark:text-gray-600 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-center py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>

                        {/* AI Sleep Coach */}
                        <div className="py-2 text-day-text-secondary dark:text-night-text-secondary">AI Sleep Coach</div>
                        <div className="text-center py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 dark:text-gray-600 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-center py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>

                        {/* Dream Imagery */}
                        <div className="py-2 text-day-text-secondary dark:text-night-text-secondary">Dream Imagery</div>
                        <div className="text-center py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 dark:text-gray-600 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-center py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>

                        {/* Breathing Exercises */}
                        <div className="py-2 text-day-text-secondary dark:text-night-text-secondary">Breathing Exercises</div>
                        <div className="text-center py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 dark:text-gray-600 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-center py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-b-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    {/* Pricing Toggle */}
                    <div className="flex justify-center gap-2 mb-4" role="group" aria-label="Subscription plan options">
                        <button
                            onClick={() => setSelectedPlan('monthly')}
                            aria-label="Monthly plan"
                            aria-pressed={selectedPlan === 'monthly'}
                            className={`px-5 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors flex items-center justify-center ${selectedPlan === 'monthly'
                                ? 'bg-day-accent dark:bg-night-accent text-white'
                                : 'bg-day-border dark:bg-night-border'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setSelectedPlan('yearly')}
                            aria-label={`Yearly plan, save ${PRICING.yearly.savings}%`}
                            aria-pressed={selectedPlan === 'yearly'}
                            className={`px-5 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors flex items-center justify-center ${selectedPlan === 'yearly'
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

                    {/* Terms Checkbox */}
                    <label className="flex items-start gap-3 mb-4 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-gray-300 text-day-accent focus:ring-day-accent"
                        />
                        <span className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                            I have read and agree to the{' '}
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
                        disabled={isProcessing || !termsAccepted}
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
