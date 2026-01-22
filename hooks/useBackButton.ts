import { useEffect, useRef, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { logger } from '../services/logger';

/**
 * Hook to register a modal/popup with the back button handler.
 * When the hardware back button is pressed, the most recently registered
 * modal will be closed first (LIFO stack behavior).
 * 
 * @param isOpen - Whether the modal is currently open
 * @param onClose - Function to call when back button should close this modal
 * @param priority - Optional priority (higher = handled first). Default is 0.
 */

// Global stack of close handlers - LIFO order
const closeHandlerStack: Array<{ id: string; onClose: () => void; priority: number }> = [];
let listenerRegistered = false;

// Register the global listener once
const registerGlobalListener = () => {
    if (listenerRegistered || !Capacitor.isNativePlatform()) return;

    listenerRegistered = true;

    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        logger.log('[BackButton] Pressed, stack size:', closeHandlerStack.length, 'canGoBack:', canGoBack);

        if (closeHandlerStack.length > 0) {
            // Sort by priority (highest first) and get the top handler
            const sorted = [...closeHandlerStack].sort((a, b) => b.priority - a.priority);
            const topHandler = sorted[0];

            if (topHandler) {
                logger.log('[BackButton] Closing modal:', topHandler.id);
                topHandler.onClose();
            }
        } else if (canGoBack) {
            // No modals open - let the system handle it (browser history)
            window.history.back();
        } else {
            // No modals, no history - minimize app (don't exit)
            CapacitorApp.minimizeApp();
        }
    });

    logger.log('[BackButton] Global listener registered');
};

export const useBackButton = (
    isOpen: boolean,
    onClose: () => void,
    priority: number = 0
) => {
    const handlerId = useRef(`modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

    // Memoize onClose to avoid unnecessary re-registrations
    const stableOnClose = useCallback(() => {
        onClose();
    }, [onClose]);

    useEffect(() => {
        // Register global listener on first use
        registerGlobalListener();

        // Capture handler ID for cleanup to avoid stale ref issue
        const currentHandlerId = handlerId.current;

        if (isOpen) {
            // Add to stack
            closeHandlerStack.push({
                id: currentHandlerId,
                onClose: stableOnClose,
                priority,
            });
            logger.log('[BackButton] Registered modal:', currentHandlerId, 'stack size:', closeHandlerStack.length);
        }

        return () => {
            // Remove from stack using captured value
            const index = closeHandlerStack.findIndex(h => h.id === currentHandlerId);
            if (index !== -1) {
                closeHandlerStack.splice(index, 1);
                logger.log('[BackButton] Unregistered modal:', currentHandlerId, 'stack size:', closeHandlerStack.length);
            }
        };
    }, [isOpen, stableOnClose, priority]);
};

/**
 * Hook to use in the app root to prevent default back button behavior.
 * Call this once in App.tsx to ensure the listener is always registered.
 */
export const useBackButtonInit = () => {
    useEffect(() => {
        registerGlobalListener();
    }, []);
};
