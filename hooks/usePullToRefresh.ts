// hooks/usePullToRefresh.ts
/**
 * Custom hook for implementing pull-to-refresh functionality.
 * Works with native mobile gestures and provides smooth feedback.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import haptics from '../services/hapticsService';

interface UsePullToRefreshOptions {
    /** Callback function to execute on refresh */
    onRefresh: () => Promise<void>;
    /** Minimum pull distance to trigger refresh (default: 80) */
    threshold?: number;
    /** Maximum pull distance (default: 150) */
    maxPull?: number;
    /** Whether pull-to-refresh is enabled (default: true) */
    enabled?: boolean;
}

interface UsePullToRefreshReturn {
    /** Current pull distance (0 to maxPull) */
    pullDistance: number;
    /** Whether refresh is currently in progress */
    isRefreshing: boolean;
    /** Progress indicator (0 to 1) */
    progress: number;
    /** Touch event handlers to attach to the scrollable container */
    handlers: {
        onTouchStart: (e: React.TouchEvent) => void;
        onTouchMove: (e: React.TouchEvent) => void;
        onTouchEnd: () => void;
    };
    /** Container style to apply for pull animation */
    containerStyle: React.CSSProperties;
}

export const usePullToRefresh = ({
    onRefresh,
    threshold = 80,
    maxPull = 150,
    enabled = true
}: UsePullToRefreshOptions): UsePullToRefreshReturn => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const touchStartY = useRef(0);
    const lastPullDistance = useRef(0);
    const isPulling = useRef(false);
    const scrollableRef = useRef<HTMLElement | null>(null);
    const hapticTriggered = useRef(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isPulling.current = false;
        };
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!enabled || isRefreshing) return;

        const touch = e.touches[0];
        if (!touch) return;

        // Find the scrollable container
        const target = e.currentTarget as HTMLElement;
        scrollableRef.current = target;

        // Only start pull if at top of scroll
        if (target.scrollTop <= 0) {
            touchStartY.current = touch.clientY;
            isPulling.current = true;
            hapticTriggered.current = false;
        }
    }, [enabled, isRefreshing]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!enabled || !isPulling.current || isRefreshing) return;

        const touch = e.touches[0];
        if (!touch) return;

        // Check if still at top of scroll
        const target = scrollableRef.current;
        if (target && target.scrollTop > 0) {
            isPulling.current = false;
            setPullDistance(0);
            lastPullDistance.current = 0;
            return;
        }

        const deltaY = touch.clientY - touchStartY.current;

        // Only pull down, not up
        if (deltaY > 0) {
            // Apply resistance curve for natural feel
            const resistance = 0.5;
            const distance = Math.min(deltaY * resistance, maxPull);

            setPullDistance(distance);
            lastPullDistance.current = distance;

            // Haptic feedback when threshold is crossed
            if (distance >= threshold && !hapticTriggered.current) {
                haptics.medium();
                hapticTriggered.current = true;
            } else if (distance < threshold && hapticTriggered.current) {
                hapticTriggered.current = false;
            }

            // Prevent default scroll behavior when pulling
            if (distance > 10) {
                e.preventDefault();
            }
        }
    }, [enabled, isRefreshing, threshold, maxPull]);

    const handleTouchEnd = useCallback(async () => {
        if (!enabled || !isPulling.current || isRefreshing) return;

        isPulling.current = false;
        const finalDistance = lastPullDistance.current;

        if (finalDistance >= threshold) {
            // Trigger refresh
            setIsRefreshing(true);
            setPullDistance(threshold); // Hold at threshold while loading
            haptics.success();

            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
                lastPullDistance.current = 0;
            }
        } else {
            // Snap back
            setPullDistance(0);
            lastPullDistance.current = 0;
        }
    }, [enabled, isRefreshing, threshold, onRefresh]);

    const progress = Math.min(pullDistance / threshold, 1);

    const containerStyle: React.CSSProperties = {
        transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        transition: isPulling.current ? 'none' : 'transform 0.3s ease-out'
    };

    return {
        pullDistance,
        isRefreshing,
        progress,
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd
        },
        containerStyle
    };
};

export default usePullToRefresh;
