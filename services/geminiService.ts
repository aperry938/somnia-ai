import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";
import { ChatMessage, Dream, DreamAnalysis, DreamSynthesis, SleepHabitAnalysis, SleepAids, Biometrics, AnalysisPersonality } from '../types';
import { requirePremium, canUseAiAnalysis, useAiCredit, getRemainingCredits } from './secureSubscriptionService';
import {
    SOMNIA_IDENTITY,
    COACH_PERSONAS,
    createAnalysisPrompt,
    createCoachPrompt,
    createDreamChatPrompt,
    createSynthesisPrompt,
    createHabitAnalysisPrompt,
    buildUserContext
} from './aiConfig';

/**
 * Error thrown when user has no AI credits remaining
 */
export class NoCreditsError extends Error {
    constructor() {
        super('No AI credits remaining this month. Upgrade to Premium for unlimited analyses.');
        this.name = 'NoCreditsError';
    }
}

let aiInstance: GoogleGenAI | null = null;

// Cache for dream titles to prevent redundant API calls
const dreamTitleCache = new Map<string, string>();

// In-flight request deduplication - prevents duplicate API calls during re-renders
const pendingTitleRequests = new Map<string, Promise<string>>();

// Generate a cache key from dream text (use first 200 chars as key)
const getTitleCacheKey = (dreamText: string): string => {
    return dreamText.slice(0, 200).trim().toLowerCase();
};

const getAi = (): GoogleGenAI => {
    if (aiInstance) {
        return aiInstance;
    }
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        alert("Gemini API Key is not configured. Please set it up to use AI features.");
        throw new Error("API_KEY is not set in process.env.");
    }
    aiInstance = new GoogleGenAI({ apiKey: API_KEY });
    return aiInstance;
};


const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
];

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
    // Check if user can use AI analysis (premium or has credits)
    if (!canUseAiAnalysis()) {
        throw new NoCreditsError();
    }

    try {
        const ai = getAi();
        const prompt = createAnalysisPrompt(dreamText, personality, sleepAids, biometrics);
        const response: GenerateContentResponse = await ai.models.generateContent({
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
                        }
                    },
                    required: ['title', 'analysis', 'integration']
                },
            },
        });
        const rawJson = response.text.trim();
        const result = JSON.parse(rawJson) as DreamAnalysis;

        // Consume credit only after successful analysis
        useAiCredit();

        return result;
    } catch (error) {
        console.error("Error analyzing dream:", error);
        throw new Error("Failed to analyze dream.");
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

function createImagePrompt(dreamText: string, style: DreamArtStyle = 'surreal'): string {
    const styleData = DREAM_ART_STYLES[style];
    return `A dream of: "${dreamText}". ${styleData.prompt}, emotionally resonant, sophisticated, cinematic, trending on artstation.`;
}


/**
 * Generates an image visualization of a dream using Gemini Pro Vision.
 * 
 * @param dreamText - The text description of the dream
 * @param style - The artistic style to use (default: 'surrealist')
 * @returns Promise<string> - The base64 encoded image data
 */
export const generateDreamImage = async (dreamText: string, style: DreamArtStyle = 'surreal'): Promise<string> => {
    try {
        const ai = getAi();
        const prompt = createImagePrompt(dreamText, style);
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data; // This is the base64 string
            }
        }
        throw new Error("No image data found in response.");
    } catch (error) {
        console.error("Error generating dream image:", error);
        throw new Error("Failed to generate dream image.");
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

    // 3. Create new request and track it
    const request = (async () => {
        try {
            const ai = getAi();
            const prompt = `Generate a short, evocative title (3-6 words) for this dream:

"${dreamText.slice(0, 500)}"

Return ONLY the title, nothing else. No quotes, no explanation.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: prompt }] }],
            });

            const title = response.text?.trim() || 'Untitled Dream';

            // Cache the result
            dreamTitleCache.set(cacheKey, title);

            return title;
        } catch (error) {
            console.error("Error generating dream title:", error);
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

const createCoachSystemPrompt = (personality: 'mystical' | 'scientific', userContext?: string) => {
    const prompt = createCoachPrompt(personality, userContext, new Date());
    return {
        role: 'model' as const,
        parts: [{ text: prompt }]
    };
};

/**
 * functionality for the AI Sleep Coach.
 * Generates a response based on chat history.
 * 
 * @param history - Array of previous chat messages
 * @param history - Array of previous chat messages
 * @param personality - The personality mode ('mystical' | 'scientific')
 * @returns Promise<string> - The AI coach's response
 */
export const getCoachResponse = async (history: ChatMessage[], personality: 'mystical' | 'scientific' = 'mystical'): Promise<string> => {
    const cleanHistory = history.map(({ id, isError, ...rest }) => rest);
    const chatHistory = [createCoachSystemPrompt(personality), ...cleanHistory];
    try {
        const ai = getAi();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: chatHistory,
        });
        return response.text;
    } catch (error) {
        console.error("Error getting coach response:", error);
        throw new Error("Failed to get AI response.");
    }
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
    const cleanHistory = history.map(({ id, isError, ...rest }) => rest);
    const chatHistory = [createDreamChatSystemPrompt(dream), ...cleanHistory];
    try {
        const ai = getAi();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: chatHistory,
        });
        return response.text;
    } catch (error) {
        console.error("Error getting dream chat response:", error);
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
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Switched from Pro to Flash for cost optimization (~10x cheaper)
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
        });
        const rawJson = response.text.trim();
        return JSON.parse(rawJson) as DreamSynthesis;
    } catch (error) {
        console.error("Error synthesizing dream themes:", error);
        throw new Error("Failed to synthesize dream themes.");
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
    try {
        const ai = getAi();
        const prompt = createHabitAnalysisPrompt(dreams);
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Switched from Pro to Flash for cost optimization (~10x cheaper)
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
        });
        const rawJson = response.text.trim();
        return JSON.parse(rawJson) as SleepHabitAnalysis;
    } catch (error) {
        console.error("Error analyzing sleep habits:", error);
        throw new Error("Failed to analyze sleep habits.");
    }
};