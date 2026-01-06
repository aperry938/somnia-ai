import { useEffect, useRef, useCallback } from 'react';
import { Page } from '../types';

// Main navigable pages in order
const SWIPE_PAGES: Page[] = ['alarms', 'sleep', 'chronicle', 'insights'];

interface SwipeConfig {
    threshold?: number; // Minimum swipe distance in pixels
    velocityThreshold?: number; // Minimum velocity for quick swipes
}

export const useSwipeNavigation = (
    currentPage: Page,
    setCurrentPage: (page: Page) => void,
    config: SwipeConfig = {}
) => {
    const { threshold = 50, velocityThreshold = 0.3 } = config;

    const touchStartX = useRef<number>(0);
    const touchStartY = useRef<number>(0);
    const touchStartTime = useRef<number>(0);
    const isSwiping = useRef<boolean>(false);

    const handleSwipe = useCallback((direction: 'left' | 'right') => {
        const currentIndex = SWIPE_PAGES.indexOf(currentPage);

        // Only handle swipe for main pages
        if (currentIndex === -1) return;

        if (direction === 'left' && currentIndex < SWIPE_PAGES.length - 1) {
            // Swipe left = go to next page
            setCurrentPage(SWIPE_PAGES[currentIndex + 1]);
        } else if (direction === 'right' && currentIndex > 0) {
            // Swipe right = go to previous page
            setCurrentPage(SWIPE_PAGES[currentIndex - 1]);
        }
    }, [currentPage, setCurrentPage]);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            // Don't start swipe if touching scrollable elements or modals
            const target = e.target as HTMLElement;
            if (
                target.closest('.no-swipe') ||
                target.closest('[role="dialog"]') ||
                target.closest('.overflow-y-auto') ||
                target.closest('.overflow-x-auto')
            ) {
                isSwiping.current = false;
                return;
            }

            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
            touchStartTime.current = Date.now();
            isSwiping.current = true;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isSwiping.current) return;

            const deltaX = e.touches[0].clientX - touchStartX.current;
            const deltaY = e.touches[0].clientY - touchStartY.current;

            // If vertical scroll is more prominent, cancel swipe navigation
            if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
                isSwiping.current = false;
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!isSwiping.current) return;

            const touchEndX = e.changedTouches[0].clientX;
            const deltaX = touchEndX - touchStartX.current;
            const deltaTime = Date.now() - touchStartTime.current;
            const velocity = Math.abs(deltaX) / deltaTime;

            // Check if swipe meets threshold (distance or velocity)
            const isValidSwipe = Math.abs(deltaX) > threshold || velocity > velocityThreshold;

            if (isValidSwipe) {
                if (deltaX < 0) {
                    handleSwipe('left');
                } else if (deltaX > 0) {
                    handleSwipe('right');
                }
            }

            isSwiping.current = false;
        };

        // Add listeners to document for global swipe detection
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleSwipe, threshold, velocityThreshold]);

    // Return current page index for potential visual indicators
    const currentIndex = SWIPE_PAGES.indexOf(currentPage);
    const canSwipeLeft = currentIndex < SWIPE_PAGES.length - 1 && currentIndex !== -1;
    const canSwipeRight = currentIndex > 0;

    return { canSwipeLeft, canSwipeRight, currentIndex, totalPages: SWIPE_PAGES.length };
};
