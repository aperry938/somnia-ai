/**
 * ML Analytics Service
 *
 * Sophisticated ML-powered dream and sleep analytics using Gemini API.
 * Provides nuanced sentiment analysis, semantic theme extraction,
 * narrative pattern detection, and sleep quality prediction.
 *
 * SECURITY: All functions enforce premium access and rate limiting.
 * BILLING: All functions consume AI credits after successful API calls.
 */
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import {
    Dream,
    MLSentiment,
    MLEmotion,
    SemanticTheme,
    NarrativePattern,
    SleepPrediction,
    PredictionFactor,
    MLAnalysisResult,
    SleepAids,
    Biometrics
} from '../types';
import { logError } from './errorService';
import { logger } from './logger';
import { canUseAiAnalysis, useAiCredit, isPremium } from './secureSubscriptionService';
import { checkRateLimit, RateLimitError } from './rateLimitService';

// ============================================================
// CONFIGURATION
// ============================================================

/** Model configuration - centralized for easy updates */
const MODELS = {
    default: 'gemini-2.5-flash',
    fast: 'gemini-2.5-flash',
    pro: 'gemini-1.5-pro'  // For synthesis tasks requiring more reasoning
} as const;

/** Rate limit key for ML analytics operations */
const ML_RATE_LIMIT_KEY = 'ml_analysis';

// Singleton AI instance
let aiInstance: GoogleGenAI | null = null;

const getAi = (): GoogleGenAI => {
    if (aiInstance) return aiInstance;
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        throw new Error("API_KEY is not set for ML analytics.");
    }
    aiInstance = new GoogleGenAI({ apiKey: API_KEY });
    return aiInstance;
};

// ============================================================
// ERROR CLASSES
// ============================================================

export class MLAnalyticsError extends Error {
    constructor(message: string, public readonly operation: string) {
        super(message);
        this.name = 'MLAnalyticsError';
    }
}

export class NoCreditsError extends Error {
    constructor() {
        super('Daily AI limit reached. Upgrade to Premium for unlimited ML analytics.');
        this.name = 'NoCreditsError';
    }
}

// ============================================================
// VALIDATION HELPERS
// ============================================================

/**
 * Enforce premium access and rate limiting before API calls
 */
const enforceAccess = (operation: string): void => {
    // Check rate limit first
    const rateCheck = checkRateLimit(ML_RATE_LIMIT_KEY);
    if (!rateCheck.allowed) {
        throw new RateLimitError(
            `Too many ML analytics requests. Try again in ${Math.ceil(rateCheck.resetIn / 1000)} seconds.`,
            rateCheck.resetIn,
            ML_RATE_LIMIT_KEY
        );
    }

    // Check premium/credit access
    if (!canUseAiAnalysis()) {
        throw new NoCreditsError();
    }
};

/**
 * Validate MLSentiment response structure
 */
const validateSentimentResponse = (data: unknown): data is MLSentiment => {
    const s = data as MLSentiment;
    return (
        s &&
        typeof s.primary === 'string' &&
        typeof s.confidence === 'number' &&
        Array.isArray(s.emotions) &&
        typeof s.nuance === 'string' &&
        typeof s.valence === 'number' &&
        typeof s.arousal === 'number'
    );
};

/**
 * Validate SemanticTheme array response
 */
const validateThemesResponse = (data: unknown): data is { themes: SemanticTheme[] } => {
    const d = data as { themes: SemanticTheme[] };
    return d && Array.isArray(d.themes) && d.themes.every(t =>
        typeof t.name === 'string' &&
        Array.isArray(t.symbols) &&
        typeof t.interpretation === 'string' &&
        Array.isArray(t.dreamIds) &&
        typeof t.strength === 'number'
    );
};

/**
 * Validate NarrativePattern array response
 */
const validatePatternsResponse = (data: unknown): data is { patterns: NarrativePattern[] } => {
    const d = data as { patterns: NarrativePattern[] };
    return d && Array.isArray(d.patterns) && d.patterns.every(p =>
        typeof p.type === 'string' &&
        typeof p.name === 'string' &&
        typeof p.description === 'string' &&
        typeof p.frequency === 'number' &&
        Array.isArray(p.dreamIds)
    );
};

