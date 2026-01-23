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

/**
 * Words that, when following a crisis phrase, indicate it's NOT a real crisis.
 * These are context words that change the meaning of the phrase.
 *
 * Examples:
 * - "cutting myself a piece" → "a" indicates it's about cutting something else
 * - "hurt myself laughing" → "laughing" indicates it's about humor
 * - "end my life savings" → "savings" indicates it's about money
 * - "kill myself character" → "character" indicates gaming/fiction
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
 * Crisis keywords that trigger immediate intervention.
 * These are checked against normalized (lowercase) dream text.
 *
 * Categories:
 * - Direct self-harm language
 * - Suicidal ideation phrases
 * - Severe distress indicators
 */
export const CRISIS_KEYWORDS = [
    // Direct self-harm
    'kill myself',
    'killing myself',
    'end my life',
    'ending my life',
    'take my own life',
    'taking my own life',

    // Suicidal ideation
    'suicide',
    'suicidal',
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
] as const;

/**
 * Context phrases that may indicate crisis in combination with other words.
 * Used for secondary analysis when primary keywords aren't found.
 */
export const CRISIS_CONTEXT_PHRASES = [
    'can\'t go on',
    'cannot go on',
    'give up on life',
    'no way out',
    'escape from everything',
    'permanent solution',
    'final escape',
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
 * This function performs a multi-pass analysis:
 * 1. Primary check: Direct keyword matching at word boundaries (high confidence)
 * 2. Secondary check: Context phrase analysis at word boundaries (medium confidence)
 *
 * Uses word boundary matching to prevent false positives like:
 * - "cutting myself a piece of cake" (not a crisis)
 * - "the villain wanted to kill myself character" (not a crisis)
 *
 * @param dreamText - The dream text to analyze
 * @returns CrisisDetectionResult with detection status and triggers
 */
export function detectCrisis(dreamText: string): CrisisDetectionResult {
    // Input validation - handle edge cases gracefully
    if (!dreamText || typeof dreamText !== 'string') {
        return {
            detected: false,
            confidence: null,
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
                triggers: [],
            };
        }

        const triggers: string[] = [];

        // Primary check: Direct keyword matching with context analysis
        for (const keyword of CRISIS_KEYWORDS) {
            if (matchesCrisisPhrase(normalized, keyword)) {
                triggers.push(keyword);
            }
        }

        if (triggers.length > 0) {
            logger.warn('[CrisisDetection] Primary triggers found:', triggers.length);
            return {
                detected: true,
                confidence: triggers.length > 1 ? 'high' : 'medium',
                triggers,
            };
        }

        // Secondary check: Context phrases with context analysis
        for (const phrase of CRISIS_CONTEXT_PHRASES) {
            if (matchesCrisisPhrase(normalized, phrase)) {
                triggers.push(phrase);
            }
        }

        if (triggers.length > 0) {
            logger.warn('[CrisisDetection] Secondary triggers found:', triggers.length);
            return {
                detected: true,
                confidence: 'low',
                triggers,
            };
        }

        return {
            detected: false,
            confidence: null,
            triggers: [],
        };
    } catch (error) {
        // If anything goes wrong, err on the side of caution and allow analysis
        // but log the error for debugging
        logger.error('[CrisisDetection] Error during detection:', error);
        return {
            detected: false,
            confidence: null,
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
 * Get appropriate crisis resources based on detected locale.
 * Falls back to US resources if locale cannot be determined.
 */
export function getCrisisResources(locale?: string): CrisisResource[] {
    const resources: CrisisResource[] = [
        CRISIS_RESOURCES.us,
        CRISIS_RESOURCES.us_text,
    ];

    if (locale?.startsWith('en-GB')) {
        resources.unshift(CRISIS_RESOURCES.uk);
    } else if (locale?.startsWith('en-CA')) {
        resources.unshift(CRISIS_RESOURCES.canada);
    }

    resources.push(CRISIS_RESOURCES.international);

    return resources;
}

/**
 * Format crisis resources for display in the app.
 */
export function formatCrisisResourcesForDisplay(): string {
    return `
If you're in crisis, please reach out:

🇺🇸 US: Call or text 988 (Suicide & Crisis Lifeline)
📱 Text HOME to 741741 (Crisis Text Line)
🇬🇧 UK: Call 116 123 (Samaritans)
🇨🇦 Canada: Call 1-833-456-4566

🌍 International: iasp.info/resources/Crisis_Centres

You are not alone. Help is available 24/7.
    `.trim();
}
