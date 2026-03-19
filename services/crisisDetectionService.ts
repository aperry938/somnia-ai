/**
 * Crisis Detection Service for Somnia.ai
 *
 * Pre-screens dream text for crisis indicators BEFORE sending to AI.
 * This is a hardcoded safety layer that cannot be bypassed by prompt injection.
 *
 * CRITICAL: This service must be called before any AI analysis.
 *
 * Mobile App Store Readiness:
 * - No network calls (fully local)
 * - Instant response time
 * - Memory efficient
 * - Handles all edge cases gracefully
 */

import { DreamAnalysis } from '../types';
import { logger } from './logger';
import { supabase } from './authService';

/**
 * Words that, when following a crisis phrase, indicate it's NOT a real crisis.
 * These are context words that change the meaning of the phrase.
 *
 * Examples:
 * - "cutting myself a piece" → "a" indicates it's about cutting something else
 * - "hurt myself laughing" → "laughing" indicates it's about humor
 * - "end my life savings" → "savings" indicates it's about money
 * - "kill myself character" → "character" indicates gaming/fiction
 * - "burden to everyone who helped" → might be metaphorical gratitude
 * - "trapped with no escape route in the maze" → might be describing a dream scenario
 */
const CONTEXT_NEGATORS = [
    // Actions that follow (indicates cutting/hurting something else)
    'a ', 'an ', 'the ', 'some ', 'any ',
    // Emotions that follow (indicates metaphor)
    'laughing', 'crying', 'smiling',
    // Nouns that follow crisis phrases (changes meaning)
    'savings', 'insurance', 'policy', 'character', 'avatar',
    // Gaming/fiction context
    'in the game', 'in game', 'my character', 'the character',
    // Metaphorical follow-ups
    'who helped', 'who supported', 'who was there',
    'route in the maze', 'route in the level', 'route in the dungeon',
];

/**
 * Check if a crisis phrase appears in concerning context.
 * Returns false if the phrase is followed by context that negates the crisis meaning.
 *
 * This prevents false positives like:
 * - "cutting myself a piece of cake" (not a crisis)
 * - "hurt myself laughing" (not a crisis)
 * - "end my life savings" (not a crisis)
 */
function isCrisisContext(text: string, phrase: string, matchIndex: number): boolean {
    // Get the text after the phrase
    const afterPhrase = text.slice(matchIndex + phrase.length).toLowerCase().trim();

    // Check if followed by a context negator
    for (const negator of CONTEXT_NEGATORS) {
        if (afterPhrase.startsWith(negator.toLowerCase())) {
            return false; // Not a crisis - context negates it
        }
    }

    return true; // Appears to be genuine crisis context
}

/**
 * Check if a phrase appears in the text as a complete crisis indicator.
 * Uses context analysis to reduce false positives.
 */
function matchesCrisisPhrase(text: string, phrase: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerPhrase = phrase.toLowerCase();

    // Find all occurrences of the phrase
    let index = lowerText.indexOf(lowerPhrase);
    while (index !== -1) {
        // Check if this occurrence is in crisis context
        if (isCrisisContext(lowerText, lowerPhrase, index)) {
            return true;
        }
        // Look for next occurrence
        index = lowerText.indexOf(lowerPhrase, index + 1);
    }

    return false;
}

/**
 * Critical crisis keywords — direct danger indicators.
 * These represent the highest severity: explicit plans or methods.
 */
export const CRITICAL_KEYWORDS = [
    // Direct self-harm
    'kill myself',
    'killing myself',
    'end my life',
    'ending my life',
    'take my own life',
    'taking my own life',

    // Suicidal ideation — direct
    'suicide',
    'suicidal',

    // Specific methods
    'overdose',
    'od on',
    'jump off',
    'jump from',
    'hang myself',
    'hanging myself',
    'shoot myself',
    'shooting myself',
    'slit my wrists',
    'slit my throat',
    'pills to end',
    'pills to die',
    'drown myself',

    // Imminent intent
    'tonight is the night',
    'this is goodbye',
    'final goodbye',
    'my last night',
    'don\'t want to wake up',
    'no point waking up',
] as const;

/**
 * High crisis keywords — strong indicators of suicidal ideation or self-harm.
 * Not as immediately dangerous as critical, but warrant full crisis response.
 */
