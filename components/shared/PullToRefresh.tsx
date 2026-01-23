// components/shared/PullToRefresh.tsx
/**
 * Pull-to-refresh wrapper component for lists and scrollable content.
 * Provides a native-feeling pull gesture with visual feedback.
 */
import React from 'react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

interface PullToRefreshProps {
    /** Callback to execute on refresh - must return a Promise */
    onRefresh: () => Promise<void>;
    /** Content to render inside the scrollable container */
    children: React.ReactNode;
    /** Whether pull-to-refresh is enabled (default: true) */
    enabled?: boolean;
    /** Additional className for the container */
    className?: string;
    /** Pull threshold in pixels (default: 80) */
    threshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
    onRefresh,
    children,
    enabled = true,
    className = '',
    threshold = 80
}) => {
    const {
        pullDistance,
        isRefreshing,
        progress,
        handlers,
        containerStyle
    } = usePullToRefresh({
        onRefresh,
        threshold,
        enabled
    });

    // Calculate spinner rotation based on pull progress
    const spinnerRotation = progress * 360;
    const spinnerOpacity = Math.min(progress * 1.5, 1);
    const indicatorTranslate = Math.min(pullDistance - 20, 50);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Pull indicator */}
            {(pullDistance > 0 || isRefreshing) && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 z-10 transition-transform"
                    style={{
                        top: Math.max(0, indicatorTranslate),
                        opacity: spinnerOpacity
                    }}
                    role="status"
                    aria-live="polite"
                    aria-label={isRefreshing ? 'Refreshing content' : progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
                >
                    <div
                        className={`w-10 h-10 rounded-full bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border shadow-lg flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`}
                        style={!isRefreshing ? { transform: `rotate(${spinnerRotation}deg)` } : undefined}
                    >
                        {isRefreshing ? (
                            <svg
                                className="w-5 h-5 text-day-accent dark:text-night-accent"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                        ) : (
                            <svg
                                className={`w-5 h-5 transition-colors ${progress >= 1 ? 'text-day-accent dark:text-night-accent' : 'text-day-text-secondary dark:text-night-text-secondary'}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                />
                            </svg>
                        )}
                    </div>
                </div>
            )}

            {/* Scrollable content */}
            <div
                {...handlers}
                style={containerStyle}
                className="min-h-full"
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