/**
 * Validate SleepPrediction response structure
 */
const validatePredictionResponse = (data: unknown): data is SleepPrediction => {
    const p = data as SleepPrediction;
    return (
        p &&
        typeof p.predictedQuality === 'number' &&
        typeof p.confidence === 'number' &&
        Array.isArray(p.factors) &&
        Array.isArray(p.recommendations) &&
        typeof p.rationale === 'string'
    );
};

// ============================================================
// NUANCED SENTIMENT ANALYSIS
// ============================================================

/**
 * Analyze dream sentiment with nuance beyond simple positive/negative.
 * Enforces rate limiting and consumes AI credits.
 *
 * @param dreamText - The dream text to analyze
 * @returns Nuanced sentiment analysis with valence/arousal
 * @throws RateLimitError if too many requests
 * @throws NoCreditsError if no credits remaining
 */
export const analyzeMLSentiment = async (dreamText: string): Promise<MLSentiment> => {
    // Enforce access control
    enforceAccess('analyzeMLSentiment');

    // Validate input
    if (!dreamText || dreamText.trim().length < 10) {
        throw new MLAnalyticsError('Dream text is too short for sentiment analysis', 'analyzeMLSentiment');
    }

    const prompt = `You are an expert dream psychologist performing nuanced emotional analysis.

Analyze the emotional content of this dream with deep psychological insight:

"${dreamText}"

Provide a sophisticated sentiment analysis that goes beyond simple positive/negative classification.
Consider:
- The emotional undertones and subtext
- Mixed or complex emotions (e.g., "bittersweet nostalgia", "anxious excitement")
- The emotional journey within the dream
- Psychological valence (pleasure/displeasure) and arousal (calm/intense)

Be specific about what triggered each emotion in the dream.`;

    try {
        const ai = getAi();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODELS.default,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        primary: {
                            type: Type.STRING,
                            description: "Primary sentiment: 'positive', 'negative', 'neutral', or 'mixed'"
                        },
                        confidence: {
                            type: Type.NUMBER,
                            description: "Confidence in the analysis (0-1)"
                        },
                        emotions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    emotion: { type: Type.STRING, description: "Specific emotion name" },
                                    intensity: { type: Type.NUMBER, description: "Intensity 0-1" },
                                    triggers: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING },
                                        description: "What triggered this emotion"
                                    }
                                },
                                required: ['emotion', 'intensity']
                            }
                        },
                        nuance: {
                            type: Type.STRING,
                            description: "A nuanced description like 'bittersweet nostalgia' or 'anxious anticipation'"
                        },
                        valence: {
                            type: Type.NUMBER,
                            description: "Emotional valence from -1 (negative) to 1 (positive)"
                        },
                        arousal: {
                            type: Type.NUMBER,
                            description: "Emotional arousal from 0 (calm) to 1 (intense)"
                        }
                    },
                    required: ['primary', 'confidence', 'emotions', 'nuance', 'valence', 'arousal']
                }
            }
        });

        const rawJson = response.text?.trim() ?? '';
        if (!rawJson) throw new MLAnalyticsError('Empty response from API', 'analyzeMLSentiment');

        const result = JSON.parse(rawJson);

        // Validate response structure
        if (!validateSentimentResponse(result)) {
            throw new MLAnalyticsError('Invalid sentiment response structure', 'analyzeMLSentiment');
        }

        // Consume credit after successful analysis
        useAiCredit();

        return result;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ai', { operation: 'analyzeMLSentiment' });
        throw error;
    }
};

// ============================================================
// SEMANTIC THEME EXTRACTION
// ============================================================

/**
 * Extract semantic themes from a collection of dreams using AI.
 * Enforces rate limiting and consumes AI credits.
 *
 * @param dreams - Array of dreams to analyze (minimum 3)
 * @returns Array of semantic themes with archetypes
 * @throws RateLimitError if too many requests
 * @throws NoCreditsError if no credits remaining
 */
