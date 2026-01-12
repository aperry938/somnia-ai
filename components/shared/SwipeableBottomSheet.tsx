import React, { ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import haptics from '../../services/hapticsService';

interface SwipeableBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    /** Height of the sheet: 'full' | 'auto' | specific px value */
    height?: 'full' | 'auto' | number;
    /** Show drag indicator bar at top */
    showDragIndicator?: boolean;
    /** Close threshold in pixels (default: 100) */
    closeThreshold?: number;
    /** Additional CSS classes for the sheet container */
    className?: string;
}

/**
 * SwipeableBottomSheet - Native-feel bottom sheet with swipe-to-dismiss
 *
 * Features:
 * - 1:1 finger tracking during drag
 * - Velocity-based throw physics
 * - Haptic feedback at dismiss threshold
 * - Backdrop tap to close
 * - Smooth spring animations
 */
export const SwipeableBottomSheet: React.FC<SwipeableBottomSheetProps> = ({
    isOpen,
    onClose,
    children,
    height = 'auto',
    showDragIndicator = true,
    closeThreshold = 100,
    className = '',
}) => {
    const y = useMotionValue(0);
    const backdropOpacity = useTransform(y, [0, 300], [1, 0]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const shouldClose = info.offset.y > closeThreshold || info.velocity.y > 500;

        if (shouldClose) {
            haptics.medium();
            onClose();
        }
    };

    const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Haptic feedback when crossing threshold
        if (info.offset.y >= closeThreshold - 10 && info.offset.y <= closeThreshold + 10) {
            haptics.light();
        }
    };

    if (!isOpen) return null;

    const sheetHeight = height === 'full' ? '100vh' : height === 'auto' ? 'auto' : `${height}px`;

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/50"
                style={{ opacity: backdropOpacity }}
                onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
                className={`relative w-full max-w-lg bg-white/95 dark:bg-slate-800/95 rounded-t-2xl overflow-hidden ${className}`}
                style={{
                    y,
                    height: sheetHeight,
                    maxHeight: '90vh',
                }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{
                    type: 'spring',
                    damping: 30,
                    stiffness: 300,
                }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
            >
                {/* Drag Indicator */}
                {showDragIndicator && (
                    <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                        <div className="w-10 h-1 rounded-full bg-day-border dark:bg-night-border" />
                    </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto pb-[var(--safe-area-inset-bottom)]" style={{ maxHeight: 'calc(90vh - 40px)' }}>
                    {children}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SwipeableBottomSheet;
