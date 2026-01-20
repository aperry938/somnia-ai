import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { ChatMessage, Dream, DreamAnalysis, DreamSynthesis, SleepHabitAnalysis, SleepAids, Biometrics, AnalysisPersonality, SimilarDream } from '../types';
import { canUseAiAnalysis, consumeAiCredit } from './secureSubscriptionService';
import { checkRateLimit, RateLimitError } from './rateLimitService';
import { logError } from './errorService';
import { logger } from './logger';
import {
    createAnalysisPrompt,
    createDreamChatPrompt,
    createSynthesisPrompt,
    createHabitAnalysisPrompt
} from './aiConfig';
import { detectCrisis, CRISIS_RESPONSE } from './crisisDetectionService';

/**
 * Error thrown when user has no AI credits remaining
 */
export class NoCreditsError extends Error {
    constructor() {
        super('Daily AI limit reached. Upgrade to Premium for full access.');
        this.name = 'NoCreditsError';
    }
}

/**
 * Error thrown when device is offline
 */
export class OfflineError extends Error {
    constructor() {
        super('You appear to be offline. Please check your connection and try again.');
        this.name = 'OfflineError';
    }
}

/**
 * Check if device is online
 */
const checkOnline = (): void => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new OfflineError();
    }
};

/**
 * Retry wrapper with exponential backoff for rate-limited API calls.
 * Handles 429 (Too Many Requests) errors from Gemini API.
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
): Promise<T> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            const errorMessage = lastError.message || '';

            // Check if this is a rate limit error (429)
            if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
                const delay = baseDelay * Math.pow(2, attempt);
                logger.warn(`[Gemini] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // For non-retryable errors, throw immediately
            throw error;
        }
    }

    // All retries exhausted
    logger.error('[Gemini] Max retries exceeded for rate-limited request');
    throw lastError;
}

let aiInstance: GoogleGenAI | null = null;

// Cache for dream titles to prevent redundant API calls
const dreamTitleCache = new Map<string, string>();

// In-flight request deduplication - prevents duplicate API calls during re-renders
const pendingTitleRequests = new Map<string, Promise<string>>();

// Cache for embeddings to avoid redundant API calls
const embeddingCache = new Map<string, number[]>();
const getEmbeddingCacheKey = (text: string): string => text.slice(0, 500).trim().toLowerCase();

// Generate a cache key from dream text (use first 200 chars as key)
const getTitleCacheKey = (dreamText: string): string => {
    return dreamText.slice(0, 200).trim().toLowerCase();
};

const getAi = (): GoogleGenAI => {
    if (aiInstance) {
        return aiInstance;
    }
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!API_KEY) {
        logger.error("Gemini API Key is not configured.");
        throw new Error("Please configure your Gemini API key in settings to use AI features.");
    }
    aiInstance = new GoogleGenAI({ apiKey: API_KEY });
    return aiInstance;
};


// Safety settings can be configured here if needed in the future

// Note: createAnalysisPrompt is now imported from aiConfig.ts for centralized prompt management

/**
 * Analyzes a dream using Gemini AI to extract themes, insights, and integration steps.
 * 
 * @param dreamText - The full text content of the dream
 * @param sleepAids - Optional context about sleep aids used (sound, relaxation, etc.)
 * @param biometrics - Optional user biometric data (age, gender, sleep duration)
 * @returns Promise<DreamAnalysis> - The structured analysis of the dream
 * @throws Error if AI analysis fails
 */