export const extractSemanticThemes = async (dreams: Dream[]): Promise<SemanticTheme[]> => {
    // Enforce access control
    enforceAccess('extractSemanticThemes');

    // Validate input
    if (!dreams || dreams.length < 3) {
        throw new MLAnalyticsError('Need at least 3 dreams for theme extraction', 'extractSemanticThemes');
    }

    // Filter valid dreams
    const validDreams = dreams.filter(d => d && d.dreamText && d.dreamText.trim().length > 10);
    if (validDreams.length < 3) {
        throw new MLAnalyticsError('Need at least 3 valid dreams with content', 'extractSemanticThemes');
    }

    const dreamSummaries = validDreams.slice(0, 20).map((d) =>
        `Dream ${d.id} (${new Date(d.timestamp).toLocaleDateString()}): ${d.dreamText.slice(0, 300)}...`
    ).join('\n\n');

    const prompt = `You are a Jungian dream analyst and expert in symbolic interpretation.

Analyze these dreams to identify deep, semantically-meaningful themes (NOT simple keyword matching):

${dreamSummaries}

Look for:
1. Archetypal patterns (The Hero's Journey, Shadow, Anima/Animus, The Wise Old Man, etc.)
2. Symbolic chains (symbols that appear across multiple dreams with related meanings)
3. Psychological themes (transformation, integration, conflict resolution, individuation)
4. Emotional undercurrents that persist across dreams

For each theme, provide:
- A meaningful name (not just a single keyword)
- The symbols/images that constitute this theme
- Psychological interpretation
- Which dream IDs contain this theme
- How strong/prevalent this theme is (0-1)`;

    try {
        const ai = getAi();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODELS.default,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        themes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    symbols: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    interpretation: { type: Type.STRING },
                                    dreamIds: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                                    strength: { type: Type.NUMBER },
                                    archetype: { type: Type.STRING }
                                },
                                required: ['name', 'symbols', 'interpretation', 'dreamIds', 'strength']
                            }
                        }
                    },
                    required: ['themes']
                }
            }
        });

        const rawJson = response.text?.trim() ?? '';
        if (!rawJson) throw new MLAnalyticsError('Empty response from API', 'extractSemanticThemes');

        const result = JSON.parse(rawJson);

        // Validate response structure
        if (!validateThemesResponse(result)) {
            throw new MLAnalyticsError('Invalid themes response structure', 'extractSemanticThemes');
        }

        // Consume credit after successful analysis
        useAiCredit();

        return result.themes;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ai', { operation: 'extractSemanticThemes' });
        throw error;
    }
};

// ============================================================
// NARRATIVE PATTERN DETECTION
// ============================================================

/**
 * Detect recurring narrative patterns across dreams.
 * Enforces rate limiting and consumes AI credits.
 *
 * @param dreams - Array of dreams to analyze (minimum 5)
 * @returns Array of narrative patterns with evolution tracking
 * @throws RateLimitError if too many requests
 * @throws NoCreditsError if no credits remaining
 */
export const detectNarrativePatterns = async (dreams: Dream[]): Promise<NarrativePattern[]> => {
    // Enforce access control
    enforceAccess('detectNarrativePatterns');

    // Validate input
    if (!dreams || dreams.length < 5) {
        throw new MLAnalyticsError('Need at least 5 dreams for pattern detection', 'detectNarrativePatterns');
    }

    // Filter valid dreams
    const validDreams = dreams.filter(d => d && d.dreamText && d.dreamText.trim().length > 10);
    if (validDreams.length < 5) {
        throw new MLAnalyticsError('Need at least 5 valid dreams with content', 'detectNarrativePatterns');
    }

    const dreamSummaries = validDreams.slice(0, 30).map((d) =>
        `[ID:${d.id}|${new Date(d.timestamp).toISOString().split('T')[0]}] ${d.title || 'Untitled'}: ${d.dreamText.slice(0, 250)}...`
    ).join('\n');

    const prompt = `You are an expert narrative analyst specializing in dream pattern recognition.

Analyze these dreams chronologically to identify recurring narrative patterns:

${dreamSummaries}

Look for:
1. **Recurring Characters**: People who appear multiple times (even if transformed)
2. **Location Themes**: Places that recur or transform (the house, the road, bodies of water)
3. **Emotional Arcs**: Repeating emotional sequences (fear → escape → relief)
4. **Symbol Chains**: Connected symbols that evolve across dreams
5. **Unresolved Conflicts**: Issues that keep resurfacing

For each pattern:
- Identify how it has evolved over time (if applicable)
- Note the first and last appearance
- Explain the psychological significance`;

    try {
        const ai = getAi();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODELS.default,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        patterns: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: {
                                        type: Type.STRING,
                                        description: "One of: recurring_character, location_theme, emotional_arc, symbol_chain, unresolved_conflict"
                                    },
                                    name: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    frequency: { type: Type.INTEGER },
                                    firstSeen: { type: Type.STRING },
                                    lastSeen: { type: Type.STRING },
                                    dreamIds: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                                    evolution: { type: Type.STRING }
                                },
                                required: ['type', 'name', 'description', 'frequency', 'firstSeen', 'lastSeen', 'dreamIds']
                            }
                        }
                    },
                    required: ['patterns']
                }
            }
        });

        const rawJson = response.text?.trim() ?? '';
        if (!rawJson) throw new MLAnalyticsError('Empty response from API', 'detectNarrativePatterns');

        const result = JSON.parse(rawJson);

        // Validate response structure
        if (!validatePatternsResponse(result)) {
            throw new MLAnalyticsError('Invalid patterns response structure', 'detectNarrativePatterns');
        }

        // Consume credit after successful analysis
        useAiCredit();

        return result.patterns;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ai', { operation: 'detectNarrativePatterns' });
        throw error;
    }
};

