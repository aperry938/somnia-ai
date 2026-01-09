/**
 * AI-Powered Voice Intent Service
 * Uses Gemini to parse natural language voice commands into structured intents
 */

import { GoogleGenAI } from "@google/genai";
import { isPremium } from './secureSubscriptionService';
import { logger } from './logger';

// Lazy AI instance
let aiInstance: GoogleGenAI | null = null;

const getAi = (): GoogleGenAI => {
    if (aiInstance) return aiInstance;
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) throw new Error("API_KEY not set");
    aiInstance = new GoogleGenAI({ apiKey: API_KEY });
    return aiInstance;
};

// Supported voice command intents
export type VoiceIntent =
    | { type: 'SET_ALARM'; time?: string; days?: string[] }
    | { type: 'NAVIGATE'; page: 'sleep' | 'alarms' | 'chronicle' | 'insights' }
    | { type: 'PLAY_SOUND'; soundId: string }
    | { type: 'STOP_SOUND' }
    | { type: 'LOG_DREAM' }
    | { type: 'START_SLEEP_SESSION' }
    | { type: 'UNKNOWN'; rawText: string };

const INTENT_PROMPT = `You are a voice command parser for a sleep and dream journal app called Somnia. 
Parse the user's spoken command into a structured JSON intent.

VALID INTENTS:
1. SET_ALARM - User wants to set an alarm
   Format: {"type":"SET_ALARM","time":"HH:MM","days":["monday","tuesday"...] or null for once}
   Examples: "set alarm for 7am" → {"type":"SET_ALARM","time":"07:00"}
             "wake me up at 6:30 every weekday" → {"type":"SET_ALARM","time":"06:30","days":["monday","tuesday","wednesday","thursday","friday"]}

2. NAVIGATE - User wants to go to a page
   Format: {"type":"NAVIGATE","page":"sleep|alarms|chronicle|insights"}
   Examples: "go to sleep page" → {"type":"NAVIGATE","page":"sleep"}
             "show my insights" → {"type":"NAVIGATE","page":"insights"}

3. PLAY_SOUND - User wants to play a soundscape
   Format: {"type":"PLAY_SOUND","soundId":"gentle_rain|ocean_waves|fireplace|white_noise|pink_noise|brown_noise"}
   Examples: "play rain sounds" → {"type":"PLAY_SOUND","soundId":"gentle_rain"}
             "start ocean waves" → {"type":"PLAY_SOUND","soundId":"ocean_waves"}

4. STOP_SOUND - User wants to stop playing sounds
   Format: {"type":"STOP_SOUND"}
   Examples: "stop sounds", "turn off music", "silence"

5. LOG_DREAM - User wants to log a dream
   Format: {"type":"LOG_DREAM"}
   Examples: "log a dream", "record my dream", "new dream entry"

6. START_SLEEP_SESSION - User wants to start sleep tracking/wind down
   Format: {"type":"START_SLEEP_SESSION"}
   Examples: "start sleep session", "goodnight", "begin sleep mode", "wind down"

7. UNKNOWN - Cannot determine intent
   Format: {"type":"UNKNOWN","rawText":"original command"}

USER COMMAND: "{command}"

Respond with ONLY the JSON object, no explanation.`;

/**
 * SECURITY FIX: Sanitize voice transcript to prevent prompt injection
 * Removes characters that could be used to escape the prompt context
 */
