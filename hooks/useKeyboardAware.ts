/**
 * useKeyboardAware - Hook to handle keyboard appearance on mobile
 *
 * Automatically scrolls focused input elements into view when the virtual keyboard appears,
 * preventing inputs from being hidden behind the keyboard.
 */
import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
// @ts-expect-error — @capacitor/keyboard types may not be installed (native-only plugin)
import { Keyboard } from '@capacitor/keyboard';

interface UseKeyboardAwareOptions {
    /** Whether the hook is active */
    enabled?: boolean;
    /** Offset from bottom of viewport to keep input visible (default: 120px) */
    bottomOffset?: number;
    /** Delay before scrolling after keyboard shows (default: 100ms) */
    scrollDelay?: number;
}

/**
 * Hook that handles keyboard appearance and scrolls focused inputs into view
 */
export function useKeyboardAware(options: UseKeyboardAwareOptions = {}) {
    const {
        enabled = true,
        bottomOffset = 120,
        scrollDelay = 100,
    } = options;

    const isNative = Capacitor.isNativePlatform();
    const keyboardHeightRef = useRef(0);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const focusTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Scroll the focused element into view
    const scrollFocusedElementIntoView = useCallback(() => {
        const activeElement = document.activeElement as HTMLElement | null;
        if (!activeElement || !['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
            return;
        }

        // Wait a bit for keyboard animation
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            const rect = activeElement.getBoundingClientRect();
            const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
            // Check if element is hidden by keyboard
            const elementBottom = rect.bottom;
            const visibleAreaBottom = viewportHeight - bottomOffset;

            if (elementBottom > visibleAreaBottom) {
                // Scroll the element into view with smooth behavior
                activeElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        }, scrollDelay);
    }, [bottomOffset, scrollDelay]);

    useEffect(() => {
        if (!enabled) return;

        let keyboardShowListener: (() => Promise<void>) | undefined;
        let keyboardHideListener: (() => Promise<void>) | undefined;

        if (isNative) {
            // Native: Use Capacitor Keyboard plugin
            const setupNativeListeners = async () => {
                try {
                    keyboardShowListener = (await Keyboard.addListener('keyboardWillShow', (info: { keyboardHeight: number }) => {
                        keyboardHeightRef.current = info.keyboardHeight;
                        scrollFocusedElementIntoView();
                    })).remove;

                    keyboardHideListener = (await Keyboard.addListener('keyboardWillHide', () => {
                        keyboardHeightRef.current = 0;
                    })).remove;
                } catch {
                    // Keyboard plugin not available, use web fallback
                }
            };
            setupNativeListeners();
        }

        // Web fallback: Listen for visualViewport resize (keyboard appearing)
        const handleViewportResize = () => {
            scrollFocusedElementIntoView();
        };

        // Also handle focus events to ensure scrolling works
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName)) {
                // Delay to allow keyboard to appear
                clearTimeout(focusTimeoutRef.current);
                focusTimeoutRef.current = setTimeout(scrollFocusedElementIntoView, 300);
            }
        };

        window.visualViewport?.addEventListener('resize', handleViewportResize);
        document.addEventListener('focusin', handleFocusIn);

        return () => {
            clearTimeout(scrollTimeoutRef.current);
            clearTimeout(focusTimeoutRef.current);
            keyboardShowListener?.();
            keyboardHideListener?.();
            window.visualViewport?.removeEventListener('resize', handleViewportResize);
            document.removeEventListener('focusin', handleFocusIn);
        };
    }, [enabled, isNative, scrollFocusedElementIntoView]);
}

/**
 * Utility function to manually scroll an element into view above the keyboard
 */
export function scrollInputIntoView(element: HTMLElement | null, offset = 120) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const visibleAreaBottom = viewportHeight - offset;

    if (rect.bottom > visibleAreaBottom) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }
}
