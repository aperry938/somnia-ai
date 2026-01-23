import { useEffect, useRef, RefObject } from 'react';

/**
 * Hook to trap focus within a modal/dialog for accessibility.
 * When the modal is open, focus cycles through focusable elements.
 *
 * @param isOpen - Whether the modal is currently open
 * @param containerRef - Optional ref to the container element. If not provided, creates one.
 * @returns A ref to attach to the modal container if containerRef is not provided
 */
export const useFocusTrap = <T extends HTMLElement = HTMLDivElement>(
    isOpen: boolean,
    containerRef?: RefObject<T | null>
): RefObject<T> => {
    const internalRef = useRef<T>(null);
    const ref = containerRef ?? internalRef;
    const previousActiveElement = useRef<Element | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        // Store the currently focused element to restore later
        previousActiveElement.current = document.activeElement;

        const container = ref.current;
        if (!container) return;

        // Get all focusable elements within the container
        const getFocusableElements = (): HTMLElement[] => {
            const focusableSelectors = [
                'button:not([disabled])',
                'a[href]',
                'input:not([disabled])',
                'select:not([disabled])',
                'textarea:not([disabled])',
                '[tabindex]:not([tabindex="-1"])',
            ].join(', ');

            return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
        };

        // Focus the first focusable element or the container itself
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
            const firstElement = focusableElements[0];
            // Delay focus to ensure modal is fully rendered
            requestAnimationFrame(() => {
                firstElement?.focus();
            });
        } else {
            // Make container focusable if no focusable elements
            container.setAttribute('tabindex', '-1');
            container.focus();
        }

        // Handle tab key to trap focus
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;

            const focusableElements = getFocusableElements();
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) {
                // Shift + Tab: moving backwards
                if (document.activeElement === firstElement && lastElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab: moving forwards
                if (document.activeElement === lastElement && firstElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);

            // Restore focus to the previously focused element
            if (previousActiveElement.current instanceof HTMLElement) {
                previousActiveElement.current.focus();
            }
        };
    }, [isOpen, ref]);

    return ref as RefObject<T>;
};
