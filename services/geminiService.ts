import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";
import { ChatMessage, Dream, DreamAnalysis, DreamSynthesis, SleepHabitAnalysis, SleepAids, Biometrics } from '../types';

let aiInstance: GoogleGenAI | null = null;

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

function createInitialAnalysisPrompt(dreamText: string, sleepAids?: SleepAids, biometrics?: Biometrics): string {
    let context = '';

    // Add biometrics context if available
    const hasBiometrics = biometrics && (biometrics.age || biometrics.gender || biometrics.avgSleep);
    if (hasBiometrics) {
        context += '\n--- DREAMER PROFILE ---\n';
        if (biometrics.age) {
            context += `Age: ${biometrics.age} years old\n`;
        }
        if (biometrics.gender) {
            context += `Gender: ${biometrics.gender}\n`;
        }
        if (biometrics.avgSleep) {
            context += `Average nightly sleep: ${biometrics.avgSleep} hours\n`;
        }
        context += 'Use this profile to personalize your interpretation—consider life stage, identity, and sleep patterns.\n---';
    }

    // Add pre-sleep context if available
    if (sleepAids) {
        const hasSleepContext = sleepAids.dayRating || sleepAids.dayNotes;
        if (hasSleepContext) {
            context += '\n--- PRE-SLEEP CONTEXT ---\n';
            if (sleepAids.dayRating) {
                context += `User's rating of their day: ${sleepAids.dayRating}/5\n`;
            }
            if (sleepAids.dayNotes) {
                context += `User's notes about their day: "${sleepAids.dayNotes}"\n`;
            }
            context += 'Use this context to inform your interpretation.\n---';
        }
    }

    return `
I. PRIME DIRECTIVE: PERSONA & PHILOSOPHY
You are The Oneironaut. Your function is to illuminate the hidden meaning within a user's dream. Your persona is that of a wise, deeply insightful, and compassionate guide. Your analysis must be an original work of insight built from a synthesis of psychology (Freud, Jung), mythology (Campbell), and somatic wisdom (van der Kolk, Solms). Do not cite these sources; embody their wisdom. Your goal is to provide an actionable insight that can be integrated into the user's waking life.

II. THE ALCHEMICAL METHOD: INSIGHT-FIRST SYNTHESIS
Your entire response must be a single, valid JSON object. For every dream event you reference, immediately deliver the core symbolic or psychological meaning.
- The JSON object must have three top-level keys: "title", "analysis", and "integration".
- "title": A short, evocative, and poetic title for the dream (e.g., "The Lion in the Hallway").
- "analysis" must be an array of objects. Each object represents a thematic insight and must have two keys: "title" (a short, insightful heading like "The Contaminated Homeland") and "content" (a paragraph of deep analysis). Generate 2-3 of these thematic insights.
- "integration" must be an object with two keys: "title" (always "The Integration") and "content" (a single, empowering, reflective question or a simple ritual for the user to integrate the dream's message).

III. ETHICAL MANDATE: DUTY OF CARE (ABSOLUTE PRIORITY)
If the dream narrative contains clear and explicit themes of self-harm, suicide, or severe, immediate danger to the user, you MUST DISREGARD the JSON format directive. Instead, respond with a single, compassionate paragraph in plain text. State your limitations as an AI, express concern for their well-being, and strongly recommend they speak with a qualified professional or a trusted person immediately.

IV. USER INPUT
Analyze the following dream according to the directives above.
${context}
--- USER-PROVIDED DREAM ---
${dreamText}
---`;
}

export const analyzeDream = async (dreamText: string, sleepAids?: SleepAids, biometrics?: Biometrics): Promise<DreamAnalysis> => {
    try {
        const ai = getAi();
        const prompt = createInitialAnalysisPrompt(dreamText, sleepAids, biometrics);
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
        return JSON.parse(rawJson) as DreamAnalysis;
    } catch (error) {
        console.error("Error analyzing dream:", error);
        throw new Error("Failed to analyze dream.");
    }
};

function createImagePrompt(dreamText: string): string {
    return `Photorealistic surrealism, a dream of: "${dreamText}". Ethereal lighting, atmospheric, emotionally resonant, sophisticated, cinematic, trending on artstation, style of Salvador Dalí and Remedios Varo.`;
}


