/**
 * AI Voice Text-to-Speech Service for Somnia.ai
 *
 * Uses Google Cloud TTS via Edge Function for natural-sounding AI voices.
 * Premium feature only - provides soothing voices optimized for sleep apps.
 */

import { isPremium } from './secureSubscriptionService';
import { getAuthToken } from './authService';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

// Voice options available to premium users
export type VoiceType = 'soothing' | 'calm' | 'gentle' | 'warm';

export const VOICE_OPTIONS: Record<VoiceType, { label: string; description: string }> = {
    soothing: { label: 'Luna', description: 'Warm, calming female voice' },
    calm: { label: 'Atlas', description: 'Calm, reassuring male voice' },
    gentle: { label: 'Nova', description: 'Gentle, soft female voice' },
    warm: { label: 'Orion', description: 'Warm, deep male voice' },
};

// Storage keys
const VOICE_PREF_KEY = 'somnia_voice_preference';
const VOICE_USAGE_KEY = 'somnia_voice_usage';

// Rate limiting - daily cap to control costs
const DAILY_VOICE_LIMIT = 50; // Max voice messages per day

// Current audio element for playback control
let currentAudio: HTMLAudioElement | null = null;
let isSpeaking = false;

/**
 * Voice usage tracking for rate limiting
 */
interface VoiceUsage {
    date: string; // YYYY-MM-DD
    count: number;
}

function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

function getVoiceUsage(): VoiceUsage {
    const stored = localStorage.getItem(VOICE_USAGE_KEY);
    if (stored) {
        const usage = JSON.parse(stored) as VoiceUsage;
        // Reset if it's a new day
        if (usage.date !== getTodayString()) {
            return { date: getTodayString(), count: 0 };
        }
        return usage;
    }
    return { date: getTodayString(), count: 0 };
}

function incrementVoiceUsage(): void {
    const usage = getVoiceUsage();
    usage.count += 1;
    localStorage.setItem(VOICE_USAGE_KEY, JSON.stringify(usage));
}

/**
 * Check remaining voice messages for today
 */
export function getRemainingVoiceMessages(): number {
    const usage = getVoiceUsage();
    return Math.max(0, DAILY_VOICE_LIMIT - usage.count);
}

/**
 * Check if user has reached daily voice limit
 */
export function isVoiceRateLimited(): boolean {
    return getRemainingVoiceMessages() <= 0;
}

/**
 * Get user's preferred voice
 */
export function getVoicePreference(): VoiceType {
    const saved = localStorage.getItem(VOICE_PREF_KEY);
    if (saved && saved in VOICE_OPTIONS) {
        return saved as VoiceType;
    }
    return 'soothing'; // Default
}

/**
 * Set user's preferred voice
 */
export function setVoicePreference(voice: VoiceType): void {
    localStorage.setItem(VOICE_PREF_KEY, voice);
}

/**
 * Check if AI voice is available (premium + configured)
 */
export function isVoiceAvailable(): boolean {
    return isPremium() && !!SUPABASE_URL;
}

/**
 * Check if currently speaking
 */
export function getIsSpeaking(): boolean {
    return isSpeaking;
}

/**
 * Speak text using AI voice (premium only)
 * Returns a promise that resolves when speech completes
 */
export async function speakText(text: string, voice?: VoiceType): Promise<void> {
    // Only available for premium users
    if (!isPremium()) {
        console.warn('AI voice requires premium subscription');
        return;
    }

    if (!SUPABASE_URL) {
        console.warn('Supabase not configured for AI voice');
        return;
    }

    // Check rate limit
    if (isVoiceRateLimited()) {
        console.warn('Daily voice limit reached');
        window.dispatchEvent(new CustomEvent('voiceRateLimited'));
        return;
    }

    // Stop any current speech
    stopSpeaking();

    try {
        const authToken = await getAuthToken();
        if (!authToken) {
            console.warn('Not authenticated for AI voice');
            return;
        }

        const selectedVoice = voice || getVoicePreference();

        // Call the Edge Function
        const response = await fetch(`${SUPABASE_URL}/functions/v1/text-to-speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                text,
                voice: selectedVoice,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('TTS error:', error);
            return;
        }

        const data = await response.json();

        // Create audio from base64
        const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);

        // Play the audio
        currentAudio = new Audio(audioUrl);
        isSpeaking = true;

        // Increment usage counter
        incrementVoiceUsage();

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('voiceStateChanged', { detail: { isSpeaking: true } }));

        return new Promise((resolve) => {
            if (!currentAudio) {
                resolve();
                return;
            }

            currentAudio.onended = () => {
                isSpeaking = false;
                URL.revokeObjectURL(audioUrl);
                window.dispatchEvent(new CustomEvent('voiceStateChanged', { detail: { isSpeaking: false } }));
                resolve();
            };

            currentAudio.onerror = () => {
                isSpeaking = false;
                URL.revokeObjectURL(audioUrl);
                window.dispatchEvent(new CustomEvent('voiceStateChanged', { detail: { isSpeaking: false } }));
                resolve();
            };

            currentAudio.play().catch((err) => {
                console.error('Audio playback error:', err);
                isSpeaking = false;
                window.dispatchEvent(new CustomEvent('voiceStateChanged', { detail: { isSpeaking: false } }));
                resolve();
            });
        });
    } catch (error) {
        console.error('TTS error:', error);
        isSpeaking = false;
        window.dispatchEvent(new CustomEvent('voiceStateChanged', { detail: { isSpeaking: false } }));
    }
}

/**
 * Stop current speech
 */
export function stopSpeaking(): void {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    isSpeaking = false;
    window.dispatchEvent(new CustomEvent('voiceStateChanged', { detail: { isSpeaking: false } }));
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

/**
 * Get briefing content for voice greeting
 */
export function getBriefingContent(userName: string = "Dreamer"): string {
    const hours = new Date().getHours();
    const greeting = hours < 12 ? "Good morning" : "Hello";
    return `${greeting}, ${userName}. I hope you slept well. Remember to log your dreams to keep your streak alive.`;
}
