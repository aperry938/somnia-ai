import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../services/logger';

// iOS 13+ DeviceMotionEvent extension for permission API
interface DeviceMotionEventWithPermission {
    requestPermission?: () => Promise<'granted' | 'denied'>;
}

interface WakeEvent {
    timestamp: number;
    magnitude: number;
}

// Configuration constants
const WAKE_THRESHOLD = 1.5; // m/s^2 threshold for significant movement
const DEBOUNCE_INTERVAL = 1000; // 1 second minimum between events
const MAX_LOG_SIZE = 50; // Maximum events to keep in memory
const THROTTLE_INTERVAL = 100; // 100ms minimum between motion handler calls

/**
 * Hook to detect wake movements using Device Motion API.
 * Detects significant movement that might indicate waking up.
 *
 * Note: Requires HTTPS (or localhost) and user permission on iOS 13+.
 *
 * Features:
 * - Proper cleanup on unmount
 * - Throttled motion handler for performance
 * - Memory-efficient movement log with max size
 * - iOS permission handling
 */
export const useWakeWindow = (isActive: boolean, onWakeDetected?: (event: WakeEvent) => void) => {
    const [isSupported, setIsSupported] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
    const [movementLog, setMovementLog] = useState<WakeEvent[]>([]);

    // Refs for cleanup and state management
    const lastEventTimeRef = useRef<number>(0);
    const lastHandlerCallRef = useRef<number>(0);
    const isMountedRef = useRef(true);
    const onWakeDetectedRef = useRef(onWakeDetected);

    // Keep callback ref updated to avoid stale closures
    useEffect(() => {
        onWakeDetectedRef.current = onWakeDetected;
    }, [onWakeDetected]);

    // Initial Support Check
    useEffect(() => {
        isMountedRef.current = true;

        if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
            setIsSupported(true);
            // Check if permission API exists (iOS 13+)
            const DeviceMotionEventIOS = DeviceMotionEvent as unknown as DeviceMotionEventWithPermission;
            if (typeof DeviceMotionEventIOS.requestPermission === 'function') {
                setPermissionStatus('prompt');
            } else {
                setPermissionStatus('granted'); // Non-iOS doesn't need explicit permission prompt usually
            }
        }

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleMotion = useCallback((event: DeviceMotionEvent) => {
        if (!isActive || !isMountedRef.current) return;

        // Throttle handler calls for performance
        const now = Date.now();
        if (now - lastHandlerCallRef.current < THROTTLE_INTERVAL) {
            return;
        }
        lastHandlerCallRef.current = now;

        const { acceleration } = event;
        if (!acceleration) return;

        const x = acceleration.x || 0;
        const y = acceleration.y || 0;
        const z = acceleration.z || 0;

        // Calculate magnitude of acceleration vector (simple movement intensity)
        const magnitude = Math.sqrt(x * x + y * y + z * z);

        // Debounce: Only log 1 event per second max
        if (magnitude > WAKE_THRESHOLD && now - lastEventTimeRef.current > DEBOUNCE_INTERVAL) {
            lastEventTimeRef.current = now;
            const wakeEvent = { timestamp: now, magnitude };

            // Memory-efficient log update - avoid creating new array if at max size
            setMovementLog(prev => {
                if (!isMountedRef.current) return prev;
                if (prev.length >= MAX_LOG_SIZE) {
                    // Reuse array slice instead of spread for better memory efficiency
                    const newLog = prev.slice(1);
                    newLog.push(wakeEvent);
                    return newLog;
                }
                return [...prev, wakeEvent];
            });

            // Call callback using ref to avoid stale closure
            if (onWakeDetectedRef.current) {
                onWakeDetectedRef.current(wakeEvent);
            }
        }
    }, [isActive]);

    const requestPermission = useCallback(async (): Promise<boolean> => {
        const DeviceMotionEventIOS = DeviceMotionEvent as unknown as DeviceMotionEventWithPermission;
        if (typeof DeviceMotionEventIOS.requestPermission === 'function') {
            try {
                const response = await DeviceMotionEventIOS.requestPermission();
                if (isMountedRef.current) {
                    setPermissionStatus(response === 'granted' ? 'granted' : 'denied');
                }
                return response === 'granted';
            } catch (error) {
                logger.error("Permission request failed", error);
                if (isMountedRef.current) {
                    setPermissionStatus('denied');
                }
                return false;
            }
        }
        return true;
    }, []);

    useEffect(() => {
        if (isActive && permissionStatus === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
            logger.log('[useWakeWindow] Motion listener attached');
        }
        return () => {
            window.removeEventListener('devicemotion', handleMotion);
            logger.log('[useWakeWindow] Motion listener removed');
        };
    }, [isActive, permissionStatus, handleMotion]);

    // Clear movement log when deactivated to free memory
    useEffect(() => {
        if (!isActive && movementLog.length > 0) {
            // Keep a short delay to allow any final processing
            const timeoutId = setTimeout(() => {
                if (isMountedRef.current && !isActive) {
                    setMovementLog([]);
                    logger.log('[useWakeWindow] Movement log cleared');
                }
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [isActive, movementLog.length]);

    // Clear movement log function for manual cleanup
    const clearMovementLog = useCallback(() => {
        setMovementLog([]);
    }, []);

    return {
        isSupported,
        permissionStatus,
        movementLog,
        requestPermission,
        clearMovementLog,
    };
};
