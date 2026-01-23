/**
 * Haptic Alarm Ramp Service
 *
 * Provides escalating haptic patterns that sync with the audio alarm crescendo.
 * This is critical for:
 * - Phone face-down scenarios (audio muffled, haptics work)
 * - Hearing-impaired accessibility
 * - Somatic wake trigger (physical sensation activates different brain pathways)
 * - "Pillow-proof" alarm (works even under covers)
 *
 * Pattern phases (synced with 60-second audio crescendo):
 * - Phase 1 (0-20s): Gentle pulse every 4s
 * - Phase 2 (20-40s): Medium pulse every 2s
 * - Phase 3 (40-60s): Strong pulse every 1s
 * - Phase 4 (60s+): Continuous strong pulses every 500ms
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { logger } from './logger';

const isNative = Capacitor.isNativePlatform();

// Phase configuration for haptic ramp
interface HapticPhase {
    /** Duration of this phase in milliseconds */
    duration: number;
    /** Interval between pulses in milliseconds */
    interval: number;
    /** Haptic intensity: 'light', 'medium', 'heavy' */
    intensity: 'light' | 'medium' | 'heavy';
}

const HAPTIC_PHASES: HapticPhase[] = [
    // Phase 1 (0-20s): Gentle pulse every 4s
    { duration: 20000, interval: 4000, intensity: 'light' },
    // Phase 2 (20-40s): Medium pulse every 2s
    { duration: 20000, interval: 2000, intensity: 'medium' },
    // Phase 3 (40-60s): Strong pulse every 1s
    { duration: 20000, interval: 1000, intensity: 'heavy' },
    // Phase 4 (60s+): Continuous strong pulses every 500ms (runs until stopped)
    { duration: Infinity, interval: 500, intensity: 'heavy' },
];

// Active ramp state
let isRampActive = false;
let currentPhaseIndex = 0;
let phaseStartTime = 0;
let pulseIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Trigger a single haptic pulse with specified intensity
 */
async function triggerPulse(intensity: 'light' | 'medium' | 'heavy'): Promise<void> {
    if (!isNative) return;

    try {
        const impactStyle = {
            light: ImpactStyle.Light,
            medium: ImpactStyle.Medium,
            heavy: ImpactStyle.Heavy,
        }[intensity];

        await Haptics.impact({ style: impactStyle });
    } catch (error) {
        // Haptics might not be available on all devices
        logger.warn('[HapticAlarm] Pulse failed:', error);
    }
}

/**
 * Trigger a notification-style haptic (for phase transitions)
 */
async function triggerNotification(type: 'warning' | 'success' | 'error'): Promise<void> {
    if (!isNative) return;

    try {
        const notificationType = {
            warning: NotificationType.Warning,
            success: NotificationType.Success,
            error: NotificationType.Error,
        }[type];

        await Haptics.notification({ type: notificationType });
    } catch (error) {
        logger.warn('[HapticAlarm] Notification failed:', error);
    }
}

/**
 * Run a single phase of the haptic ramp
 */
function runPhase(phase: HapticPhase): void {
    if (!isRampActive) return;

    phaseStartTime = Date.now();

    // Clear any existing interval
    if (pulseIntervalId) {
        clearInterval(pulseIntervalId);
    }

    // Trigger immediate first pulse
    triggerPulse(phase.intensity);

    // Set up interval for subsequent pulses
    pulseIntervalId = setInterval(() => {
        if (!isRampActive) {
            if (pulseIntervalId) clearInterval(pulseIntervalId);
            return;
        }

        triggerPulse(phase.intensity);

        // Check if phase duration exceeded (unless infinite)
        if (phase.duration !== Infinity) {
            const elapsed = Date.now() - phaseStartTime;
            if (elapsed >= phase.duration) {
                // Move to next phase
                if (pulseIntervalId) clearInterval(pulseIntervalId);
                currentPhaseIndex++;
                if (currentPhaseIndex < HAPTIC_PHASES.length) {
                    // Notification pulse to indicate phase change
                    triggerNotification('warning');
                    const nextPhase = HAPTIC_PHASES[currentPhaseIndex];
                    if (nextPhase) {
                        setTimeout(() => runPhase(nextPhase), 100);
                    }
                }
            }
        }
    }, phase.interval);
}

/**
 * Start the haptic alarm ramp
 * Call this when the alarm starts playing
 */
