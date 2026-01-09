import React, { useState } from 'react';
import { PremiumFeature, isPremium, PREMIUM_FEATURES } from '../../services/secureSubscriptionService';
import { SecurePaywallModal } from '../modals/SecurePaywallModal';
import { useTermsNavigation } from '../../contexts/NavigationContext';


interface PremiumBadgeProps {
    feature: PremiumFeature;
    children?: React.ReactNode;
    className?: string;
    showLabel?: boolean;
    hideBadge?: boolean; // If true, only provides click handler, no visual badge
    onNavigateToTerms?: () => void; // Navigation callback for Terms link
}

/**
 * Badge that indicates a premium feature.
 * When clicked, opens the paywall modal.
 * If user is premium, badge is not shown.
 */
export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
    feature,
    children,
    className = '',
    showLabel = true,
    hideBadge = false,
    onNavigateToTerms,
}) => {
    const [showPaywall, setShowPaywall] = useState(false);
    const contextTermsNav = useTermsNavigation();
    const termsNav = onNavigateToTerms || contextTermsNav;

    // Don't show badge if user is premium
    if (isPremium()) {
        return <>{children}</>;
    }

    // Check if className contains height/width classes that need flex layout
    const needsFlexLayout = className.includes('h-') || className.includes('w-full');
    const baseClasses = needsFlexLayout ? '' : 'inline-flex items-center gap-1';

    return (
        <>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowPaywall(true);
                }}
                className={`${baseClasses} ${className}`.trim()}
                title={`Premium: ${PREMIUM_FEATURES[feature].name}`}
            >
                {children}
                {!hideBadge && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {showLabel && 'PRO'}
                    </span>
                )}
            </button>
            <SecurePaywallModal
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                feature={feature}
                onNavigateToTerms={termsNav}
            />
        </>
    );
};

/**
 * Wrapper component that gates content behind premium.
 * Shows upgrade prompt if not premium.
 */
interface PremiumGateProps {
    feature: PremiumFeature;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onNavigateToTerms?: () => void; // Navigation callback for Terms link
}

export const PremiumGate: React.FC<PremiumGateProps> = ({
    feature,
    children,
    fallback,
    onNavigateToTerms
}) => {
    const [showPaywall, setShowPaywall] = useState(false);
    const userIsPremium = isPremium();
    const contextTermsNav = useTermsNavigation();
    const termsNav = onNavigateToTerms || contextTermsNav;

    if (userIsPremium) {
        return <>{children}</>;
    }

    const featureInfo = PREMIUM_FEATURES[feature];

    return (
        <>
            {fallback || (
                <div className="text-center py-8 px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h3 className="font-serif text-xl mb-2">{featureInfo.name}</h3>
                    <p className="text-day-text-secondary dark:text-night-text-secondary mb-4 max-w-xs mx-auto">
                        {featureInfo.description}
                    </p>
                    <button
                        onClick={() => setShowPaywall(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-day-accent to-purple-600 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Unlock Premium
                    </button>
                </div>
            )}
            <SecurePaywallModal
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                feature={feature}
                onNavigateToTerms={termsNav}
            />
        </>
    );
};
