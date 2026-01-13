import React, { useState, useEffect } from 'react';
import { isDevMode, setDevMode, isDevPremium, setDevPremium, isPremium } from '../services/secureSubscriptionService';

export const DevModeToggle: React.FC = () => {
    const [devMode, setDevModeState] = useState(isDevMode());
    const [premium, setPremiumState] = useState(isDevPremium());
    const [actualPremium, setActualPremium] = useState(isPremium());

    useEffect(() => {
        const handleDevModeChange = () => {
            setDevModeState(isDevMode());
            setActualPremium(isPremium());
        };
        const handleSubscriptionChange = () => {
            setPremiumState(isDevPremium());
            setActualPremium(isPremium());
        };

        window.addEventListener('devModeChanged', handleDevModeChange);
        window.addEventListener('subscriptionChanged', handleSubscriptionChange);

        return () => {
            window.removeEventListener('devModeChanged', handleDevModeChange);
            window.removeEventListener('subscriptionChanged', handleSubscriptionChange);
        };
    }, []);

    const toggleDevMode = () => {
        const newValue = !devMode;
        setDevMode(newValue);
        setDevModeState(newValue);
        // Force re-render of premium status
        setTimeout(() => setActualPremium(isPremium()), 0);
    };

    const togglePremium = () => {
        const newValue = !premium;
        setDevPremium(newValue);
        setPremiumState(newValue);
        // Force re-render of premium status
        setTimeout(() => setActualPremium(isPremium()), 0);
    };

    return (
        <div className="fixed bottom-[calc(5rem+var(--safe-area-inset-bottom))] left-4 z-50">
            {/* Dev Mode Activation Button (always visible) */}
            <button
                onClick={toggleDevMode}
                aria-label={`Toggle dev mode, currently ${devMode ? 'on' : 'off'}`}
                className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-xs font-mono transition-all shadow-lg ${
                    devMode
                        ? 'bg-amber-500 text-black'
                        : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80'
                }`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                DEV
            </button>

            {/* Dev Panel (only visible when dev mode active) */}
            {devMode && (
                <div className="mt-2 bg-gray-900/95 border border-amber-500/50 rounded-lg p-3 shadow-xl backdrop-blur-sm min-w-[200px]">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Dev Mode</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${actualPremium ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {actualPremium ? 'PRO' : 'FREE'}
                        </span>
                    </div>

                    {/* Premium Toggle */}
                    <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Premium Status</span>
                        <button
                            onClick={togglePremium}
                            aria-label={`Toggle premium status, currently ${premium ? 'on' : 'off'}`}
                            aria-pressed={premium}
                            className={`relative w-12 h-8 min-h-[32px] rounded-full transition-colors ${
                                premium ? 'bg-green-500' : 'bg-gray-600'
                            }`}
                        >
                            <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                premium ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>

                    <p className="text-gray-500 text-[10px] mt-3">
                        Toggle to test paid/free features. Changes apply immediately.
                    </p>
                </div>
            )}
        </div>
    );
};
