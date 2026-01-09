import React, { useState } from 'react';

interface FeatureInfoCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    features: string[];
    usageInfo?: {
        frequency: string;
        requirement: string;
        model?: string;
    };
    howItWorks?: string[];
    accentColor?: 'indigo' | 'purple' | 'emerald' | 'amber';
    // Action button props
    actionLabel?: string;
    onAction?: () => void;
    isLoading?: boolean;
    isDisabled?: boolean;
    statusText?: string;
    children?: React.ReactNode;
}

export const FeatureInfoCard: React.FC<FeatureInfoCardProps> = ({
    title,
    description,
    icon,
    features,
    usageInfo,
    howItWorks,
    accentColor = 'indigo',
    actionLabel,
    onAction,
    isLoading = false,
    isDisabled = false,
    statusText,
    children
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const colorClasses = {
        indigo: {
            gradient: 'from-indigo-500/20 to-purple-500/20',
            border: 'border-indigo-500/30',
            icon: 'from-indigo-500 to-purple-600',
            text: 'text-indigo-400',
            badge: 'bg-indigo-500/20 text-indigo-300',
            check: 'text-indigo-400',
            button: 'from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
        },
        purple: {
            gradient: 'from-purple-500/20 to-pink-500/20',
            border: 'border-purple-500/30',
            icon: 'from-purple-500 to-pink-600',
            text: 'text-purple-400',
            badge: 'bg-purple-500/20 text-purple-300',
            check: 'text-purple-400',
            button: 'from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
        },
        emerald: {
            gradient: 'from-emerald-500/20 to-teal-500/20',
            border: 'border-emerald-500/30',
            icon: 'from-emerald-500 to-teal-600',
            text: 'text-emerald-400',
            badge: 'bg-emerald-500/20 text-emerald-300',
            check: 'text-emerald-400',
            button: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
        },
        amber: {
            gradient: 'from-amber-500/20 to-orange-500/20',
            border: 'border-amber-500/30',
            icon: 'from-amber-500 to-orange-600',
            text: 'text-amber-400',
            badge: 'bg-amber-500/20 text-amber-300',
            check: 'text-amber-400',
            button: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
        }
    };

    const colors = colorClasses[accentColor];

    return (
        <div className={`bg-gradient-to-br ${colors.gradient} border ${colors.border} rounded-xl md:rounded-2xl p-3 md:p-5 transition-all duration-300`}>
            {/* Header */}
            <div className="flex items-start gap-3 md:gap-4 mb-2 md:mb-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br ${colors.icon} flex items-center justify-center flex-shrink-0 shadow-lg [&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-6 md:[&>svg]:h-6`}>
                    {icon}
                </div>
                <div className="flex-grow min-w-0">
                    <h3 className="font-serif text-lg md:text-xl text-day-text dark:text-night-text">{title}</h3>
                    <p className="text-xs md:text-sm text-day-text-secondary dark:text-night-text-secondary mt-0.5 md:mt-1 line-clamp-2">{description}</p>
                </div>
            </div>

            {/* Feature List - Hidden on mobile */}
            <div className="hidden md:block space-y-2 mb-4">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${colors.check} flex-shrink-0 mt-0.5`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-day-text-secondary dark:text-night-text-secondary">{feature}</span>
                    </div>
                ))}
            </div>

            {/* Usage Info Badges */}
            {usageInfo && (
                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-4">
                    <span className={`text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-full ${colors.badge} font-medium`}>
                        {usageInfo.frequency}
                    </span>
                    <span className={`text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-full ${colors.badge} font-medium`}>
                        {usageInfo.requirement}
                    </span>
                    {usageInfo.model && (
                        <span className={`text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-full ${colors.badge} font-medium`}>
                            {usageInfo.model}
                        </span>
                    )}
                </div>
            )}

            {/* Action Button */}
            {actionLabel && onAction && (
                <div className="mb-2 md:mb-4">
                    <button
                        onClick={onAction}
                        disabled={isDisabled || isLoading}
                        className={`w-full py-2.5 md:py-3 min-h-[44px] md:min-h-[48px] bg-gradient-to-r ${colors.button} text-white text-sm md:text-base font-medium rounded-lg md:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 md:h-5 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Analyzing...
                            </>
                        ) : actionLabel}
                    </button>
                    {statusText && (
                        <p className="text-[10px] md:text-xs text-center mt-1.5 md:mt-2 text-day-text-secondary dark:text-night-text-secondary">{statusText}</p>
                    )}
                </div>
            )}

            {/* Results slot */}
            {children && (
                <div className="mb-2 md:mb-4">
                    {children}
                </div>
            )}

            {/* How It Works - Expandable */}
            {howItWorks && howItWorks.length > 0 && (
                <div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`text-xs md:text-sm ${colors.text} flex items-center gap-1 hover:opacity-80 transition-opacity`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-3.5 w-3.5 md:h-4 md:w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        How it works
                    </button>
                    {isExpanded && (
                        <div className="mt-2 md:mt-3 space-y-1.5 md:space-y-2 animate-fadeIn pl-4 md:pl-5 border-l-2 border-day-border dark:border-night-border">
                            {howItWorks.map((step, i) => (
                                <div key={i} className="flex items-start gap-1.5 md:gap-2">
                                    <span className={`text-[10px] md:text-xs ${colors.text} font-bold`}>{i + 1}.</span>
                                    <span className="text-[10px] md:text-xs text-day-text-secondary dark:text-night-text-secondary">{step}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
