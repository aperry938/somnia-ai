// services/hapticsService.ts
// Centralized haptic feedback service using Capacitor Haptics for native mobile
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();
const isIOS = Capacitor.getPlatform() === 'ios';
const isAndroid = Capacitor.getPlatform() === 'android';

// Capability cache to avoid repeated checks
let hapticCapabilityChecked = false;
let hapticCapabilitySupported = true;

// User preference for haptics (respects accessibility settings)
let hapticsEnabled = true;

/**
 * Check device haptic capability at runtime.
 * Some devices report native but lack haptic hardware (older tablets, emulators).
 */
const checkHapticCapability = async (): Promise<boolean> => {
    if (hapticCapabilityChecked) {
        return hapticCapabilitySupported;
    }

    if (!isNative) {
        hapticCapabilityChecked = true;
        hapticCapabilitySupported = 'vibrate' in navigator;
        return hapticCapabilitySupported;
    }

    try {
        // Attempt a minimal haptic to verify hardware support
        await Haptics.impact({ style: ImpactStyle.Light });
        hapticCapabilityChecked = true;
        hapticCapabilitySupported = true;
    } catch {
        hapticCapabilityChecked = true;
        hapticCapabilitySupported = false;
    }

    return hapticCapabilitySupported;
};

/**
 * Enable or disable haptics (for user preferences/accessibility).
 */
export const setHapticsEnabled = (enabled: boolean): void => {
    hapticsEnabled = enabled;
};

/**
 * Check if haptics are currently enabled.
 */
export const isHapticsEnabled = (): boolean => hapticsEnabled;

// Core haptic function - native on mobile, web fallback in browser
const triggerHaptic = async (
    nativeAction: () => Promise<void>,
    webPattern?: number | number[]
): Promise<void> => {
    // Respect user preference
    if (!hapticsEnabled) return;

    // Check capability (cached after first check)
    if (!hapticCapabilityChecked) {
        await checkHapticCapability();
    }

    if (!hapticCapabilitySupported) return;

    if (isNative) {
        try {
            await nativeAction();
        } catch (error) {
            // Haptics may not be available on all devices
            // Common errors: plugin not available, hardware not present
            // Mark as unsupported to prevent further attempts
            if (error instanceof Error &&
                (error.message.includes('not implemented') ||
                 error.message.includes('not available'))) {
                hapticCapabilitySupported = false;
            }
        }
    } else if (webPattern && 'vibrate' in navigator) {
        try {
            navigator.vibrate(webPattern);
        } catch {
            // Web vibration not available (some browsers block in background)
        }
    }
};

/**
 * Haptic feedback patterns - designed to be gentle and appropriate
 * Uses native Capacitor Haptics on iOS/Android for proper haptic engine support
 */
export const haptics = {
    // Light tap - for button presses, selections
    light: () => triggerHaptic(
        () => Haptics.impact({ style: ImpactStyle.Light }),
        10
    ),

    // Medium tap - for confirmations, toggles
    medium: () => triggerHaptic(
        () => Haptics.impact({ style: ImpactStyle.Medium }),
        20
    ),

    // Success - notification success
    success: () => triggerHaptic(
        () => Haptics.notification({ type: NotificationType.Success }),
        [15, 50, 15]
    ),

    // Warning - notification warning
    warning: () => triggerHaptic(
        () => Haptics.notification({ type: NotificationType.Warning }),
        30
    ),

    // Error - notification error
    error: () => triggerHaptic(
        () => Haptics.notification({ type: NotificationType.Error }),
        [20, 30, 20, 30, 20]
    ),

    // Selection changed - very subtle
    selection: () => triggerHaptic(
        () => Haptics.selectionStart(),
        8
    ),

    // Alarm/Wake - attention-getting pattern (heavy impact repeated)
    alarm: () => triggerHaptic(
        async () => {
            for (let i = 0; i < 5; i++) {
                await Haptics.impact({ style: ImpactStyle.Heavy });
                await new Promise(r => setTimeout(r, 200));
            }
        },
        [100, 100, 100, 100, 100]
    ),

    // Breathing cue - inhale (medium) or exhale (light)
    breatheIn: () => triggerHaptic(
        () => Haptics.impact({ style: ImpactStyle.Medium }),
        100
    ),
    breatheOut: () => triggerHaptic(
        () => Haptics.impact({ style: ImpactStyle.Light }),
        200
    ),

    // Slider tick - selection feedback
    tick: () => triggerHaptic(
        () => Haptics.selectionChanged(),
        5
    ),

    // Modal open/close
    modalOpen: () => triggerHaptic(
        () => Haptics.impact({ style: ImpactStyle.Light }),
        12
    ),
    modalClose: () => triggerHaptic(
        () => Haptics.selectionEnd(),
        8
    ),

    // Dream saved - celebratory pattern (success notification)
    dreamSaved: () => triggerHaptic(
        () => Haptics.notification({ type: NotificationType.Success }),
        [10, 40, 15, 40, 20]
    ),

    // Snooze activated
    snooze: () => triggerHaptic(
        () => Haptics.impact({ style: ImpactStyle.Medium }),
        [50, 100, 50]
    ),

    // Timer/countdown tick (very subtle)
    timerTick: () => triggerHaptic(
        () => Haptics.selectionChanged(),
        3
    ),

    // Long press recognized
    longPress: () => triggerHaptic(
        () => Haptics.impact({ style: ImpactStyle.Heavy }),
        25
    ),

    // Boost started
    boostStart: () => triggerHaptic(
        async () => {
            await Haptics.impact({ style: ImpactStyle.Light });
            await new Promise(r => setTimeout(r, 30));
            await Haptics.impact({ style: ImpactStyle.Medium });
            await new Promise(r => setTimeout(r, 40));
            await Haptics.impact({ style: ImpactStyle.Heavy });
        },
        [20, 30, 40]
    ),

    // Custom pattern - native uses medium impact, web uses custom pattern
    custom: (pattern: number | number[]) => triggerHaptic(
        () => Haptics.impact({ style: ImpactStyle.Medium }),
        pattern
    ),
};

// Check if haptics are available (synchronous check)
export const canUseHaptics = (): boolean => {
    return (isNative || 'vibrate' in navigator) && hapticsEnabled;
};

/**
 * Async capability check - verifies actual hardware support.
 * Call this once on app startup to cache the result.
 */
export const checkHapticSupport = async (): Promise<boolean> => {
    return checkHapticCapability();
};

/**
 * Get detailed haptic support info for debugging/settings UI.
 */
export const getHapticSupportInfo = (): {
    isNative: boolean;
    platform: string;
    webVibrationSupported: boolean;
    enabled: boolean;
    capabilityChecked: boolean;
    hardwareSupported: boolean;
} => ({
    isNative,
    platform: isIOS ? 'ios' : isAndroid ? 'android' : 'web',
    webVibrationSupported: 'vibrate' in navigator,
    enabled: hapticsEnabled,
    capabilityChecked: hapticCapabilityChecked,
    hardwareSupported: hapticCapabilitySupported,
});

/**
 * Reset capability cache (useful for testing or after permission changes).
 */
export const resetHapticCapabilityCache = (): void => {
    hapticCapabilityChecked = false;
    hapticCapabilitySupported = true;
};

export default haptics;
