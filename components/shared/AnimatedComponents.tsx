// components/shared/AnimatedComponents.tsx
// Reusable animated components and animation variants for premium UX polish
/* eslint-disable react-refresh/only-export-components */

import React, { forwardRef } from 'react';
import { motion, AnimatePresence, HTMLMotionProps, Variants } from 'framer-motion';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

// Modal animations with spring physics
export const modalVariants: Variants = {
    hidden: {
        opacity: 0,
        scale: 0.95,
        y: 20,
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 20,
        transition: {
            duration: 0.2,
            ease: 'easeOut',
        },
    },
};

// Backdrop animations
export const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.2 },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.15 },
    },
};

// Toast animations
export const toastVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 50,
        scale: 0.9,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 25,
        },
    },
    exit: {
        opacity: 0,
        y: -20,
        scale: 0.9,
        transition: {
            duration: 0.2,
            ease: 'easeIn',
        },
    },
};

// List item stagger animations
export const listContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

export const listItemVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 20,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 24,
        },
    },
};

// Page transition variants
export const pageVariants: Variants = {
    initial: {
        opacity: 0,
        x: 20,
    },
    animate: {
        opacity: 1,
        x: 0,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
        },
    },
    exit: {
        opacity: 0,
        x: -20,
        transition: {
            duration: 0.15,
            ease: 'easeOut',
        },
    },
};

// Slide up panel (bottom sheet) variants
export const slideUpVariants: Variants = {
    hidden: {
        y: '100%',
        opacity: 0,
    },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
        },
    },
    exit: {
        y: '100%',
        opacity: 0,
        transition: {
            duration: 0.2,
            ease: 'easeIn',
        },
    },
};

// Scale fade variants (for cards, popups)
export const scaleFadeVariants: Variants = {
    hidden: {
        opacity: 0,
        scale: 0.9,
    },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 30,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.9,
        transition: {
            duration: 0.15,
        },
    },
};

// ============================================================================
// ANIMATED BUTTON COMPONENT
// ============================================================================

interface AnimatedButtonProps extends HTMLMotionProps<'button'> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    loadingText?: string;
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
    ({ children, variant = 'primary', size = 'md', isLoading, loadingText, className = '', disabled, ...props }, ref) => {
        const baseClasses = 'relative overflow-hidden font-medium rounded-full transition-colors flex items-center justify-center gap-2';

        const sizeClasses = {
            sm: 'px-4 py-2 min-h-[36px] text-sm',
            md: 'px-6 py-3 min-h-[48px] text-base',
            lg: 'px-8 py-4 min-h-[56px] text-lg',
        };

        const variantClasses = {
            primary: 'bg-day-accent dark:bg-night-accent text-white hover:opacity-90',
            secondary: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600',
            ghost: 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-day-text-secondary dark:text-night-text-secondary',
            danger: 'bg-red-500 text-white hover:bg-red-600',
        };

        return (
            <motion.button
                ref={ref}
                className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className} ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={disabled || isLoading}
                whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
                whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                {...props}
            >
                {isLoading ? (
                    <>
                        <motion.div
                            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        {loadingText || 'Loading...'}
                    </>
                ) : (
                    children
                )}
            </motion.button>
        );
    }
);

AnimatedButton.displayName = 'AnimatedButton';

// ============================================================================
// ANIMATED MODAL WRAPPER
// ============================================================================