// ============================================================
// SLEEP QUALITY PREDICTION
// ============================================================

/**
 * Predict tonight's sleep quality based on context.
 * Enforces rate limiting and consumes AI credits.
 *
 * @param sleepAids - Current sleep preparation context
 * @param biometrics - User biometric data
 * @param recentDreams - Recent dreams for historical context
 * @returns Sleep quality prediction with factors and recommendations
 * @throws RateLimitError if too many requests
 * @throws NoCreditsError if no credits remaining
 */
export const predictSleepQuality = async (
    sleepAids: SleepAids | undefined,
    biometrics: Biometrics | undefined,
    recentDreams: Dream[]
): Promise<SleepPrediction> => {
    // Enforce access control
    enforceAccess('predictSleepQuality');

    const context = {
        dayRating: sleepAids?.dayRating,
        dayNotes: sleepAids?.dayNotes,
        usedSound: !!sleepAids?.sound,
        usedRelaxation: !!sleepAids?.relaxation,
        breathingExercises: sleepAids?.breathingExercises?.length || 0,
        checklist: sleepAids?.checklist || [],
        sleepGoal: biometrics?.sleepGoal,
        recentQuality: (recentDreams || []).slice(0, 7).map(d => d.sleepQuality).filter(Boolean),
        currentHour: new Date().getHours(),
        dayOfWeek: new Date().getDay()
    };

    const prompt = `You are a sleep scientist analyzing factors that affect sleep quality.

Based on this context, predict tonight's sleep quality (1-5 scale):

Context:
- Day rating: ${context.dayRating ?? 'not provided'}/5
- Day notes: "${context.dayNotes || 'none'}"
- Using soundscape: ${context.usedSound ? 'Yes' : 'No'}
- Using relaxation: ${context.usedRelaxation ? 'Yes' : 'No'}
- Breathing exercises: ${context.breathingExercises}
- Pre-sleep checklist items: ${context.checklist.join(', ') || 'none'}
- Sleep goal: ${context.sleepGoal || 'not set'} hours
- Recent sleep quality (last 7 nights): ${context.recentQuality.join(', ') || 'no data'}
- Current hour: ${context.currentHour}:00
- Day of week: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][context.dayOfWeek]}

Analyze the factors and provide:
1. A predicted quality score (1-5)
2. Confidence in the prediction (0-1)
3. Which factors are helping or hurting
4. Specific recommendations to improve tonight's sleep`;

    try {
        const ai = getAi();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODELS.default,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        predictedQuality: { type: Type.NUMBER },
                        confidence: { type: Type.NUMBER },
                        factors: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    factor: { type: Type.STRING },
                                    impact: { type: Type.STRING },
                                    weight: { type: Type.NUMBER },
                                    source: { type: Type.STRING }
                                },
                                required: ['factor', 'impact', 'weight', 'source']
                            }
                        },
                        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rationale: { type: Type.STRING }
                    },
                    required: ['predictedQuality', 'confidence', 'factors', 'recommendations', 'rationale']
                }
            }
        });

        const rawJson = response.text?.trim() ?? '';
        if (!rawJson) throw new MLAnalyticsError('Empty response from API', 'predictSleepQuality');

        const result = JSON.parse(rawJson);

        // Validate response structure
        if (!validatePredictionResponse(result)) {
            throw new MLAnalyticsError('Invalid prediction response structure', 'predictSleepQuality');
        }

        // Consume credit after successful analysis
        useAiCredit();

        return result;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ai', { operation: 'predictSleepQuality' });
        throw error;
    }
};

