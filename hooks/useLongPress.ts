// hooks/useLongPress.ts
/**
 * Custom hook for handling long-press gestures with proper cleanup and scroll detection.
 * Provides consistent long-press behavior across the app.
 */
import { useRef, useCallback, useEffect } from 'react';
import haptics from '../services/hapticsService';

interface UseLongPressOptions {
    /** Duration in ms to trigger long press (default: 500) */
    duration?: number;
    /** Movement threshold in px to cancel long press (default: 10) */
    moveThreshold?: number;
    /** Whether to provide haptic feedback (default: true) */
    enableHaptics?: boolean;
    /** Callback when long press is triggered */
    onLongPress: () => void;
    /** Optional callback for regular tap/click */
    onPress?: () => void;
}

interface UseLongPressReturn {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export const useLongPress = ({
    duration = 500,
    moveThreshold = 10,
    enableHaptics = true,
    onLongPress,
    onPress
}: UseLongPressOptions): UseLongPressReturn => {
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressTriggered = useRef(false);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);

    // Cleanup timer on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
        };
    }, []);

    const clearLongPressTimer = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        touchStartPos.current = null;
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        isLongPressTriggered.current = false;
        const touch = e.touches[0];
        if (touch) {
            touchStartPos.current = { x: touch.clientX, y: touch.clientY };
        }

        longPressTimer.current = setTimeout(() => {
            isLongPressTriggered.current = true;
            if (enableHaptics) {
                haptics.longPress();
            }
            onLongPress();
        }, duration);
    }, [duration, enableHaptics, onLongPress]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        // Cancel long press if user moves finger beyond threshold (likely scrolling)
        if (longPressTimer.current && touchStartPos.current) {
            const touch = e.touches[0];
            if (touch) {
                const dx = Math.abs(touch.clientX - touchStartPos.current.x);
                const dy = Math.abs(touch.clientY - touchStartPos.current.y);
                if (dx > moveThreshold || dy > moveThreshold) {
                    clearLongPressTimer();
                }
            }
        }
    }, [moveThreshold, clearLongPressTimer]);

    const handleTouchEnd = useCallback(() => {
        const wasLongPress = isLongPressTriggered.current;
        clearLongPressTimer();

        // If it wasn't a long press and we have an onPress handler, call it
        if (!wasLongPress && onPress) {
            onPress();
        }
    }, [clearLongPressTimer, onPress]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        if (enableHaptics) {
            haptics.longPress();
        }
        onLongPress();
    }, [enableHaptics, onLongPress]);

    return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        onContextMenu: handleContextMenu
    };
};

export default useLongPress;
