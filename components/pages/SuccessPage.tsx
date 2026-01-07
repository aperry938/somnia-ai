import React, { useEffect, useState } from 'react';
import { verifySubscription, getCachedStatus } from '../../services/secureSubscriptionService';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../services/logger';

interface SuccessPageProps {
    onBack: () => void;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({ onBack }) => {
    const { session } = useAuth();
    const [isVerifying, setIsVerifying] = useState(true);
    const [status, setStatus] = useState(getCachedStatus());

    useEffect(() => {
        const verifyAndUpdate = async () => {
            if (session?.access_token) {
                try {
                    const newStatus = await verifySubscription(session.access_token);
                    setStatus(newStatus);
                } catch (error) {
                    logger.error('Failed to verify subscription:', error);
                }
            }
            setIsVerifying(false);
        };

        // Small delay to allow Stripe webhook to process
        const timer = setTimeout(verifyAndUpdate, 2000);
        return () => clearTimeout(timer);
    }, [session]);

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {isVerifying ? (
                    <div className="animate-fadeIn">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                            <svg className="h-10 w-10 text-white animate-spin" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                        <h1 className="font-serif text-2xl mb-2">Processing your subscription...</h1>
                        <p className="text-day-text-secondary dark:text-night-text-secondary">
                            This will only take a moment.
                        </p>
                    </div>
                ) : status.isPremium ? (
                    <div className="animate-fadeIn">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>

                        <h1 className="font-serif text-3xl mb-3">Welcome to Premium!</h1>
                        <p className="text-day-text-secondary dark:text-night-text-secondary mb-8">
                            Your subscription is now active. Unlock the full potential of your dream journey.
                        </p>

                        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-5 mb-6 text-left">
                            <h2 className="font-medium mb-3">Your new features:</h2>
                            <ul className="space-y-2">
                                {[
                                    'Daily AI Dream Analysis',
                                    'Dream Visualization Prompts',
                                    'Dream Chat with AI',
                                    'Sleep Analytics & Insights',
                                    'Sleep Sounds Pro',
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            onClick={onBack}
                            className="w-full py-3 min-h-[48px] bg-gradient-to-r from-amber-400 to-amber-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity flex items-center justify-center"
                        >
                            Start Exploring
                        </button>
                    </div>
                ) : (
                    <div className="animate-fadeIn">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>

                        <h1 className="font-serif text-2xl mb-3">Subscription Pending</h1>
                        <p className="text-day-text-secondary dark:text-night-text-secondary mb-6">
                            We're still processing your subscription. This can take a few moments.
                            If you've completed payment, your subscription should activate shortly.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 py-3 min-h-[48px] border border-day-border dark:border-night-border rounded-full font-medium hover:bg-white/10 dark:hover:bg-black/10 transition-colors flex items-center justify-center"
                            >
                                Refresh
                            </button>
                            <button
                                onClick={onBack}
                                className="flex-1 py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-medium rounded-full hover:opacity-90 transition-opacity flex items-center justify-center"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
