/**
 * Audio Session Service
 *
 * Manages iOS AVAudioSession and Android Audio Focus for proper background audio playback.
 * Ensures sleep sounds and alarms continue playing when:
 * - Screen locks
 * - App goes to background
 * - Phone call interrupts and then ends
 *
 * Platform-specific handling:
 * - iOS: AVAudioSession configuration via native plugin
 * - Android: Audio focus management + foreground service for background playback
 *
 * MOBILE APP STORE COMPLIANCE:
 * - Proper audio session lifecycle management
 * - Respectful audio focus handling (duck/pause other apps appropriately)
 * - Battery-efficient background audio configuration
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { logger } from './logger';

const isNative = Capacitor.isNativePlatform();
const isIOS = Capacitor.getPlatform() === 'ios';
const isAndroid = Capacitor.getPlatform() === 'android';

/**
 * Audio Session Plugin Interface (iOS only)
 */
interface AudioSessionPlugin {
    /**
     * Configure the audio session for background playback
     */
    configure(options?: {
        mixWithOthers?: boolean;
        duckOthers?: boolean;
    }): Promise<{ configured: boolean; category: string; isActive: boolean }>;

    /**
     * Set audio session active/inactive
     */
    setActive(options: { active: boolean }): Promise<{ active: boolean; warning?: string }>;

    /**
     * Get current audio session status
     */
    getStatus(): Promise<{
        isConfigured: boolean;
        category: string;
        mode: string;
        isOtherAudioPlaying: boolean;
        outputVolume: number;
        sampleRate: number;
        outputLatency: number;
    }>;

    /**
     * Add listener for audio session events
     */
    addListener(
        eventName: 'interruptionBegan' | 'interruptionEnded' | 'routeChange',
        listenerFunc: (data: Record<string, unknown>) => void
    ): Promise<{ remove: () => void }>;
}

// Register the plugin (only available on iOS)
const AudioSession = isIOS
    ? registerPlugin<AudioSessionPlugin>('AudioSession')
    : null;

/**
 * Android Audio Focus Plugin Interface
 * Manages audio focus for proper background playback and interruption handling
 */
interface AndroidAudioFocusPlugin {
    /**
     * Request audio focus for playback
     */
    requestFocus(options?: {
        duckOthers?: boolean;  // Lower other apps' volume instead of pausing them
        usage?: 'media' | 'alarm' | 'notification';  // Audio usage type
    }): Promise<{ granted: boolean; focusType: string }>;

    /**
     * Abandon audio focus when done playing
     */
    abandonFocus(): Promise<{ success: boolean }>;

    /**
     * Add listener for audio focus events
     */
    addListener(
        eventName: 'focusLost' | 'focusGained' | 'focusDucked',
        listenerFunc: (data: Record<string, unknown>) => void
    ): Promise<{ remove: () => void }>;
}

// Register Android audio focus plugin
const AndroidAudioFocus = isAndroid
    ? registerPlugin<AndroidAudioFocusPlugin>('AndroidAudioFocus')
    : null;

// Track Android audio focus state
let hasAndroidAudioFocus = false;
let androidFocusListeners: Array<{ remove: () => void }> = [];
let onAndroidFocusLostCallback: (() => void) | null = null;
let onAndroidFocusGainedCallback: (() => void) | null = null;

// Track if we've configured the session
let isSessionConfigured = false;

// Callbacks for interruption events
let onInterruptionBeganCallback: (() => void) | null = null;
let onInterruptionEndedCallback: ((shouldResume: boolean) => void) | null = null;

/**
 * Configure the audio session for background playback
 * Call this BEFORE starting any audio that should continue in background
 *
 * @param options.mixWithOthers - Allow mixing with other apps' audio (default: true)
 * @param options.duckOthers - Lower other apps' volume when playing (default: true)
 */
export async function configureAudioSession(options?: {
    mixWithOthers?: boolean;
    duckOthers?: boolean;
}): Promise<boolean> {
    if (!isIOS || !AudioSession) {
        // Android handles this via foreground service
        return true;
    }

    try {
        const result = await AudioSession.configure({
            mixWithOthers: options?.mixWithOthers ?? true,
            duckOthers: options?.duckOthers ?? true,
        });

        isSessionConfigured = result.configured;
        logger.log('[AudioSession] Configured for background playback:', result);
        return result.configured;
    } catch (error) {
        logger.error('[AudioSession] Configuration failed:', error);
        return false;
    }
}

/**
 * Activate/deactivate the audio session
 * Deactivate when stopping audio to be a good citizen (let other apps resume)
 */