export const analyzeDream = async (dreamText: string, sleepAids?: SleepAids, biometrics?: Biometrics, personality: AnalysisPersonality = 'oneironaut'): Promise<DreamAnalysis> => {
    // SAFETY FIRST: Check for crisis indicators BEFORE any API call
    // This is a hardcoded safety layer that cannot be bypassed by prompt injection
    const crisisCheck = detectCrisis(dreamText);
    if (crisisCheck.detected) {
        logger.warn('[Safety] Crisis indicators detected in dream text', {
            confidence: crisisCheck.confidence,
            triggerCount: crisisCheck.triggers.length,
        });
        // Return hardcoded crisis response instead of AI analysis
        return CRISIS_RESPONSE;
    }

    // Check if device is online
    checkOnline();

    // Check rate limit first
    const rateCheck = checkRateLimit('ai_analysis');
    if (!rateCheck.allowed) {
        throw new RateLimitError(
            `Too many analysis requests. Try again in ${Math.ceil(rateCheck.resetIn / 1000)} seconds.`,
            rateCheck.resetIn,
            'ai_analysis'
        );
    }

    // Check if user can use AI analysis (premium or has credits)
    if (!canUseAiAnalysis()) {
        throw new NoCreditsError();
    }

    try {
        const ai = getAi();
        const prompt = createAnalysisPrompt(dreamText, personality, sleepAids, biometrics);
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: {
                            type: Type.STRING,
                            description: "A short, evocative, and poetic title for the dream (e.g., \"The Lion in the Hallway\")."
                        },
                        analysis: {
                            type: Type.ARRAY,
                            description: "An array of objects, each representing a thematic insight. Provide 2-3 insights.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: {
                                        type: Type.STRING,
                                        description: "A short heading like \"The Archetype of the Guardian\""
                                    },
                                    content: {
                                        type: Type.STRING,
                                        description: "A paragraph of deep analysis."
                                    }
                                },
                                required: ['title', 'content']
                            }
                        },
                        integration: {
                            type: Type.OBJECT,
                            properties: {
                                title: {
                                    type: Type.STRING,
                                    description: "Should always be \"The Integration\""
                                },
                                content: {
                                    type: Type.STRING,
                                    description: "A single, empowering, reflective question or a simple ritual for the user to integrate the dream's message."
                                }
                            },
                            required: ['title', 'content']
                        },
                        imagePrompt: {
                            type: Type.STRING,
                            description: "A detailed, vivid image generation prompt (80-150 words) that captures the dream's key visual elements, mood, colors, and atmosphere. Write it in the style of Midjourney/DALL-E prompts with artistic direction (e.g., 'surreal dreamscape', 'ethereal lighting', 'muted earth tones'). Include specific objects, settings, and emotional qualities from the dream."
                        },
                        telemetry: {
                            type: Type.OBJECT,
                            description: "ML-extracted metadata for vector analytics",
                            properties: {
                                valence: {
                                    type: Type.NUMBER,
                                    description: "Emotional valence from -1.0 (negative/unpleasant) to 1.0 (positive/pleasant). Consider the overall emotional tone."
                                },
                                arousal: {
                                    type: Type.NUMBER,
                                    description: "Emotional arousal from 0.0 (calm/peaceful) to 1.0 (intense/excited). High for action, fear, excitement; low for peaceful, melancholic."
                                },
                                lucidity: {
                                    type: Type.NUMBER,
                                    description: "Probability (0-100) that this was a lucid dream. Look for: awareness of dreaming, intentional control, impossibility recognition."
                                },
                                tags: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING },
                                    description: "3-7 semantic tags. Format: 'Category: Value'. Categories: Archetype (Shadow, Hero, Anima, etc.), Symbol (Water, Fire, etc.), Theme (Transformation, Loss, etc.), Emotion (Fear, Joy, etc.), Setting (Home, Nature, etc.)"
                                }
                            },
                            required: ['valence', 'arousal', 'lucidity', 'tags']
                        }
                    },
                    required: ['title', 'analysis', 'integration', 'telemetry']
                },
            },
        }));
        const rawJson = response.text?.trim() ?? '';
        if (!rawJson) {
            throw new Error('AI returned empty response. Please try again.');
        }
        let result: DreamAnalysis;
        try {
            result = JSON.parse(rawJson) as DreamAnalysis;
        } catch (parseError) {
            logger.error("Failed to parse dream analysis JSON:", parseError, "Raw:", rawJson.slice(0, 200));
            throw new Error("Failed to parse AI response. Please try again.");
        }

        // Validate required fields
        if (!result.title || !result.analysis || !result.integration) {
            logger.error("Invalid dream analysis structure:", result);
            throw new Error("AI returned incomplete analysis. Please try again.");
        }

        // Consume credit only after successful analysis
        consumeAiCredit();

        return result;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ai', { operation: 'analyzeDream' });
        throw error instanceof Error ? error : new Error("Failed to analyze dream.");
    }
};

/**
 * Generate an image prompt for a dream with a specific art style.
 * User-triggered, not automatic.
 */
