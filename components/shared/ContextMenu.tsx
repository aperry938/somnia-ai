// components/shared/ContextMenu.tsx
/**
 * A reusable context menu component for long-press actions.
 * Displays a list of actions in a modal overlay.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import haptics from '../../services/hapticsService';

export interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'primary';
    disabled?: boolean;
}

interface ContextMenuProps {
    isOpen: boolean;
    onClose: () => void;
    items: ContextMenuItem[];
    title?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    isOpen,
    onClose,
    items,
    title
}) => {
    const focusTrapRef = useFocusTrap(isOpen);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleItemClick = useCallback((item: ContextMenuItem) => {
        if (item.disabled) return;

        if (item.variant === 'danger') {
            haptics.warning();
        } else {
            haptics.medium();
        }

        item.onClick();
        onClose();
    }, [onClose]);

    const getVariantClasses = (variant: ContextMenuItem['variant']) => {
        switch (variant) {
            case 'danger':
                return 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/50';
            case 'primary':
                return 'text-day-accent dark:text-night-accent hover:bg-day-accent/10 dark:hover:bg-night-accent/10 active:bg-day-accent/20 dark:active:bg-night-accent/20';
            default:
                return 'text-day-text-primary dark:text-night-text-primary hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-[calc(6.5rem+var(--safe-area-inset-bottom))] sm:pb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Menu */}
                    <motion.div
                        ref={(node) => {
                            // Combine refs
                            if (focusTrapRef) {
                                (focusTrapRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                            }
                            (menuRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                        }}
                        className="relative bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm"
                        role="menu"
                        aria-modal="true"
                        aria-label={title || 'Context menu'}
                        initial={{ y: 50, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                    >
                        {title && (
                            <div className="px-4 py-3 border-b border-day-border dark:border-night-border">
                                <h3 className="font-serif text-lg text-center text-day-text-primary dark:text-night-text-primary">
                                    {title}
                                </h3>
                            </div>
                        )}

                        <div className="py-2">
                            {items.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleItemClick(item)}
                                    disabled={item.disabled}
                                    role="menuitem"
                                    className={`w-full flex items-center gap-3 px-4 py-3 min-h-[52px] text-left transition-colors ${getVariantClasses(item.variant)} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {item.icon && (
                                        <span className="flex-shrink-0 w-5 h-5">
                                            {item.icon}
                                        </span>
                                    )}
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Cancel button */}
                        <div className="border-t border-day-border dark:border-night-border">
                            <button
                                onClick={() => {
                                    haptics.light();
                                    onClose();
                                }}
                                role="menuitem"
                                className="w-full py-4 min-h-[52px] text-center font-medium text-day-text-secondary dark:text-night-text-secondary hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ContextMenu;