interface AnimatedModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = ({ isOpen, onClose, children, className = '' }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-4 pb-[calc(6.5rem+var(--safe-area-inset-bottom))] sm:pb-4">
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={onClose}
                    />
                    <motion.div
                        className={`relative bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl shadow-2xl max-h-[calc(90vh-var(--safe-area-inset-bottom))] overflow-hidden ${className}`}
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// ============================================================================
// ANIMATED LIST COMPONENTS
// ============================================================================

interface AnimatedListProps {
    children: React.ReactNode;
    className?: string;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({ children, className = '' }) => {
    return (
        <motion.div
            className={className}
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
        >
            {children}
        </motion.div>
    );
};

interface AnimatedListItemProps {
    children: React.ReactNode;
    className?: string;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({ children, className = '' }) => {
    return (
        <motion.div className={className} variants={listItemVariants}>
            {children}
        </motion.div>
    );
};

// ============================================================================
// ANIMATED CARD COMPONENT
// ============================================================================

interface AnimatedCardProps extends HTMLMotionProps<'div'> {
    children: React.ReactNode;
    interactive?: boolean;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
    ({ children, interactive = false, className = '', ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                className={`bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border rounded-xl ${className}`}
                whileHover={interactive ? { scale: 1.02, y: -2 } : undefined}
                whileTap={interactive ? { scale: 0.98 } : undefined}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

AnimatedCard.displayName = 'AnimatedCard';

// ============================================================================
// SKELETON WITH SHIMMER
// ============================================================================

interface ShimmerSkeletonProps {
    className?: string;
    style?: React.CSSProperties;
}

export const ShimmerSkeleton: React.FC<ShimmerSkeletonProps> = ({ className = '', style }) => {
    return (
        <div
            className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer bg-[length:200%_100%] ${className}`}
            style={style}
        />
    );
};

// ============================================================================
// FAB WITH PULSE EFFECT
// ============================================================================

interface AnimatedFabProps extends HTMLMotionProps<'button'> {
    icon: React.ReactNode;
    label: string;
    showPulse?: boolean;
}

export const AnimatedFab: React.FC<AnimatedFabProps> = ({ icon, label, showPulse = false, className = '', ...props }) => {
    return (
        <motion.button
            className={`relative w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg flex items-center justify-center ${className}`}
            whileHover={{ scale: 1.1, boxShadow: '0 10px 40px rgba(99, 102, 241, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            aria-label={label}
            {...props}
        >
            {showPulse && (
                <motion.span
                    className="absolute inset-0 rounded-full bg-indigo-500"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                />
            )}
            {icon}
        </motion.button>
    );
};

// ============================================================================
// SUCCESS/ERROR FEEDBACK ANIMATIONS
// ============================================================================

interface FeedbackIconProps {
    type: 'success' | 'error';
    size?: number;
}

export const FeedbackIcon: React.FC<FeedbackIconProps> = ({ type, size = 24 }) => {
    if (type === 'success') {
        return (
            <motion.svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-500"
            >
                <motion.circle
                    cx="12"
                    cy="12"
                    r="10"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3 }}
                />
                <motion.path
                    d="M9 12l2 2 4-4"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.2, delay: 0.3 }}
                />
            </motion.svg>
        );
    }

    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-500"
        >
            <motion.circle
                cx="12"
                cy="12"
                r="10"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3 }}
            />
            <motion.path
                d="M15 9l-6 6M9 9l6 6"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.2, delay: 0.3 }}
            />
        </motion.svg>
    );
};

// ============================================================================
// PULL TO REFRESH INDICATOR
// ============================================================================

interface PullToRefreshIndicatorProps {
    progress: number; // 0 to 1
    isRefreshing: boolean;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({ progress, isRefreshing }) => {
    return (
        <motion.div
            className="flex items-center justify-center py-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{
                opacity: progress > 0.1 ? 1 : 0,
                y: progress > 0.1 ? 0 : -20,
            }}
        >
            <motion.div
                className="w-8 h-8 border-2 border-day-accent dark:border-night-accent border-t-transparent rounded-full"
                animate={isRefreshing ? { rotate: 360 } : { rotate: progress * 360 }}
                transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
            />
        </motion.div>
    );
};

// ============================================================================
// RIPPLE EFFECT HOOK
// ============================================================================

interface RippleProps {
    x: number;
    y: number;
    size: number;
}

export const useRipple = () => {
    const [ripples, setRipples] = React.useState<RippleProps[]>([]);

    const addRipple = (event: React.MouseEvent<HTMLElement>) => {
        const element = event.currentTarget;
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const size = Math.max(rect.width, rect.height) * 2;

        const newRipple = { x, y, size };
        setRipples((prev) => [...prev, newRipple]);

        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r !== newRipple));
        }, 600);
    };

    const RippleContainer: React.FC = () => (
        <>
            {ripples.map((ripple, index) => (
                <motion.span
                    key={index}
                    className="absolute bg-white/30 rounded-full pointer-events-none"
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{
                        left: ripple.x - ripple.size / 2,
                        top: ripple.y - ripple.size / 2,
                        width: ripple.size,
                        height: ripple.size,
                    }}
                />
            ))}
        </>
    );

    return { addRipple, RippleContainer };
};

// ============================================================================
// ANIMATED COUNTER
// ============================================================================

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, duration: _duration = 1, className = '' }) => {
    return (
        <motion.span
            className={className}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            key={value}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            {value}
        </motion.span>
    );
};

// ============================================================================
// LOADING DOTS
// ============================================================================

export const LoadingDots: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-2 h-2 bg-current rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
};
