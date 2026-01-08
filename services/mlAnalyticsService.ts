/**
 * ML Analytics Service
 * 
 * Sophisticated ML-powered dream and sleep analytics using Gemini API.
 * Provides nuanced sentiment analysis, semantic theme extraction,
 * narrative pattern detection, and sleep quality prediction.
 */
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import {
    Dream,
    MLSentiment,
    SemanticTheme,
    NarrativePattern,
    SleepPrediction,
    MLAnalysisResult,
    SleepAids,
    Biometrics
} from '../types';
import { logError } from './errorService';
import { logger } from './logger';

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
// NUANCED SENTIMENT ANALYSIS
// ============================================================

/**
 * Analyze dream sentiment with nuance beyond simple positive/negative
 */
export const analyzeMLSentiment = async (dreamText: string): Promise<MLSentiment> => {
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
            model: 'gemini-2.5-flash',
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
        if (!rawJson) throw new Error('Empty response from ML sentiment analysis');

        return JSON.parse(rawJson) as MLSentiment;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ml', { operation: 'analyzeMLSentiment' });
        throw error;
    }
};

// ============================================================
// SEMANTIC THEME EXTRACTION
// ============================================================

/**
 * Extract semantic themes from a collection of dreams using AI
 */
export const extractSemanticThemes = async (dreams: Dream[]): Promise<SemanticTheme[]> => {
    if (dreams.length < 3) {
        throw new Error('Need at least 3 dreams for theme extraction');
    }

    const dreamSummaries = dreams.slice(0, 20).map((d, i) =>
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
            model: 'gemini-2.5-flash',
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
        if (!rawJson) throw new Error('Empty response from theme extraction');

        const result = JSON.parse(rawJson) as { themes: SemanticTheme[] };
        return result.themes;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ml', { operation: 'extractSemanticThemes' });
        throw error;
    }
};

// ============================================================
// NARRATIVE PATTERN DETECTION  
// ============================================================

/**
 * Detect recurring narrative patterns across dreams
 */
export const detectNarrativePatterns = async (dreams: Dream[]): Promise<NarrativePattern[]> => {
    if (dreams.length < 5) {
        throw new Error('Need at least 5 dreams for pattern detection');
    }

    const dreamSummaries = dreams.slice(0, 30).map((d) =>
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
            model: 'gemini-2.5-flash',
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
        if (!rawJson) throw new Error('Empty response from pattern detection');

        const result = JSON.parse(rawJson) as { patterns: NarrativePattern[] };
        return result.patterns;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ml', { operation: 'detectNarrativePatterns' });
        throw error;
    }
};

// ============================================================
// SLEEP QUALITY PREDICTION
// ============================================================

/**
 * Predict tonight's sleep quality based on context
 */
export const predictSleepQuality = async (
    sleepAids: SleepAids | undefined,
    biometrics: Biometrics | undefined,
    recentDreams: Dream[]
): Promise<SleepPrediction> => {
    const context = {
        dayRating: sleepAids?.dayRating,
        dayNotes: sleepAids?.dayNotes,
        usedSound: !!sleepAids?.sound,
        usedRelaxation: !!sleepAids?.relaxation,
        breathingExercises: sleepAids?.breathingExercises?.length || 0,
        checklist: sleepAids?.checklist || [],
        sleepGoal: biometrics?.sleepGoal,
        recentQuality: recentDreams.slice(0, 7).map(d => d.sleepQuality).filter(Boolean),
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
2. Confidence in the prediction
3. Which factors are helping or hurting
4. Specific recommendations to improve tonight's sleep`;

    try {
        const ai = getAi();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
        if (!rawJson) throw new Error('Empty response from sleep prediction');

        return JSON.parse(rawJson) as SleepPrediction;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'ml', { operation: 'predictSleepQuality' });
        throw error;
    }
};

// ============================================================
// COMPREHENSIVE ML ANALYSIS
// ============================================================

/**
 * Generate a complete ML analysis report for a user's dreams
 */
export const generateMLAnalysis = async (dreams: Dream[]): Promise<MLAnalysisResult> => {
    if (dreams.length < 3) {
        throw new Error('Need at least 3 dreams for ML analysis');
    }

    logger.info(`Starting ML analysis for ${dreams.length} dreams`);

    // Run analyses in parallel for efficiency
    const [themes, patterns] = await Promise.all([
        extractSemanticThemes(dreams).catch(e => {
            logger.error('Theme extraction failed:', e);
            return [] as SemanticTheme[];
        }),
        dreams.length >= 5
            ? detectNarrativePatterns(dreams).catch(e => {
                logger.error('Pattern detection failed:', e);
                return [] as NarrativePattern[];
            })
            : Promise.resolve([] as NarrativePattern[])
    ]);

    // Analyze overall sentiment trend
    const recentDreams = dreams.slice(0, 5);
    const olderDreams = dreams.slice(5, 10);

    let sentimentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentDreams.length > 0 && olderDreams.length > 0) {
        // Simple heuristic based on sleep quality as proxy
        const recentAvg = recentDreams.filter(d => d.sleepQuality).reduce((s, d) => s + (d.sleepQuality || 0), 0) / recentDreams.length;
        const olderAvg = olderDreams.filter(d => d.sleepQuality).reduce((s, d) => s + (d.sleepQuality || 0), 0) / olderDreams.length;
        if (recentAvg > olderAvg + 0.5) sentimentTrend = 'improving';
        else if (recentAvg < olderAvg - 0.5) sentimentTrend = 'declining';
    }

    // Generate insights based on analysis
    const insights: string[] = [];
    const nextSteps: string[] = [];

    if (themes.length > 0) {
        const topTheme = themes[0];
        insights.push(`Your dreams frequently explore "${topTheme.name}" - ${topTheme.interpretation.slice(0, 100)}...`);
        if (topTheme.archetype) {
            nextSteps.push(`Explore the ${topTheme.archetype} archetype in your waking life through journaling or reflection.`);
        }
    }

    if (patterns.length > 0) {
        const unresolvedConflicts = patterns.filter(p => p.type === 'unresolved_conflict');
        if (unresolvedConflicts.length > 0) {
            insights.push(`Pattern detected: "${unresolvedConflicts[0].name}" appears ${unresolvedConflicts[0].frequency} times and may represent an unresolved issue.`);
            nextSteps.push(`Consider addressing "${unresolvedConflicts[0].name}" in your waking life to potentially resolve this recurring pattern.`);
        }
    }

    return {
        generatedAt: new Date().toISOString(),
        dreamCount: dreams.length,
        sentiment: {
            overall: {
                primary: 'mixed',
                confidence: 0.7,
                emotions: [],
                nuance: 'Complex emotional landscape',
                valence: 0,
                arousal: 0.5
            },
            trend: sentimentTrend,
            distribution: []
        },
        themes,
        patterns,
        insights,
        nextSteps
    };
};
