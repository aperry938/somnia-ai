// services/hapticsService.ts
// Centralized haptic feedback service for gentle, appropriate tactile responses

type HapticPattern = number | number[];

// Check if haptics are supported
const isHapticsSupported = (): boolean => {
    return 'vibrate' in navigator;
};

// Core vibration function with safety check
const vibrate = (pattern: HapticPattern): boolean => {
    if (!isHapticsSupported()) return false;
    try {
        return navigator.vibrate(pattern);
    } catch {
        return false;
    }
};

/**
 * Haptic feedback patterns - designed to be gentle and appropriate
 * All durations are in milliseconds
 */
export const haptics = {
    // Light tap - for button presses, selections
    light: () => vibrate(10),

    // Medium tap - for confirmations, toggles
    medium: () => vibrate(20),

    // Success - gentle double tap
    success: () => vibrate([15, 50, 15]),

    // Warning - slightly longer single pulse
    warning: () => vibrate(30),

    // Error - quick triple pulse
    error: () => vibrate([20, 30, 20, 30, 20]),

    // Selection changed - very subtle
    selection: () => vibrate(8),

    // Alarm/Wake - attention-getting pattern
    alarm: () => vibrate([100, 100, 100, 100, 100]),

    // Breathing cue - inhale (short) or exhale (longer)
    breatheIn: () => vibrate(100),
    breatheOut: () => vibrate(200),

    // Slider tick - very light for feedback during drag
    tick: () => vibrate(5),

    // Modal open/close
    modalOpen: () => vibrate(12),
    modalClose: () => vibrate(8),

    // Dream saved - celebratory pattern
    dreamSaved: () => vibrate([10, 40, 15, 40, 20]),

    // Snooze activated
    snooze: () => vibrate([50, 100, 50]),

    // Timer/countdown tick (very subtle)
    timerTick: () => vibrate(3),

    // Long press recognized
    longPress: () => vibrate(25),

    // Boost started
    boostStart: () => vibrate([20, 30, 40]),

    // Custom pattern
    custom: (pattern: HapticPattern) => vibrate(pattern),
};

// Check if haptics are available
export const canUseHaptics = isHapticsSupported;

export default haptics;
