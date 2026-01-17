// components/shared/LoadingStates.tsx
import React from 'react';

// Base skeleton with shimmer animation
export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
    <div
        className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] rounded ${className}`}
        style={{ animation: 'shimmer 1.5s infinite', ...style }}
    />
);

// Text skeleton - mimics a line of text
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
    lines = 1,
    className = ''
}) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
            />
        ))}
    </div>
);

// Card skeleton for dream entries
export const SkeletonDreamCard: React.FC = () => (
    <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-lg flex gap-4">
        <Skeleton className="w-20 h-20 rounded-md flex-shrink-0" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
        </div>
    </div>
);

// Analysis loading state with thematic message
export const AnalysisLoading: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" role="status" aria-label="Analyzing dream content">
        <div className="relative w-20 h-20 mb-6">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-day-accent/20 dark:border-night-accent/20" />
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-day-accent dark:border-t-night-accent animate-spin" />
            {/* Inner glow */}
            <div className="absolute inset-4 rounded-full bg-day-accent/10 dark:bg-night-accent/10 animate-pulse" />
        </div>
        <h3 className="font-serif text-xl text-day-text-primary dark:text-night-text-primary mb-2">
            Somnia is analyzing...
        </h3>
        <p className="text-sm text-day-text-secondary dark:text-night-text-secondary max-w-xs">
            Finding meaning in your dream's symbols and patterns.
        </p>
    </div>
);

// Image generation loading state
export const ImageGenerationLoading: React.FC = () => (
    <div className="w-full h-64 rounded-lg bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 flex flex-col items-center justify-center" role="status" aria-label="Generating dream visualization">
        <svg
            className="w-12 h-12 text-day-accent dark:text-night-accent animate-pulse mb-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
        </svg>
        <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">
            Visualizing your dream...
        </p>
    </div>
);

// Insights chart loading skeleton
export const SkeletonChart: React.FC = () => (
    <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-64 mb-4" />
        <div className="h-48 flex items-end justify-around gap-2 px-4">
            {[0.4, 0.7, 0.5, 0.8, 0.6, 0.9, 0.7].map((h, i) => (
                <Skeleton
                    key={i}
                    className="flex-1 rounded-t"
                    style={{ height: `${h * 100}%` }}
                />
            ))}
        </div>
    </div>
);

// Full page loading overlay
export const PageLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
    <div className="fixed inset-0 bg-day-bg-start/80 dark:bg-night-bg-start/80 backdrop-blur-sm flex items-center justify-center z-50" role="status" aria-live="polite">
        <div className="text-center">
            <img
                src="/logo.png"
                alt="Somnia"
                className="w-20 h-20 mx-auto mb-4 animate-pulse drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]"
            />
            <p className="text-day-text-secondary dark:text-night-text-secondary">{message}</p>
        </div>
    </div>
);