export const generateImagePrompt = async (dreamText: string, style: DreamArtStyle): Promise<string> => {
    try {
        const ai = getAi();
        const styleInfo = DREAM_ART_STYLES[style];

        const prompt = `You are a master prompt engineer for AI image generators like Midjourney, DALL-E, and Nano Banana.

Given this dream description, create a detailed image generation prompt (80-150 words) that would produce a stunning visualization.

DREAM:
"${dreamText}"

ART STYLE TO USE:
${styleInfo.name}: ${styleInfo.prompt}

REQUIREMENTS:
- Capture the dream's key visual elements, mood, colors, and atmosphere
- Include the art style direction naturally
- Be specific about lighting, composition, and emotional tone
- Write in the format AI image generators expect
- Do NOT include any meta-commentary, just output the prompt
- Start directly with the visual description

OUTPUT ONLY THE IMAGE PROMPT, nothing else.`;

        const response = await withRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
        }));

        const result = response.text?.trim() ?? '';
        if (!result) {
            throw new Error('Failed to generate image prompt');
        }

        return result;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ai', { operation: 'generateImagePrompt' });
        throw error instanceof Error ? error : new Error("Failed to generate image prompt.");
    }
};

// Art style presets for dream imagery (matches ArtStyle from AppContext)
export type DreamArtStyle = 'surreal' | 'watercolor' | 'oil-painting' | 'anime' | 'photorealistic' | 'abstract' | 'fantasy' | 'minimalist';

/**
 * Presets for AI image generation styles.
 * Each style includes a user-friendly name and a specific prompt modifier.
 */
export const DREAM_ART_STYLES: Record<DreamArtStyle, { name: string; prompt: string }> = {
    surreal: {
        name: 'Surreal',
        prompt: 'Photorealistic surrealism, ethereal lighting, atmospheric, style of Salvador Dalí and Remedios Varo, dreamlike impossible geometry'
    },
    watercolor: {
        name: 'Watercolor',
        prompt: 'Soft watercolor painting, dreamy washes, flowing colors, delicate brushstrokes, studio ghibli inspired, luminous'
    },
    'oil-painting': {
        name: 'Oil Painting',
        prompt: 'Classical oil painting, rich textures, chiaroscuro lighting, baroque influences, museum quality, painterly brushwork'
    },
    anime: {
        name: 'Anime',
        prompt: 'Anime art style, vibrant colors, detailed background, Makoto Shinkai lighting, ethereal atmosphere, cel-shaded'
    },
    photorealistic: {
        name: 'Photorealistic',
        prompt: 'Ultra photorealistic, cinematic photography, volumetric lighting, hyper-detailed, 8k resolution, film grain'
    },
    abstract: {
        name: 'Abstract',
        prompt: 'Abstract expressionism, bold colors, emotional brushstrokes, Kandinsky and Rothko inspired, psychological depth'
    },
    fantasy: {
        name: 'Fantasy',
        prompt: 'High fantasy illustration, epic magical atmosphere, detailed environments, concept art, mystical glowing elements'
    },
    minimalist: {
        name: 'Minimalist',
        prompt: 'Minimalist illustration, clean lines, limited color palette, negative space, modern design, simple geometric forms'
    }
};


/**
 * Generate a creative title for a dream entry
 */
/**
 * Generate a creative, poetic title for a dream entry.
 * Results are cached and deduplicated to prevent redundant API calls.
 *
 * @param dreamText - The dream content
 * @returns Promise<string> - A short title (3-6 words)
 */
export const generateDreamTitle = async (dreamText: string): Promise<string> => {
    const cacheKey = getTitleCacheKey(dreamText);

    // 1. Check cache first (instant return)
    const cached = dreamTitleCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // 2. Check if request is already in-flight (deduplicate)
    const pending = pendingTitleRequests.get(cacheKey);
    if (pending) {
        return pending;
    }

    // 3. Check online status before making request
    checkOnline();

    // 4. Create new request and track it
    const request = (async () => {
        try {
            const ai = getAi();
            const prompt = `Generate a short, evocative title (3-6 words) for this dream:

"${dreamText.slice(0, 500)}"

Return ONLY the title, nothing else. No quotes, no explanation.`;

            const response = await withRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: prompt }] }],
            }));

            const title = response.text?.trim() || 'Untitled Dream';

            // Cache the result
            dreamTitleCache.set(cacheKey, title);

            return title;
        } catch (error) {
            logger.error("Error generating dream title:", error);
            return 'Untitled Dream';
        } finally {
            // Clean up pending request tracker
            pendingTitleRequests.delete(cacheKey);
        }
    })();

    // Track the in-flight request
    pendingTitleRequests.set(cacheKey, request);

    return request;
};

/**
 * Pre-populate title cache with existing dream title
 * Called when loading dreams from storage to prevent unnecessary API calls
 */