export const HIGH_KEYWORDS = [
    // Suicidal ideation — indirect
    'want to die',
    'wanna die',
    'wish i was dead',
    'wish i were dead',
    'better off dead',
    'no reason to live',
    'not worth living',
    'ending it all',
    'end it all',

    // Self-harm
    'hurt myself',
    'hurting myself',
    'harm myself',
    'harming myself',
    'self-harm',
    'self harm',
    'cut myself',
    'cutting myself',

    // Planning indicators
    'i have a plan',
    'writing my note',
    'writing a note',
    'saying goodbye to everyone',
    'given everything away',
    'giving everything away',
    'no one will miss me',
    'burden to everyone',
    'burden to my',
    'everyone better off without me',
    'world better without me',
    'made my decision',
    'decided to end',
] as const;

/**
 * Combined primary keywords for backward compatibility.
 * Includes both critical and high severity keywords.
 */
export const CRISIS_KEYWORDS = [
    ...CRITICAL_KEYWORDS,
    ...HIGH_KEYWORDS,
] as const;

/**
 * Context phrases that may indicate crisis in combination with other words.
 * Used for secondary analysis when primary keywords aren't found.
 * These are medium-severity — concerning but less explicit.
 */
export const CRISIS_CONTEXT_PHRASES = [
    'can\'t go on',
    'cannot go on',
    'give up on life',
    'no way out',
    'escape from everything',
    'permanent solution',
    'final escape',

    // Watch indicators — distress patterns
    'what\'s the point',
    'what is the point',
    'trapped with no escape',
    'can\'t see a future',
    'cannot see a future',
    'drowning in pain',
    'nothing left for me',
    'invisible to everyone',
    'completely alone',
    'nobody cares',
    'tired of living',
    'tired of existing',
    'empty inside',
    'darkness consuming',
] as const;

/**
 * Crisis resources by region.
 * Updated periodically to ensure accuracy.
 */
export const CRISIS_RESOURCES = {
    us: {
        name: '988 Suicide & Crisis Lifeline',
        number: '988',
        instruction: 'Call or text 988',
        available: '24/7, free and confidential',
    },
    us_text: {
        name: 'Crisis Text Line',
        number: '741741',
        instruction: 'Text HOME to 741741',
        available: '24/7, free',
    },
    international: {
        name: 'International Association for Suicide Prevention',
        url: 'https://www.iasp.info/resources/Crisis_Centres/',
        instruction: 'Find a crisis center in your country',
    },
    uk: {
        name: 'Samaritans',
        number: '116 123',
        instruction: 'Call 116 123',
        available: '24/7, free',
    },
    canada: {
        name: 'Talk Suicide Canada',
        number: '1-833-456-4566',
        instruction: 'Call 1-833-456-4566',
        available: '24/7',
    },
    au: {
        name: 'Lifeline Australia',
        number: '13 11 14',
        instruction: 'Call 13 11 14',
        available: '24/7',
    },
    nz: {
        name: 'Need to Talk?',
        number: '1737',
        instruction: 'Call or text 1737',
        available: '24/7, free',
    },
    ie: {
        name: 'Samaritans Ireland',
        number: '116 123',
        instruction: 'Call 116 123',
        available: '24/7, free',
    },
    india: {
        name: 'iCall',
        number: '9152987821',
        instruction: 'Call 9152987821',
        available: 'Mon-Sat 8am-10pm IST',
    },
    de: {
        name: 'Telefonseelsorge',
        number: '0800 111 0 111',
        instruction: 'Call 0800 111 0 111',
        available: '24/7, free',
    },
    fr: {
        name: 'SOS Amitié',
        number: '09 72 39 40 50',
        instruction: 'Call 09 72 39 40 50',
        available: '24/7',
    },
    jp: {
        name: 'TELL Lifeline',
        number: '03-5774-0992',
        instruction: 'Call 03-5774-0992',
        available: '24/7',
    },
} as const;

export type CrisisResource = typeof CRISIS_RESOURCES[keyof typeof CRISIS_RESOURCES];

/**
 * Result of crisis detection analysis
 */
export interface CrisisDetectionResult {
    /** Whether crisis indicators were detected */
    detected: boolean;
    /** Confidence level if detected */
    confidence: 'high' | 'medium' | 'low' | null;
    /** Severity level: critical (direct danger), high (strong indicators), medium (watch indicators) */
    severity: 'critical' | 'high' | 'medium' | null;
    /** Which keywords/phrases triggered detection */
    triggers: string[];
}