function sanitizeTranscript(transcript: string): string {
    return transcript
        // Remove JSON-like characters that could inject structure
        .replace(/[{}[\]"'`]/g, '')
        // Remove potential escape sequences
        .replace(/\\/g, '')
        // Limit length to prevent overflow attacks
        .slice(0, 200)
        .trim();
}

/**
 * SECURITY FIX: Validate parsed intent matches expected schema
 */
function validateIntent(parsed: unknown): VoiceIntent {
    if (!parsed || typeof parsed !== 'object') {
        return { type: 'UNKNOWN', rawText: 'Invalid response' };
    }

    const obj = parsed as Record<string, unknown>;
    const validTypes = ['SET_ALARM', 'NAVIGATE', 'PLAY_SOUND', 'STOP_SOUND', 'LOG_DREAM', 'START_SLEEP_SESSION', 'UNKNOWN'];

    if (!validTypes.includes(obj.type as string)) {
        return { type: 'UNKNOWN', rawText: 'Invalid intent type' };
    }

    // Validate specific intent types
    if (obj.type === 'NAVIGATE') {
        const validPages = ['sleep', 'alarms', 'chronicle', 'insights'];
        if (!validPages.includes(obj.page as string)) {
            return { type: 'UNKNOWN', rawText: 'Invalid page' };
        }
    }

    if (obj.type === 'PLAY_SOUND') {
        const validSounds = ['gentle_rain', 'ocean_waves', 'fireplace', 'white_noise', 'pink_noise', 'brown_noise'];
        if (!validSounds.includes(obj.soundId as string)) {
            return { type: 'UNKNOWN', rawText: 'Invalid sound' };
        }
    }

    return parsed as VoiceIntent;
}

/**
 * Parse voice command using Gemini AI
 */
export async function parseVoiceIntent(transcript: string): Promise<VoiceIntent> {
    // Check premium status
    if (!isPremium()) {
        // Fall back to basic pattern matching for free users
        return parseBasicIntent(transcript);
    }

    try {
        const ai = getAi();
        // SECURITY FIX: Sanitize transcript before injecting into prompt
        const sanitizedTranscript = sanitizeTranscript(transcript);
        const prompt = INTENT_PROMPT.replace('{command}', sanitizedTranscript);

        const result = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ parts: [{ text: prompt }] }],
        });
        const response = (result.text ?? '').trim();

        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                // SECURITY FIX: Validate parsed intent against schema
                return validateIntent(parsed);
            } catch {
                return { type: 'UNKNOWN', rawText: transcript };
            }
        }

        return { type: 'UNKNOWN', rawText: transcript };
    } catch (error) {
        logger.error('AI intent parsing failed:', error);
        // Fall back to basic parsing
        return parseBasicIntent(transcript);
    }
}

/**
 * Basic pattern matching for free users (no AI)
 */
function parseBasicIntent(transcript: string): VoiceIntent {
    const text = transcript.toLowerCase().trim();

    // Log dream
    if (text.includes('log dream') || text.includes('record dream') || text.includes('new dream')) {
        return { type: 'LOG_DREAM' };
    }

    // Set alarm (basic)
    if (text.includes('set alarm') || text.includes('wake me')) {
        // Try to extract time
        const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (timeMatch && timeMatch[1]) {
            let hour = parseInt(timeMatch[1], 10);
            const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            const period = timeMatch[3]?.toLowerCase();

            if (period === 'pm' && hour < 12) hour += 12;
            if (period === 'am' && hour === 12) hour = 0;

            return {
                type: 'SET_ALARM',
                time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
            };
        }
        return { type: 'SET_ALARM' };
    }

    // Play sounds
    if (text.includes('play') || text.includes('start')) {
        if (text.includes('rain')) return { type: 'PLAY_SOUND', soundId: 'gentle_rain' };
        if (text.includes('ocean')) return { type: 'PLAY_SOUND', soundId: 'ocean_waves' };
        if (text.includes('fire')) return { type: 'PLAY_SOUND', soundId: 'fireplace' };
        if (text.includes('white noise')) return { type: 'PLAY_SOUND', soundId: 'white_noise' };
        if (text.includes('pink noise')) return { type: 'PLAY_SOUND', soundId: 'pink_noise' };
        if (text.includes('brown noise')) return { type: 'PLAY_SOUND', soundId: 'brown_noise' };
    }

    // Stop sounds
    if (text.includes('stop') || text.includes('silence') || text.includes('quiet')) {
        return { type: 'STOP_SOUND' };
    }

    // Navigation
    if (text.includes('sleep') && (text.includes('go') || text.includes('show') || text.includes('open'))) {
        return { type: 'NAVIGATE', page: 'sleep' };
    }
    if (text.includes('alarm') && (text.includes('go') || text.includes('show') || text.includes('open'))) {
        return { type: 'NAVIGATE', page: 'alarms' };
    }
    if (text.includes('insight') || text.includes('analytics')) {
        return { type: 'NAVIGATE', page: 'insights' };
    }
    if (text.includes('chronicle') || text.includes('journal') || text.includes('history')) {
        return { type: 'NAVIGATE', page: 'chronicle' };
    }

    // Sleep session
    if (text.includes('goodnight') || text.includes('sleep session') || text.includes('wind down')) {
        return { type: 'START_SLEEP_SESSION' };
    }

    return { type: 'UNKNOWN', rawText: transcript };
}