export const cacheDreamTitle = (dreamText: string, title: string): void => {
    const cacheKey = getTitleCacheKey(dreamText);
    dreamTitleCache.set(cacheKey, title);
};

const createDreamChatSystemPrompt = (dream: Dream, personality: AnalysisPersonality = 'oneironaut') => ({
    role: 'model' as const,
    parts: [{
        text: createDreamChatPrompt(dream, personality)
    }]
});

/**
 * Continues a conversation about a specific dream.
 * Maintains the persona of 'The Oneironaut'.
 * 
 * @param dream - The dream object being discussed
 * @param history - Chat history for this specific dream
 * @returns Promise<string> - The AI's response
 */
export const getDreamChatResponse = async (dream: Dream, history: ChatMessage[]): Promise<string> => {
    const cleanHistory = history.map(({ id: _id, isError: _isError, ...rest }) => rest);
    const chatHistory = [createDreamChatSystemPrompt(dream), ...cleanHistory];
    try {
        const ai = getAi();
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: chatHistory,
        }));
        return response.text ?? '';
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ai', { operation: 'getDreamChatResponse' });
        throw new Error("Failed to get AI response.");
    }
};


// --- DEEP ANALYSIS FUNCTIONS ---

// Note: createSynthesisPrompt is now imported from aiConfig.ts

/**
 * Analyzes a collection of dreams to identify recurring patterns and themes.
 * Uses a more powerful model (Flash 2.5) for synthesis.
 * 
 * @param dreams - Array of dreams to analyze
 * @returns Promise<DreamSynthesis> - Structured analysis of themes and patterns
 */
export const synthesizeDreamThemes = async (dreams: Dream[]): Promise<DreamSynthesis> => {
    try {
        const ai = getAi();
        const prompt = createSynthesisPrompt(dreams);
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-pro', // Pro model for complex multi-dream synthesis
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        overallSummary: { type: Type.STRING, description: "A concise paragraph summarizing the entire dream landscape." },
                        recurringThemes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    theme: { type: Type.STRING, description: "Title for the recurring theme (e.g., 'Journeys of Transformation')." },
                                    description: { type: Type.STRING, description: "A deep interpretation of this theme's significance." },
                                    exampleDreamIds: { type: Type.ARRAY, items: { type: Type.INTEGER } }
                                }
                            }
                        }
                    }
                }
            }
        }));
        const rawJson = response.text?.trim() ?? '';
        if (!rawJson) {
            throw new Error('AI returned empty response. Please try again.');
        }
        let result: DreamSynthesis;
        try {
            result = JSON.parse(rawJson) as DreamSynthesis;
        } catch (parseError) {
            logger.error("Failed to parse dream synthesis JSON:", parseError, "Raw:", rawJson.slice(0, 200));
            throw new Error("Failed to parse AI response. Please try again.");
        }

        // Validate required fields
        if (!result.overallSummary && !result.recurringThemes) {
            logger.error("Invalid dream synthesis structure:", result);
            throw new Error("AI returned incomplete synthesis. Please try again.");
        }

        return result;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ai', { operation: 'synthesizeDreamThemes' });
        throw error instanceof Error ? error : new Error("Failed to synthesize dream themes.");
    }
};

// Note: createHabitAnalysisPrompt is now imported from aiConfig.ts

/**
 * Analyzes correlations between sleep habits, daily context, and sleep quality.
 * 
 * @param dreams - Array of dreams containing sleep data
 * @returns Promise<SleepHabitAnalysis> - Insights about correlations
 */
export const analyzeSleepHabits = async (dreams: Dream[]): Promise<SleepHabitAnalysis> => {
    // Check if device is online
    checkOnline();

    try {
        const ai = getAi();
        const prompt = createHabitAnalysisPrompt(dreams);
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-pro', // Pro model for complex habit correlation analysis
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        positiveCorrelations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { habit: { type: Type.STRING }, insight: { type: Type.STRING } }
                            }
                        },
                        negativeCorrelations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { habit: { type: Type.STRING }, insight: { type: Type.STRING } }
                            }
                        },
                        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        }));
        const rawJson = response.text?.trim() ?? '';
        if (!rawJson) {
            throw new Error('AI returned empty response. Please try again.');
        }
        let result: SleepHabitAnalysis;
        try {
            result = JSON.parse(rawJson) as SleepHabitAnalysis;
        } catch (parseError) {
            logger.error("Failed to parse sleep habits JSON:", parseError, "Raw:", rawJson.slice(0, 200));
            throw new Error("Failed to parse AI response. Please try again.");
        }

        // Validate required fields
        if (!result.positiveCorrelations && !result.negativeCorrelations && !result.recommendations) {
            logger.error("Invalid sleep habits structure:", result);
            throw new Error("AI returned incomplete analysis. Please try again.");
        }

        return result;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ai', { operation: 'analyzeSleepHabits' });
        throw error instanceof Error ? error : new Error("Failed to analyze sleep habits.");
    }
};


