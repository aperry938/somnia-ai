import { useEffect, useRef, useCallback } from 'react';
import haptics from '../services/hapticsService';

interface UseScrollHapticsOptions {
    /** Distance in pixels between each haptic tick (default: 100) */
    tickInterval?: number;
    /** Minimum velocity (px/ms) required to trigger haptics (default: 0.5) */
    minVelocity?: number;
    /** Whether haptics are enabled (default: true) */
    enabled?: boolean;
}

/**
 * Custom hook to add scroll tick haptics to a scrollable element.
 * Provides tactile feedback at regular intervals during scroll.
 *
 * Usage:
 * ```tsx
 * const scrollRef = useRef<HTMLDivElement>(null);
 * useScrollHaptics(scrollRef);
 *
 * return <div ref={scrollRef} className="overflow-y-auto">...</div>
 * ```
 */
export function useScrollHaptics(
    ref: React.RefObject<HTMLElement | null>,
    options: UseScrollHapticsOptions = {}
) {
    const { tickInterval = 100, minVelocity = 0.5, enabled = true } = options;

    const lastScrollTop = useRef(0);
    const lastTickPosition = useRef(0);
    const lastScrollTime = useRef(Date.now());
    const isScrolling = useRef(false);
    const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleScroll = useCallback(() => {
        if (!enabled || !ref.current) return;

        const currentScrollTop = ref.current.scrollTop;
        const currentTime = Date.now();
        const timeDelta = currentTime - lastScrollTime.current;
        const scrollDelta = Math.abs(currentScrollTop - lastScrollTop.current);

        // Calculate velocity (px/ms)
        const velocity = timeDelta > 0 ? scrollDelta / timeDelta : 0;

        // Only trigger haptics if scrolling with sufficient velocity
        if (velocity >= minVelocity) {
            // Calculate distance since last tick
            const distanceSinceLastTick = Math.abs(currentScrollTop - lastTickPosition.current);

            // Trigger tick at each interval
            if (distanceSinceLastTick >= tickInterval) {
                haptics.tick();
                lastTickPosition.current = currentScrollTop;
            }
        }

        lastScrollTop.current = currentScrollTop;
        lastScrollTime.current = currentTime;
        isScrolling.current = true;

        // Reset tick position when scrolling stops
        if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
        }
        scrollTimeout.current = setTimeout(() => {
            isScrolling.current = false;
            // Align tick position to current scroll for next scroll session
            if (ref.current) {
                lastTickPosition.current = ref.current.scrollTop;
            }
        }, 150);
    }, [ref, tickInterval, minVelocity, enabled]);

    useEffect(() => {
        const element = ref.current;
        if (!element || !enabled) return;

        // Initialize positions
        lastScrollTop.current = element.scrollTop;
        lastTickPosition.current = element.scrollTop;

        element.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            element.removeEventListener('scroll', handleScroll);
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
        };
    }, [ref, handleScroll, enabled]);
}

export default useScrollHaptics;
