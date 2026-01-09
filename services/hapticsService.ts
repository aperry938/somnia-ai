// services/hapticsService.ts
// Centralized haptic feedback service using Capacitor Haptics for native mobile
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

// Core haptic function - native on mobile, web fallback in browser
const triggerHaptic = async (
    nativeAction: () => Promise<void>,
    webPattern?: number | number[]
): Promise<void> => {
    if (isNative) {
        try {
            await nativeAction();
        } catch {
            // Haptics may not be available on all devices
        }
    } else if (webPattern && 'vibrate' in navigator) {
        try {
            navigator.vibrate(webPattern);
        } catch {
            // Web vibration not available
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

// Check if haptics are available
export const canUseHaptics = (): boolean => {
    return isNative || 'vibrate' in navigator;
};

export default haptics;