// ============================================================
// VECTOR EMBEDDING FUNCTIONS
// ============================================================

/**
 * Generate a 768-dimensional embedding for dream text using Gemini's text-embedding-004
 * This enables semantic search and "Dream Déjà Vu" feature
 *
 * @param text - The dream text to embed
 * @returns Promise<number[]> - 768-dimensional vector
 */
export const generateDreamEmbedding = async (text: string): Promise<number[]> => {
    const cacheKey = getEmbeddingCacheKey(text);

    // Check cache first
    const cached = embeddingCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Check if device is online
    checkOnline();

    try {
        const ai = getAi();
        const response = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: [{ parts: [{ text }] }]
        });

        const embedding = response.embeddings?.[0]?.values;
        if (!embedding || embedding.length !== 768) {
            throw new Error('Invalid embedding response from API');
        }

        // Cache the result
        embeddingCache.set(cacheKey, embedding);

        // Limit cache size to prevent memory issues
        if (embeddingCache.size > 100) {
            const firstKey = embeddingCache.keys().next().value;
            if (firstKey) embeddingCache.delete(firstKey);
        }

        return embedding;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ai', { operation: 'generateDreamEmbedding' });
        throw error instanceof Error ? error : new Error("Failed to generate dream embedding.");
    }
};

/**
 * Find semantically similar dreams using cosine similarity
 * This is the client-side implementation for localStorage-based dreams
 * For Supabase, use the match_dreams RPC function instead
 *
 * @param targetEmbedding - The embedding to find similar dreams for
 * @param dreams - Array of dreams with embeddings to search
 * @param threshold - Minimum similarity score (0-1)
 * @param maxResults - Maximum number of results to return
 * @returns Array of similar dreams with similarity scores
 */
export const findSimilarDreams = (
    targetEmbedding: number[],
    dreams: Array<{ id: number; dreamText: string; title: string; timestamp: string; embedding?: number[] }>,
    threshold: number = 0.75,
    maxResults: number = 5
): SimilarDream[] => {
    const dreamsWithEmbeddings = dreams.filter(d => d.embedding && d.embedding.length === 768);

    const similarities = dreamsWithEmbeddings.map(dream => {
        const similarity = cosineSimilarity(targetEmbedding, dream.embedding!);
        return {
            id: dream.id,
            dreamText: dream.dreamText,
            title: dream.title,
            timestamp: dream.timestamp,
            similarity
        };
    });

    return similarities
        .filter(s => s?.similarity >= threshold)
        .sort((a, b) => (b?.similarity ?? 0) - (a?.similarity ?? 0))
        .slice(0, maxResults);
};

/**
 * Compute cosine similarity between two vectors
 */
const cosineSimilarity = (a: number[], b: number[]): number => {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
        normA += (a[i] ?? 0) * (a[i] ?? 0);
        normB += (b[i] ?? 0) * (b[i] ?? 0);
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
};


// ============================================================
// DREAM RECALL: RAG-ENHANCED ANALYSIS
// ============================================================

/**
 * Analyze a dream with RAG (Retrieval-Augmented Generation)
 * Finds similar past dreams and injects them as context for richer analysis
 * This is the "Dream Déjà Vu" feature
 *
 * @param dreamText - The new dream to analyze
 * @param pastDreams - Array of past dreams with embeddings
 * @param sleepAids - Optional sleep context
 * @param biometrics - Optional user biometrics
 * @param personality - Analysis personality style
 * @returns Enhanced DreamAnalysis with past dream connections
 */