export async function setAudioSessionActive(active: boolean): Promise<boolean> {
    if (!isIOS || !AudioSession) {
        return true;
    }

    try {
        const result = await AudioSession.setActive({ active });
        if (result.warning) {
            logger.warn('[AudioSession]', result.warning);
        }
        return true;
    } catch (error) {
        logger.error('[AudioSession] setActive failed:', error);
        return false;
    }
}

/**
 * Get current audio session status (for debugging)
 */
export async function getAudioSessionStatus(): Promise<{
    isConfigured: boolean;
    category?: string;
    isOtherAudioPlaying?: boolean;
    outputVolume?: number;
} | null> {
    if (!isIOS || !AudioSession) {
        return { isConfigured: true }; // Android always "configured" via service
    }

    try {
        const status = await AudioSession.getStatus();
        return {
            isConfigured: status.isConfigured,
            category: status.category,
            isOtherAudioPlaying: status.isOtherAudioPlaying,
            outputVolume: status.outputVolume,
        };
    } catch (error) {
        logger.error('[AudioSession] getStatus failed:', error);
        return null;
    }
}

/**
 * Set up listeners for audio interruptions (phone calls, Siri, etc.)
 *
 * @param onBegan - Called when audio is interrupted (pause your audio)
 * @param onEnded - Called when interruption ends (resume if shouldResume is true)
 */
export async function setupInterruptionHandling(
    onBegan: () => void,
    onEnded: (shouldResume: boolean) => void
): Promise<() => void> {
    if (!isIOS || !AudioSession) {
        return () => {}; // No-op cleanup on non-iOS
    }

    onInterruptionBeganCallback = onBegan;
    onInterruptionEndedCallback = onEnded;

    const listeners: Array<{ remove: () => void }> = [];

    try {
        // Listen for interruption began
        const beganListener = await AudioSession.addListener('interruptionBegan', () => {
            logger.log('[AudioSession] Interruption began (phone call, Siri, etc.)');
            onInterruptionBeganCallback?.();
        });
        listeners.push(beganListener);

        // Listen for interruption ended
        const endedListener = await AudioSession.addListener('interruptionEnded', (data) => {
            const shouldResume = data.shouldResume as boolean;
            logger.log('[AudioSession] Interruption ended, shouldResume:', shouldResume);
            onInterruptionEndedCallback?.(shouldResume);
        });
        listeners.push(endedListener);

        // Listen for route changes (headphones unplugged, etc.)
        const routeListener = await AudioSession.addListener('routeChange', (data) => {
            logger.log('[AudioSession] Route changed:', data.reason);
            // Could pause audio here if headphones were unplugged
            if (data.reason === 'oldDeviceUnavailable') {
                // Headphones unplugged - some apps pause here
                // For sleep sounds, we probably want to continue
            }
        });
        listeners.push(routeListener);

    } catch (error) {
        logger.error('[AudioSession] Failed to setup interruption handling:', error);
    }

    // Return cleanup function
    return () => {
        listeners.forEach(l => l.remove());
        onInterruptionBeganCallback = null;
        onInterruptionEndedCallback = null;
    };
}

/**
 * Check if platform requires audio session configuration
 */
export function requiresAudioSessionConfig(): boolean {
    return isIOS && isNative;
}

/**
 * Check if audio session is currently configured
 */
export function isAudioSessionConfigured(): boolean {
    if (!isIOS) return true;
    return isSessionConfigured;
}

// ============================================================
// ANDROID AUDIO FOCUS MANAGEMENT
// ============================================================

/**
 * Request audio focus on Android for background playback.
 * Call this BEFORE starting audio that should continue in background.
 *
 * @param options.duckOthers - Lower other apps' volume instead of pausing (default: true)
 * @param options.usage - Audio usage type: 'media' for sleep sounds, 'alarm' for alarms
 */
export async function requestAndroidAudioFocus(options?: {
    duckOthers?: boolean;
    usage?: 'media' | 'alarm';
}): Promise<boolean> {
    if (!isAndroid || !AndroidAudioFocus) {
        // Not Android, or plugin not available
        return true;
    }

    try {
        const result = await AndroidAudioFocus.requestFocus({
            duckOthers: options?.duckOthers ?? true,
            usage: options?.usage ?? 'media',
        });

        hasAndroidAudioFocus = result.granted;
        logger.log('[AudioSession] Android audio focus requested:', result);
        return result.granted;
    } catch (error) {
        logger.error('[AudioSession] Android audio focus request failed:', error);
        // Return true to allow playback attempt - focus may still work
        return true;
    }
}

/**
 * Abandon audio focus on Android when done playing.
 * This allows other apps to resume their audio.
 */
