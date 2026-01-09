/**
 * Audio Session Service
 *
 * Manages iOS AVAudioSession for proper background audio playback.
 * Ensures sleep sounds and alarms continue playing when:
 * - Screen locks
 * - App goes to background
 * - Phone call interrupts and then ends
 *
 * On Android, background audio is handled by the foreground service.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { logger } from './logger';

const isNative = Capacitor.isNativePlatform();
const isIOS = Capacitor.getPlatform() === 'ios';

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