export const generateDreamImage = async (dreamText: string): Promise<string> => {
    try {
        const ai = getAi();
        const prompt = createImagePrompt(dreamText);
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


const createCoachSystemPrompt = () => ({
    role: 'model' as const,
    parts: [{
        text: `You are an expert AI Sleep Coach named Somnia. Your tone is calm, empathetic, and scientific. You provide actionable, evidence-based advice for improving sleep hygiene and relaxation.
    Ethical Mandate: If the user expresses themes of severe psychological distress, gently state your limitations as an AI and recommend they speak with a qualified human professional.
    Start the conversation by gently asking how you can help the user prepare for a restful night.` }]
});

export const getCoachResponse = async (history: ChatMessage[]): Promise<string> => {
    const cleanHistory = history.map(({ id, isError, ...rest }) => rest);
    const chatHistory = [createCoachSystemPrompt(), ...cleanHistory];
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

const createDreamChatSystemPrompt = (dream: Dream) => ({
    role: 'model' as const,
    parts: [{
        text: `You are The Oneironaut. You are continuing a conversation with the user about their dream. Maintain your persona as a wise, insightful guide.
        Ethical Mandate: If the user expresses themes of severe psychological distress, gently state your limitations as an AI and recommend they speak with a qualified human professional.
        Dream: "${dream.dreamText}".
        Your Initial Analysis: ${JSON.stringify(dream.aiAnalysis)}.
        Continue the conversation by asking what they'd like to explore further, building on the initial analysis.`
    }]
});

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

const createDreamSynthesisPrompt = (dreams: Dream[]): string => {
    const dreamLog = dreams.map(d => `Dream ID ${d.id}:\n${d.dreamText}\n---`).join('\n');
    return `You are the Oneironaut, a master dream interpreter with knowledge of psychology, symbolism, and narrative structure. Analyze the following collection of dreams from a single user. Identify recurring themes, symbols, characters, emotions, and settings. Provide a concise overall summary of the user's dream landscape, and then detail 3-4 of the most prominent recurring themes. For each theme, provide a title, a deep interpretation of what it might signify for the dreamer, and list the IDs of dreams that exemplify this theme.
    
    Dream Collection:
    ${dreamLog}`;
};

export const synthesizeDreamThemes = async (dreams: Dream[]): Promise<DreamSynthesis> => {
    try {
        const ai = getAi();
        const prompt = createDreamSynthesisPrompt(dreams);
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using a more powerful model for deep analysis
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

const createSleepHabitAnalysisPrompt = (dreams: Dream[]): string => {
    const sleepData = dreams
        .filter(d => d.sleepQuality !== null)
        .map(d => {
            const soundInfo = d.sleepAids?.sound
                ? `${d.sleepAids.sound}${d.sleepAids.soundDuration ? ` (${d.sleepAids.soundDuration} min)` : ''}`
                : null;

            const aids = [
                soundInfo,
                d.sleepAids?.relaxation,
                ...(d.sleepAids?.checklist || [])
            ].filter(Boolean).join(', ');

            let dayContext = '';
            if (d.sleepAids?.dayRating) dayContext += ` Day Rating: ${d.sleepAids.dayRating}/5.`;
            if (d.sleepAids?.dayNotes) dayContext += ` Day Notes: "${d.sleepAids.dayNotes}".`;

            return `- Quality: ${d.sleepQuality}/5; Habits: [${aids || 'None Recorded'}]; Context: [${dayContext || 'None'}]`;
        }).join('\n');

    return `You are a data-driven sleep scientist. You have been provided with a log of a user's sleep preparation habits and their self-reported sleep quality (on a scale of 1-5, where 5 is best). The user has also provided context about their day (a 1-5 rating and notes). Your task is to analyze this data to find potential correlations between habits, daily context, and sleep quality. Do not make definitive medical claims. Frame your findings as observations from the provided data.
    
    Analyze the data to identify:
    1.  Positive Correlations: Habits or day-context that appear frequently on nights with high (4-5) sleep quality.
    2.  Negative Correlations: Habits or day-context that appear frequently on nights with low (1-2) sleep quality.
    3.  Actionable Recommendations: Based ONLY on these observed correlations, provide 2-3 personalized, actionable recommendations for the user to experiment with.
    
    User's Sleep Data:
    ${sleepData}`;
};

export const analyzeSleepHabits = async (dreams: Dream[]): Promise<SleepHabitAnalysis> => {
    try {
        const ai = getAi();
        const prompt = createSleepHabitAnalysisPrompt(dreams);
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
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