export const analyzeDreamWithMemory = async (
    dreamText: string,
    pastDreams: Array<{ id: number; dreamText: string; title: string; timestamp: string; embedding?: number[] }>,
    sleepAids?: SleepAids,
    biometrics?: Biometrics,
    personality: AnalysisPersonality = 'oneironaut'
): Promise<{ analysis: DreamAnalysis; embedding: number[]; similarDreams: SimilarDream[] }> => {
    // 1. Generate embedding for the new dream
    const embedding = await generateDreamEmbedding(dreamText);

    // 2. Find similar past dreams (RAG retrieval)
    const similarDreams = findSimilarDreams(embedding, pastDreams, 0.70, 3);

    // 3. Build context string from similar dreams with poetic synthesis instructions
    let contextString = '';
    const firstDream = similarDreams[0];
    if (similarDreams.length > 0 && firstDream) {
        const daysSinceFirst = Math.round(
            (Date.now() - new Date(firstDream.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        );
        contextString = `\n\n[DREAM MEMORY CONTEXT - DÉJÀ VU SYNTHESIS]
The dreamer has experienced similar dreams in the past:
${similarDreams.map((d, i) =>
            `${i + 1}. "${d.title}" (${daysSinceFirst} days ago): ${d.dreamText.slice(0, 200)}...`
        ).join('\n')}

IMPORTANT - For each past dream connection, generate a POETIC SYNTHESIS, not just a similarity description.
Instead of: "85% similar to Ocean Journey"
Write: "You're returning to the Ocean. But this time, you're not afraid."

The synthesis should:
1. Name the recurring element/theme in second person ("You're...")
2. Note any evolution or change between dreams
3. Be 1-2 sentences, evocative and meaningful
4. Feel like a revelation, not a statistic`;
    }

    // 4. Check rate limit and credits
    const rateCheck = checkRateLimit('ai_analysis');
    if (!rateCheck.allowed) {
        throw new RateLimitError(
            `Too many analysis requests. Try again in ${Math.ceil(rateCheck.resetIn / 1000)} seconds.`,
            rateCheck.resetIn,
            'ai_analysis'
        );
    }

    if (!canUseAiAnalysis()) {
        throw new NoCreditsError();
    }

    // 5. Run analysis with enhanced context
    try {
        const ai = getAi();
        const basePrompt = createAnalysisPrompt(dreamText, personality, sleepAids, biometrics);
        const enhancedPrompt = basePrompt + contextString;

        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: enhancedPrompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: {
                            type: Type.STRING,
                            description: "A short, evocative, and poetic title for the dream."
                        },
                        analysis: {
                            type: Type.ARRAY,
                            description: "2-3 thematic insights. If similar past dreams were provided, include connections to them.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    content: { type: Type.STRING }
                                },
                                required: ['title', 'content']
                            }
                        },
                        integration: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                content: { type: Type.STRING }
                            },
                            required: ['title', 'content']
                        },
                        imagePrompt: { type: Type.STRING },
                        telemetry: {
                            type: Type.OBJECT,
                            properties: {
                                valence: { type: Type.NUMBER },
                                arousal: { type: Type.NUMBER },
                                lucidity: { type: Type.NUMBER },
                                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ['valence', 'arousal', 'lucidity', 'tags']
                        },
                        dreamConnections: {
                            type: Type.ARRAY,
                            description: "If similar past dreams were provided, generate poetic synthesis for each connection",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    pastDreamTitle: { type: Type.STRING, description: "Title of the past dream" },
                                    daysAgo: { type: Type.NUMBER, description: "How many days ago the past dream occurred" },
                                    synthesis: {
                                        type: Type.STRING,
                                        description: "A poetic 1-2 sentence narrative synthesis in second person. Example: 'You're returning to the Ocean. But this time, you're not afraid.' NOT a percentage or technical description."
                                    }
                                },
                                required: ['pastDreamTitle', 'synthesis']
                            }
                        }
                    },
                    required: ['title', 'analysis', 'integration', 'telemetry']
                }
            }
        }));

        const rawJson = response.text?.trim() ?? '';
        if (!rawJson) throw new Error('AI returned empty response.');

        const result = JSON.parse(rawJson) as DreamAnalysis & {
            dreamConnections?: Array<{
                pastDreamTitle: string;
                daysAgo?: number;
                synthesis: string;
            }>
        };

        // Consume credit after success
        consumeAiCredit();

        return {
            analysis: result,
            embedding,
            similarDreams
        };
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ai', { operation: 'analyzeDreamWithMemory' });
        throw error instanceof Error ? error : new Error("Failed to analyze dream with memory.");
    }
};

/**
 * Pre-cache embedding for an existing dream
 * Call this when loading dreams from storage to build the embedding cache
 */
export const cacheDreamEmbedding = (dreamText: string, embedding: number[]): void => {
    const cacheKey = getEmbeddingCacheKey(dreamText);
    embeddingCache.set(cacheKey, embedding);
};