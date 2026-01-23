// components/shared/LoadingStates.tsx
import React from 'react';
import { motion } from 'framer-motion';

// Base skeleton with shimmer animation - memoized since it's frequently used
export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties; 'aria-label'?: string }> = React.memo(({ className = '', style, 'aria-label': ariaLabel }) => (
    <div
        className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] rounded animate-shimmer ${className}`}
        style={style}
        role="status"
        aria-label={ariaLabel || 'Loading content'}
        aria-busy="true"
    />
));

// Text skeleton - mimics a line of text
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = React.memo(({
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
));

// Card skeleton for dream entries - memoized since props don't change
export const SkeletonDreamCard: React.FC = React.memo(() => (
    <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-lg flex gap-4" role="status" aria-label="Loading dream entry" aria-busy="true">
        <Skeleton className="w-20 h-20 rounded-md flex-shrink-0" aria-label="Loading dream image" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" aria-label="Loading date" />
            <Skeleton className="h-5 w-3/4" aria-label="Loading title" />
            <Skeleton className="h-3 w-full" aria-label="Loading description" />
            <Skeleton className="h-3 w-2/3" aria-label="Loading tags" />
        </div>
    </div>
));

// Analysis loading state with thematic message
export const AnalysisLoading: React.FC = () => (
    <motion.div
        className="flex flex-col items-center justify-center py-12 px-4 text-center"
        role="status"
        aria-label="Analyzing dream content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
    >
        <div className="relative w-20 h-20 mb-6">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-day-accent/20 dark:border-night-accent/20" />
            {/* Spinning ring */}
            <motion.div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-day-accent dark:border-t-night-accent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            {/* Inner glow */}
            <motion.div
                className="absolute inset-4 rounded-full bg-day-accent/10 dark:bg-night-accent/10"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
        </div>
        <motion.h3
            className="font-serif text-xl text-day-text-primary dark:text-night-text-primary mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
        >
            Somnia is analyzing...
        </motion.h3>
        <motion.p
            className="text-sm text-day-text-secondary dark:text-night-text-secondary max-w-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
        >
            Finding meaning in your dream's symbols and patterns.
        </motion.p>
    </motion.div>
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

// Insights chart loading skeleton - memoized for performance
export const SkeletonChart: React.FC = React.memo(() => (
    <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl" role="status" aria-label="Loading chart" aria-busy="true">
        <Skeleton className="h-6 w-40 mb-2" aria-label="Loading chart title" />
        <Skeleton className="h-4 w-64 mb-4" aria-label="Loading chart description" />
        <div className="h-48 flex items-end justify-around gap-2 px-4" aria-hidden="true">
            {[0.4, 0.7, 0.5, 0.8, 0.6, 0.9, 0.7].map((h, i) => (
                <Skeleton
                    key={i}
                    className="flex-1 rounded-t"
                    style={{ height: `${h * 100}%` }}
                    aria-label="Loading chart bar"
                />
            ))}
        </div>
    </div>
));

// Full page loading overlay - memoized since message rarely changes
export const PageLoading: React.FC<{ message?: string }> = React.memo(({ message = 'Loading...' }) => (
    <div className="fixed inset-0 bg-day-bg-start/80 dark:bg-night-bg-start/80 backdrop-blur-sm flex items-center justify-center z-50" role="status" aria-live="polite">
        <div className="text-center">
            <img
                src="/logo.png"
                alt="Somnia"
                loading="lazy"
                className="w-20 h-20 mx-auto mb-4 animate-pulse drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]"
            />
            <p className="text-day-text-secondary dark:text-night-text-secondary">{message}</p>
        </div>
    </div>
));

// Modal loading fallback - minimal spinner for lazy-loaded modals
export const ModalLoading: React.FC = React.memo(() => (
    <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-sm flex items-center justify-center z-50" role="status" aria-label="Loading modal">
        <div className="w-12 h-12 rounded-full border-4 border-day-accent/20 dark:border-night-accent/20 border-t-day-accent dark:border-t-night-accent animate-spin" />
    </div>
));

// Spinner component - reusable across all buttons and loading states
interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    light?: boolean; // Use white color for dark backgrounds
}

export const Spinner: React.FC<SpinnerProps> = React.memo(({ size = 'md', className = '', light = false }) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-5 h-5 border-2',
        lg: 'w-8 h-8 border-3',
    };

    const colorClasses = light
        ? 'border-white/30 border-t-white'
        : 'border-day-accent/30 dark:border-night-accent/30 border-t-day-accent dark:border-t-night-accent';

    return (
        <div
            className={`rounded-full animate-spin ${sizeClasses[size]} ${colorClasses} ${className}`}
            role="status"
            aria-label="Loading"
        />
    );
});

// Loading button - standardized button with loading state
interface LoadingButtonProps {
    onClick?: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    loadingText?: string;
    children: React.ReactNode;
    className?: string;
    type?: 'button' | 'submit';
    variant?: 'primary' | 'secondary' | 'ghost';
    'aria-label'?: string;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
    onClick,
    isLoading = false,
    disabled = false,
    loadingText,
    children,
    className = '',
    type = 'button',
    variant = 'primary',
    'aria-label': ariaLabel,
}) => {
    const baseClasses = 'min-h-[48px] px-6 rounded-full font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50';

    const variantClasses = {
        primary: 'bg-day-accent dark:bg-night-accent text-white hover:opacity-90 active:scale-95',
        secondary: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600',
        ghost: 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-day-text-secondary dark:text-night-text-secondary',
    };

    const isLight = variant === 'primary';

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isLoading || disabled}
            aria-label={ariaLabel}
            aria-busy={isLoading}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            {isLoading ? (
                <>
                    <Spinner size="sm" light={isLight} />
                    {loadingText || 'Loading...'}
                </>
            ) : (
                children
            )}
        </button>
    );
};

// Empty state component - consistent design for empty lists/content
interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className = '',
}) => (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
        {icon && (
            <div className="w-16 h-16 mb-4 text-day-text-secondary/50 dark:text-night-text-secondary/50">
                {icon}
            </div>
        )}
        <h3 className="font-serif text-lg text-day-text-primary dark:text-night-text-primary mb-2">
            {title}
        </h3>
        {description && (
            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary max-w-xs mb-4">
                {description}
            </p>
        )}
        {action && (
            <button
                onClick={action.onClick}
                className="px-4 py-2 min-h-[44px] bg-day-accent dark:bg-night-accent text-white rounded-full text-sm font-medium hover:opacity-90 active:scale-95 transition-all"
            >
                {action.label}
            </button>
        )}
    </div>
);