export async function abandonAndroidAudioFocus(): Promise<boolean> {
    if (!isAndroid || !AndroidAudioFocus) {
        return true;
    }

    try {
        const result = await AndroidAudioFocus.abandonFocus();
        hasAndroidAudioFocus = false;
        logger.log('[AudioSession] Android audio focus abandoned:', result);
        return result.success;
    } catch (error) {
        logger.error('[AudioSession] Android abandon focus failed:', error);
        hasAndroidAudioFocus = false;
        return false;
    }
}

/**
 * Set up listeners for Android audio focus events (phone calls, other apps)
 *
 * @param onFocusLost - Called when focus is lost (pause your audio)
 * @param onFocusGained - Called when focus is regained (resume audio)
 */
export async function setupAndroidFocusHandling(
    onFocusLost: () => void,
    onFocusGained: () => void
): Promise<() => void> {
    if (!isAndroid || !AndroidAudioFocus) {
        return () => {}; // No-op cleanup on non-Android
    }

    onAndroidFocusLostCallback = onFocusLost;
    onAndroidFocusGainedCallback = onFocusGained;

    try {
        // Listen for focus lost (phone call, other app takes focus)
        const lostListener = await AndroidAudioFocus.addListener('focusLost', () => {
            logger.log('[AudioSession] Android focus lost (phone call, other app)');
            hasAndroidAudioFocus = false;
            onAndroidFocusLostCallback?.();
        });
        androidFocusListeners.push(lostListener);

        // Listen for focus regained
        const gainedListener = await AndroidAudioFocus.addListener('focusGained', () => {
            logger.log('[AudioSession] Android focus regained');
            hasAndroidAudioFocus = true;
            onAndroidFocusGainedCallback?.();
        });
        androidFocusListeners.push(gainedListener);

        // Listen for focus ducked (temporary volume reduction)
        const duckedListener = await AndroidAudioFocus.addListener('focusDucked', () => {
            logger.log('[AudioSession] Android focus ducked (volume lowered temporarily)');
            // Usually don't need to take action - system handles volume ducking
        });
        androidFocusListeners.push(duckedListener);

    } catch (error) {
        logger.error('[AudioSession] Failed to setup Android focus handling:', error);
    }

    // Return cleanup function
    return () => {
        androidFocusListeners.forEach(l => l.remove());
        androidFocusListeners = [];
        onAndroidFocusLostCallback = null;
        onAndroidFocusGainedCallback = null;
    };
}

/**
 * Check if we currently have Android audio focus
 */
export function hasAudioFocus(): boolean {
    if (isIOS) return isSessionConfigured;
    if (isAndroid) return hasAndroidAudioFocus;
    return true; // Web always has "focus"
}

// ============================================================
// UNIFIED PLATFORM API
// ============================================================

/**
 * Configure audio session for background playback (unified iOS/Android API).
 * Handles platform differences internally.
 */
export async function configureForBackgroundAudio(options?: {
    mixWithOthers?: boolean;
    duckOthers?: boolean;
    isAlarm?: boolean;
}): Promise<boolean> {
    if (isIOS) {
        return configureAudioSession({
            mixWithOthers: options?.mixWithOthers,
            duckOthers: options?.duckOthers,
        });
    } else if (isAndroid) {
        return requestAndroidAudioFocus({
            duckOthers: options?.duckOthers,
            usage: options?.isAlarm ? 'alarm' : 'media',
        });
    }
    return true; // Web - always succeeds
}

/**
 * Deactivate audio session when done playing (unified API).
 * Releases audio focus and allows other apps to resume.
 */
export async function deactivateAudioSession(): Promise<boolean> {
    if (isIOS) {
        return setAudioSessionActive(false);
    } else if (isAndroid) {
        return abandonAndroidAudioFocus();
    }
    return true;
}

/**
 * Setup interruption handling for both platforms (unified API).
 * Handles phone calls, Siri (iOS), Google Assistant (Android), other apps, etc.
 */
export async function setupUnifiedInterruptionHandling(
    onInterruptionBegan: () => void,
    onInterruptionEnded: (shouldResume: boolean) => void
): Promise<() => void> {
    const cleanupFunctions: Array<() => void> = [];

    if (isIOS) {
        const iosCleanup = await setupInterruptionHandling(onInterruptionBegan, onInterruptionEnded);
        cleanupFunctions.push(iosCleanup);
    }

    if (isAndroid) {
        const androidCleanup = await setupAndroidFocusHandling(
            onInterruptionBegan,
            () => onInterruptionEnded(true) // Android always allows resume
        );
        cleanupFunctions.push(androidCleanup);
    }

    // Return combined cleanup function
    return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
    };
}