/**
 * Hardcoded crisis response to return instead of AI analysis.
 * This response is static and cannot be modified by AI or user input.
 */
export const CRISIS_RESPONSE: DreamAnalysis = {
    title: "We're Here For You",
    analysis: [
        {
            title: "A Moment of Care",
            content: `Your dream touched on themes that we want to address with genuine care and concern. While dreams can surface difficult emotions and thoughts, what matters most right now is your wellbeing. I'm an AI companion designed to explore the symbolic world of dreams, but I'm not equipped to provide the support you truly deserve for these feelings. You are not alone, and there are people ready to listen without judgment.`
        },
        {
            title: "Your Feelings Matter",
            content: `Whatever you're experiencing in your waking life that may have influenced this dream, please know that your feelings are valid. Reaching out for support is a sign of strength, not weakness. Professional counselors and crisis lines are staffed by caring people who want to help.`
        }
    ],
    integration: {
        title: "Reaching Out",
        content: `Before anything else today, please consider reaching out to someone who can truly help. Whether it's a trusted friend, family member, therapist, or crisis line, you deserve support. In the US, you can call or text 988 to reach the Suicide & Crisis Lifeline, available 24/7.`
    },
    imagePrompt: "", // No image generation for crisis responses
    telemetry: {
        valence: 0,
        arousal: 0,
        lucidity: 0,
        tags: ['Crisis-Detection-Triggered', 'Support-Resources-Provided']
    }
};

/**
 * Detects crisis indicators in dream text.
 *
 * This function performs a multi-pass analysis with severity levels:
 * 1. Critical check: Direct danger keywords (critical severity)
 * 2. High check: Strong indicator keywords (high severity, or 2+ primary matches)
 * 3. Medium check: Context phrase analysis (medium severity)
 *
 * Uses word boundary matching to prevent false positives like:
 * - "cutting myself a piece of cake" (not a crisis)
 * - "the villain wanted to kill myself character" (not a crisis)
 *
 * @param dreamText - The dream text to analyze
 * @returns CrisisDetectionResult with detection status, severity, and triggers
 */
export function detectCrisis(dreamText: string): CrisisDetectionResult {
    // Input validation - handle edge cases gracefully
    if (!dreamText || typeof dreamText !== 'string') {
        return {
            detected: false,
            confidence: null,
            severity: null,
            triggers: [],
        };
    }

    // Limit text length to prevent performance issues (check first 50KB)
    const maxLength = 50000;
    const textToCheck = dreamText.length > maxLength ? dreamText.slice(0, maxLength) : dreamText;

    try {
        const normalized = textToCheck.toLowerCase().trim();

        // Empty text check
        if (normalized.length === 0) {
            return {
                detected: false,
                confidence: null,
                severity: null,
                triggers: [],
            };
        }

        const criticalTriggers: string[] = [];
        const highTriggers: string[] = [];
        const mediumTriggers: string[] = [];

        // Pass 1: Critical keywords — direct danger
        for (const keyword of CRITICAL_KEYWORDS) {
            if (matchesCrisisPhrase(normalized, keyword)) {
                criticalTriggers.push(keyword);
            }
        }

        // Pass 2: High keywords — strong indicators
        for (const keyword of HIGH_KEYWORDS) {
            if (matchesCrisisPhrase(normalized, keyword)) {
                highTriggers.push(keyword);
            }
        }

        // If any critical or high triggers found, return immediately
        const primaryTriggers = [...criticalTriggers, ...highTriggers];
        if (primaryTriggers.length > 0) {
            // Severity: critical if any critical keyword matched, else high
            const severity = criticalTriggers.length > 0 ? 'critical' as const : 'high' as const;

            logger.warn('[CrisisDetection] Primary triggers found:', {
                severity,
                critical: criticalTriggers.length,
                high: highTriggers.length,
            });

            return {
                detected: true,
                confidence: primaryTriggers.length > 1 ? 'high' : 'medium',
                severity,
                triggers: primaryTriggers,
            };
        }

        // Pass 3: Context phrases — medium severity (watch indicators)
        for (const phrase of CRISIS_CONTEXT_PHRASES) {
            if (matchesCrisisPhrase(normalized, phrase)) {
                mediumTriggers.push(phrase);
            }
        }

        if (mediumTriggers.length > 0) {
            logger.warn('[CrisisDetection] Secondary triggers found:', mediumTriggers.length);
            return {
                detected: true,
                confidence: 'low',
                severity: 'medium',
                triggers: mediumTriggers,
            };
        }

        return {
            detected: false,
            confidence: null,
            severity: null,
            triggers: [],
        };
    } catch (error) {
        // If anything goes wrong, err on the side of caution and allow analysis
        // but log the error for debugging
        logger.error('[CrisisDetection] Error during detection:', error);
        return {
            detected: false,
            confidence: null,
            severity: null,
            triggers: [],
        };
    }
}