// ============================================================
// COMPREHENSIVE ML ANALYSIS
// ============================================================

/**
 * Generate a complete ML analysis report for a user's dreams.
 * This is an expensive operation that runs multiple analyses in parallel.
 * Does NOT consume additional credits (sub-functions already consume).
 *
 * @param dreams - Array of dreams to analyze (minimum 3)
 * @returns Complete ML analysis result with sentiment, themes, patterns
 */
export const generateMLAnalysis = async (dreams: Dream[]): Promise<MLAnalysisResult> => {
    // Validate input
    if (!dreams || dreams.length < 3) {
        throw new MLAnalyticsError('Need at least 3 dreams for ML analysis', 'generateMLAnalysis');
    }

    const validDreams = dreams.filter(d => d && d.dreamText && d.dreamText.trim().length > 10);
    if (validDreams.length < 3) {
        throw new MLAnalyticsError('Need at least 3 valid dreams with content', 'generateMLAnalysis');
    }

    logger.info(`Starting ML analysis for ${validDreams.length} dreams`);

    // Run analyses in parallel for efficiency
    // Note: Each sub-function handles its own access control and credit consumption
    const [themes, patterns, recentSentiments] = await Promise.all([
        // Theme extraction
        extractSemanticThemes(validDreams).catch(e => {
            logger.error('Theme extraction failed:', e);
            return [] as SemanticTheme[];
        }),

        // Pattern detection (requires 5+ dreams)
        validDreams.length >= 5
            ? detectNarrativePatterns(validDreams).catch(e => {
                logger.error('Pattern detection failed:', e);
                return [] as NarrativePattern[];
            })
            : Promise.resolve([] as NarrativePattern[]),

        // Sentiment analysis for recent dreams (up to 5 for cost control)
        Promise.all(
            validDreams.slice(0, 5).map(d =>
                analyzeMLSentiment(d.dreamText).catch(e => {
                    logger.error(`Sentiment analysis failed for dream ${d.id}:`, e);
                    return null;
                })
            )
        ).then(results => results.filter((r): r is MLSentiment => r !== null))
    ]);

    // Compute aggregate sentiment from actual analysis results
    let overallSentiment: MLSentiment;
    let sentimentDistribution: { sentiment: string; percentage: number }[] = [];

    if (recentSentiments.length > 0) {
        // Aggregate valence and arousal
        const avgValence = recentSentiments.reduce((s, r) => s + r.valence, 0) / recentSentiments.length;
        const avgArousal = recentSentiments.reduce((s, r) => s + r.arousal, 0) / recentSentiments.length;
        const avgConfidence = recentSentiments.reduce((s, r) => s + r.confidence, 0) / recentSentiments.length;

        // Collect all emotions with their intensities
        const emotionMap = new Map<string, { total: number; count: number }>();
        recentSentiments.forEach(s => {
            s.emotions.forEach(e => {
                const existing = emotionMap.get(e.emotion) || { total: 0, count: 0 };
                emotionMap.set(e.emotion, { total: existing.total + e.intensity, count: existing.count + 1 });
            });
        });

        // Top 5 emotions
        const aggregatedEmotions: MLEmotion[] = Array.from(emotionMap.entries())
            .map(([emotion, data]) => ({
                emotion,
                intensity: data.total / data.count
            }))
            .sort((a, b) => b.intensity - a.intensity)
            .slice(0, 5);

        // Determine primary sentiment
        const primaryCounts = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
        recentSentiments.forEach(s => {
            primaryCounts[s.primary as keyof typeof primaryCounts]++;
        });
        const primary = Object.entries(primaryCounts).sort((a, b) => b[1] - a[1])[0][0] as 'positive' | 'negative' | 'neutral' | 'mixed';

        // Create distribution
        const total = recentSentiments.length;
        sentimentDistribution = Object.entries(primaryCounts)
            .filter(([_, count]) => count > 0)
            .map(([sentiment, count]) => ({
                sentiment,
                percentage: Math.round((count / total) * 100)
            }));

        // Generate nuance description
        const dominantEmotion = aggregatedEmotions[0]?.emotion || 'complex';
        const nuanceDescriptors: Record<string, string> = {
            positive: `predominantly ${dominantEmotion} with hopeful undertones`,
            negative: `characterized by ${dominantEmotion} and introspective tension`,
            mixed: `a blend of ${dominantEmotion} with emotional complexity`,
            neutral: `balanced and contemplative, centered on ${dominantEmotion}`
        };

        overallSentiment = {
            primary,
            confidence: avgConfidence,
            emotions: aggregatedEmotions,
            nuance: nuanceDescriptors[primary] || 'Complex emotional landscape',
            valence: avgValence,
            arousal: avgArousal
        };
    } else {
        // Fallback if sentiment analysis failed
        overallSentiment = {
            primary: 'mixed',
            confidence: 0.5,
            emotions: [],
            nuance: 'Unable to analyze sentiment',
            valence: 0,
            arousal: 0.5
        };
    }

    // Determine sentiment trend by comparing recent vs older dreams
    let sentimentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentSentiments.length >= 3) {
        const recentValence = recentSentiments.slice(0, 2).reduce((s, r) => s + r.valence, 0) / 2;
        const olderValence = recentSentiments.slice(2).reduce((s, r) => s + r.valence, 0) / Math.max(recentSentiments.length - 2, 1);

        if (recentValence > olderValence + 0.2) sentimentTrend = 'improving';
        else if (recentValence < olderValence - 0.2) sentimentTrend = 'declining';
    }

    // Generate insights based on analysis
    const insights: string[] = [];
    const nextSteps: string[] = [];

    // Theme-based insights
    if (themes.length > 0) {
        const topTheme = themes[0];
        insights.push(`Your dreams frequently explore "${topTheme.name}" - ${topTheme.interpretation.slice(0, 100)}...`);
        if (topTheme.archetype) {
            nextSteps.push(`Explore the ${topTheme.archetype} archetype in your waking life through journaling or reflection.`);
        }
    }

    // Pattern-based insights
    if (patterns.length > 0) {
        const unresolvedConflicts = patterns.filter(p => p.type === 'unresolved_conflict');
        if (unresolvedConflicts.length > 0) {
            insights.push(`Pattern detected: "${unresolvedConflicts[0].name}" appears ${unresolvedConflicts[0].frequency} times and may represent an unresolved issue.`);
            nextSteps.push(`Consider addressing "${unresolvedConflicts[0].name}" in your waking life to potentially resolve this recurring pattern.`);
        }

        const recurringCharacters = patterns.filter(p => p.type === 'recurring_character');
        if (recurringCharacters.length > 0) {
            insights.push(`"${recurringCharacters[0].name}" appears in ${recurringCharacters[0].frequency} dreams - consider what this figure represents to you.`);
        }
    }

    // Sentiment-based insights
    if (overallSentiment.valence < -0.3) {
        insights.push('Your recent dreams trend toward challenging emotional content. This may indicate unprocessed stress or anxiety.');
        nextSteps.push('Consider mindfulness practices or journaling about recurring concerns before sleep.');
    } else if (overallSentiment.valence > 0.3) {
        insights.push('Your dream landscape shows positive emotional patterns, suggesting psychological well-being.');
    }

    if (overallSentiment.arousal > 0.7) {
        insights.push('Your dreams are emotionally intense. This could indicate active processing of significant life events.');
    }

    return {
        generatedAt: new Date().toISOString(),
        dreamCount: validDreams.length,
        sentiment: {
            overall: overallSentiment,
            trend: sentimentTrend,
            distribution: sentimentDistribution
        },
        themes,
        patterns,
        insights,
        nextSteps
    };
};