export function startHapticAlarmRamp(): void {
    if (!isNative) {
        logger.log('[HapticAlarm] Not available on web');
        return;
    }

    if (isRampActive) {
        logger.warn('[HapticAlarm] Ramp already active');
        return;
    }

    logger.log('[HapticAlarm] Starting haptic alarm ramp');
    isRampActive = true;
    currentPhaseIndex = 0;

    // Initial notification pulse to indicate alarm start
    triggerNotification('warning');

    // Start first phase after brief delay
    setTimeout(() => {
        if (isRampActive && HAPTIC_PHASES.length > 0) {
            const firstPhase = HAPTIC_PHASES[0];
            if (firstPhase) {
                runPhase(firstPhase);
            }
        }
    }, 500);
}

/**
 * Stop the haptic alarm ramp
 * Call this when the alarm is dismissed or snoozed
 */
export function stopHapticAlarmRamp(): void {
    if (!isRampActive) return;

    logger.log('[HapticAlarm] Stopping haptic alarm ramp');
    isRampActive = false;

    if (pulseIntervalId) {
        clearInterval(pulseIntervalId);
        pulseIntervalId = null;
    }

    // Success pulse to indicate alarm stopped
    if (isNative) {
        triggerNotification('success');
    }
}

/**
 * Check if haptic alarm ramp is currently active
 */
export function isHapticAlarmActive(): boolean {
    return isRampActive;
}

/**
 * Get current phase info (for debugging/UI)
 */
export function getCurrentPhaseInfo(): { phase: number; elapsed: number; intensity: string } | null {
    if (!isRampActive) return null;

    const phase = HAPTIC_PHASES[currentPhaseIndex];
    return {
        phase: currentPhaseIndex + 1,
        elapsed: Date.now() - phaseStartTime,
        intensity: phase?.intensity || 'unknown',
    };
}

/**
 * Trigger a single wake-up haptic pattern
 * Use for snooze end or other wake triggers
 */
export async function triggerWakePattern(): Promise<void> {
    if (!isNative) return;

    try {
        // Triple pulse pattern
        await Haptics.impact({ style: ImpactStyle.Heavy });
        await new Promise(r => setTimeout(r, 150));
        await Haptics.impact({ style: ImpactStyle.Heavy });
        await new Promise(r => setTimeout(r, 150));
        await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
        logger.warn('[HapticAlarm] Wake pattern failed:', error);
    }
}

/**
 * Check if haptics are available on this device
 */
export function isHapticsAvailable(): boolean {
    return isNative;
}

/**
 * Comprehensive cleanup of haptic alarm resources.
 * Call on app termination/background to prevent orphaned timers.
 * Critical for app store compliance - prevents battery drain.
 */
export function cleanupHapticAlarm(): void {
    logger.log('[HapticAlarm] Cleaning up haptic alarm resources');

    // Stop any active ramp
    if (isRampActive) {
        isRampActive = false;
    }

    // Clear any active interval
    if (pulseIntervalId) {
        clearInterval(pulseIntervalId);
        pulseIntervalId = null;
    }

    // Reset state
    currentPhaseIndex = 0;
    phaseStartTime = 0;

    logger.log('[HapticAlarm] Cleanup completed');
}

/**
 * Check if device supports haptic feedback (runtime check).
 * Some devices report isNative but don't have haptic hardware.
 */
export async function checkHapticSupport(): Promise<boolean> {
    if (!isNative) return false;

    try {
        // Attempt a very light haptic to verify support
        await Haptics.impact({ style: ImpactStyle.Light });
        return true;
    } catch (error) {
        logger.warn('[HapticAlarm] Device does not support haptics:', error);
        return false;
    }
}

/**
 * Pause haptic ramp temporarily (e.g., during phone call).
 * Can be resumed with resumeHapticAlarmRamp().
 */
export function pauseHapticAlarmRamp(): void {
    if (!isRampActive) return;

    logger.log('[HapticAlarm] Pausing haptic alarm ramp');

    if (pulseIntervalId) {
        clearInterval(pulseIntervalId);
        pulseIntervalId = null;
    }

    // Note: isRampActive remains true so we can resume
}

/**
 * Resume a paused haptic ramp from current phase.
 */
export function resumeHapticAlarmRamp(): void {
    if (!isRampActive || pulseIntervalId !== null) {
        // Not paused or already running
        return;
    }

    logger.log('[HapticAlarm] Resuming haptic alarm ramp from phase', currentPhaseIndex + 1);

    const phase = HAPTIC_PHASES[currentPhaseIndex];
    if (phase) {
        runPhase(phase);
    }
}
