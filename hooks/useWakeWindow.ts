import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../services/logger';

interface WakeEvent {
    timestamp: number;
    magnitude: number;
}

/**
 * Hook to detect wake movements using Device Motion API.
 * Detects significant movement that might indicate waking up.
 * 
 * Note: Requires HTTPS (or localhost) and user permission on iOS 13+.
 */
export const useWakeWindow = (isActive: boolean, onWakeDetected?: (event: WakeEvent) => void) => {
    const [isSupported, setIsSupported] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
    const [movementLog, setMovementLog] = useState<WakeEvent[]>([]);
    const lastEventTime = useRef<number>(0);

    // Initial Support Check
    useEffect(() => {
        if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
            setIsSupported(true);
            // Check if permission API exists (iOS 13+)
            if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
                setPermissionStatus('prompt');
            } else {
                setPermissionStatus('granted'); // Non-iOS doesn't need explicit permission prompt usually
            }
        }
    }, []);

    const handleMotion = useCallback((event: DeviceMotionEvent) => {
        if (!isActive) return;

        const { acceleration } = event;
        if (!acceleration) return;

        const x = acceleration.x || 0;
        const y = acceleration.y || 0;
        const z = acceleration.z || 0;

        // Calculate magnitude of acceleration vector (simple movement intensity)
        const magnitude = Math.sqrt(x * x + y * y + z * z);

        // Threshold for "significant movement" (tweak based on testing)
        // Sitting up or rolling over usually generates > 1.0 m/s^2 sans gravity
        const WAKE_THRESHOLD = 1.5;

        // Debounce: Only log 1 event per second max
        const now = Date.now();
        if (magnitude > WAKE_THRESHOLD && now - lastEventTime.current > 1000) {
            lastEventTime.current = now;
            const wakeEvent = { timestamp: now, magnitude };

            setMovementLog(prev => [...prev.slice(-49), wakeEvent]); // Keep last 50
            if (onWakeDetected) {
                onWakeDetected(wakeEvent);
            }
        }
    }, [isActive, onWakeDetected]);

    const requestPermission = async () => {
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            try {
                const response = await (DeviceMotionEvent as any).requestPermission();
                setPermissionStatus(response === 'granted' ? 'granted' : 'denied');
                return response === 'granted';
            } catch (error) {
                logger.error("Permission request failed", error);
                setPermissionStatus('denied');
                return false;
            }
        }
        return true;
    };

    useEffect(() => {
        if (isActive && permissionStatus === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
        }
        return () => {
            window.removeEventListener('devicemotion', handleMotion);
        };
    }, [isActive, permissionStatus, handleMotion]);

    return {
        isSupported,
        permissionStatus,
        movementLog,
        requestPermission
    };
};
