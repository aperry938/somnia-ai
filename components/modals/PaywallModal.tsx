import React, { useState } from 'react';
import {
    PRICING,
    PREMIUM_FEATURES,
    PremiumFeature,
    startFreeTrial,
    hasUsedTrial,
} from '../../services/subscriptionService';

interface PaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature?: PremiumFeature;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose, feature }) => {
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [isProcessing, setIsProcessing] = useState(false);
    const trialUsed = hasUsedTrial();

    if (!isOpen) return null;

    const handleStartTrial = async () => {
        setIsProcessing(true);
        const success = startFreeTrial(7);
        setIsProcessing(false);

        if (success) {
            onClose();
            window.location.reload(); // Refresh to update UI
        } else {
            alert('Free trial already used.');
        }
    };

    const handleSubscribe = async () => {
        setIsProcessing(true);
        // TODO: Integrate with Stripe Checkout
        // For now, show a placeholder message
        alert('Stripe integration coming soon! For now, use the 7-day free trial.');
        setIsProcessing(false);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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

                    {/* CTA Buttons */}
                    <div className="space-y-3">
                        {!trialUsed && (
                            <button
                                onClick={handleStartTrial}
                                disabled={isProcessing}
                                className="w-full py-3 bg-gradient-to-r from-day-accent to-purple-600 text-white rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isProcessing ? 'Starting...' : 'Start 7-Day Free Trial'}
                            </button>
                        )}
                        <button
                            onClick={handleSubscribe}
                            disabled={isProcessing}
                            className={`w-full py-3 rounded-full font-medium transition-opacity disabled:opacity-50 ${trialUsed
                                    ? 'bg-gradient-to-r from-day-accent to-purple-600 text-white hover:opacity-90'
                                    : 'border border-day-border dark:border-night-border hover:border-day-accent dark:hover:border-night-accent'
                                }`}
                        >
                            {isProcessing ? 'Processing...' : `Subscribe ${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}`}
                        </button>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-day-text-secondary dark:text-night-text-secondary mt-4">
                        Cancel anytime. No questions asked.
                    </p>
                </div>
            </div>
        </div>
    );
};