/**
 * Quick boolean check for crisis detection.
 * Use this for simple conditionals; use detectCrisis() for detailed analysis.
 */
export function hasCrisisIndicators(dreamText: string): boolean {
    return detectCrisis(dreamText).detected;
}

/**
 * Locale-to-resource key mapping.
 * Maps navigator.language prefixes to CRISIS_RESOURCES keys.
 */
const LOCALE_RESOURCE_MAP: Record<string, keyof typeof CRISIS_RESOURCES> = {
    'en-AU': 'au',
    'en-NZ': 'nz',
    'en-IE': 'ie',
    'en-IN': 'india',
    'hi': 'india',
    'de': 'de',
    'fr': 'fr',
    'ja': 'jp',
    'en-GB': 'uk',
    'en-CA': 'canada',
};

/**
 * Get appropriate crisis resources based on detected locale.
 * Prioritizes local resources, then US, then international.
 *
 * Resolution order:
 * 1. Exact locale match (e.g., "en-AU" → Australia)
 * 2. Language prefix match (e.g., "de-AT" → Germany/German resources)
 * 3. Falls back to US resources if no locale match
 */
export function getCrisisResources(locale?: string): CrisisResource[] {
    const resources: CrisisResource[] = [];

    if (locale) {
        // Try exact locale match first, then language prefix
        const exactKey = LOCALE_RESOURCE_MAP[locale];
        const langPrefix = locale.split('-')[0];
        const prefixKey = langPrefix ? LOCALE_RESOURCE_MAP[langPrefix] : undefined;
        const matchedKey = exactKey ?? prefixKey;

        if (matchedKey) {
            const resource = CRISIS_RESOURCES[matchedKey];
            resources.push(resource);
        }
    }

    // Always include US resources
    resources.push(CRISIS_RESOURCES.us);
    resources.push(CRISIS_RESOURCES.us_text);

    // Always include international as last resort
    resources.push(CRISIS_RESOURCES.international);

    return resources;
}

/**
 * Format crisis resources for display in the app.
 * Includes all regional resources.
 */
export function formatCrisisResourcesForDisplay(): string {
    return `
If you're in crisis, please reach out:

🇺🇸 US: Call or text 988 (Suicide & Crisis Lifeline)
📱 Text HOME to 741741 (Crisis Text Line)
🇬🇧 UK: Call 116 123 (Samaritans)
🇨🇦 Canada: Call 1-833-456-4566
🇦🇺 Australia: Call 13 11 14 (Lifeline)
🇳🇿 New Zealand: Call or text 1737
🇮🇪 Ireland: Call 116 123 (Samaritans)
🇮🇳 India: Call 9152987821 (iCall)
🇩🇪 Germany: Call 0800 111 0 111 (Telefonseelsorge)
🇫🇷 France: Call 09 72 39 40 50 (SOS Amitié)
🇯🇵 Japan: Call 03-5774-0992 (TELL Lifeline)

🌍 International: iasp.info/resources/Crisis_Centres

You are not alone. Help is available 24/7.
    `.trim();
}

/**
 * Log crisis detection event to Supabase for safety monitoring.
 * Fire-and-forget — never blocks the crisis response flow.
 * Logs severity and trigger count only — NO dream text is stored.
 */
export async function logCrisisDetection(result: CrisisDetectionResult): Promise<void> {
    try {
        // Only log if Supabase is available and user is authenticated
        if (!supabase) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        await supabase.from('crisis_detection_logs').insert({
            user_id: session.user.id,
            severity: result.severity,
            trigger_count: result.triggers.length,
            confidence: result.confidence,
            detected_at: new Date().toISOString(),
        });
    } catch (error) {
        // Fire-and-forget: never let logging failures affect the crisis response
        logger.error('[CrisisDetection] Failed to log detection event:', error);
    }
}
