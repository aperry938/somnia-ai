import type { ReactElement } from 'react';

export type Page = 'alarms' | 'sleep' | 'chronicle' | 'insights' | 'dream-detail' | 'privacy' | 'terms' | 'profile' | 'success' | 'admin';

// Alarm purpose determines behavior when it rings
export type AlarmPurpose = 'sleep' | 'reminder';

export interface Alarm {
    id: number;
    time: string;
    isActive: boolean;
    days: number[]; // 0-6, where 0 is Sunday. Empty means "once".
    soundId?: string; // ID of the sound to play (default: 'progressive')
    smartWake?: boolean; // If true, wake up during light sleep
    smartWindow?: number; // Minutes before alarm to check (default 30)
    purpose?: AlarmPurpose; // 'sleep' shows dream flow, 'reminder' just dismisses (default: 'sleep')
    label?: string; // Optional label for reminder alarms
}

export interface SleepActivity {
    type: 'breathing' | 'sound' | 'relaxation';
    name: string;
    duration: number; // seconds
}

export interface SleepAids {
    sound?: string;
    soundDuration?: number; // Duration in minutes the soundscape was used
    volume?: number; // Volume level (0-1)
    relaxation?: string;
    relaxationDuration?: number; // Duration in minutes
    checklist?: string[];
    dayRating?: number | null;
    dayNotes?: string;
    breathingExercises?: SleepActivity[]; // Breathing exercises completed
    soundsPlayed?: SleepActivity[]; // Sounds/soundscapes played
    totalPrepTime?: number; // Total prep time in seconds
    sessionStartedAt?: string; // When the session started
}

export interface Dream {
    id: number;
    timestamp: string;
    dreamText: string;
    sleepQuality: number | null;
    title: string;
    imageUrl: string | null;
    aiAnalysis: DreamAnalysis | null;
    chatHistory: ChatMessage[];
    sleepAids?: SleepAids;
    tags?: string[];
    mood?: DreamMood; // Emotional tone of the dream
    sleepEntryId?: number; // Link to parent sleep entry (optional for migration)
}

// Moods for tracking emotional patterns
export type DreamMood = 'joyful' | 'peaceful' | 'anxious' | 'sad' | 'fearful' | 'confused' | 'neutral' | 'nostalgic' | 'hopeful';

export interface DreamAnalysis {
    title: string;
    analysis: { title: string; content: string }[];
    integration: { title: string; content: string };
    imagePrompt?: string; // Detailed prompt for external AI image generators
    telemetry?: DreamTelemetry; // ML-extracted metadata (NEW)
}

/**
 * DreamTelemetry: ML-extracted metadata for vector analytics
 * Replaces keyword-based analytics with AI-powered extraction
 */
export interface DreamTelemetry {
    valence: number;      // -1.0 (Negative/Unpleasant) to 1.0 (Positive/Pleasant)
    arousal: number;      // 0.0 (Calm) to 1.0 (Intense/Excited)
    lucidity: number;     // 0-100 probability this was a lucid dream
    tags: string[];       // AI-extracted semantic tags (e.g., "Archetype: Shadow", "Symbol: Water", "Theme: Transformation")
}

/**
 * DreamEmbedding: Vector representation for semantic search
 */
export interface DreamEmbedding {
    dreamId: number;
    embedding: number[];  // 768-dimensional vector from text-embedding-004
    generatedAt: string;
}

/**
 * SimilarDream: Result from semantic search
 */
export interface SimilarDream {
    id: number;
    dreamText: string;
    title: string;
    timestamp: string;
    similarity: number;   // 0-1 cosine similarity score
}

export interface ChatMessage {
    id: number;
    role: 'user' | 'model';
    parts: { text: string }[];
    isError?: boolean;
}

export interface NoiseParams {
    type: 'white' | 'pink' | 'brown';
}

export interface BinauralParams {
    base: number;
    diff: number;
}

export interface FileParams {
    src: string;
}

export interface SyntheticParams {
    type: 'ocean' | 'fireplace';
}

export interface RampParams {
    base: number; // Base carrier frequency (e.g., 110Hz)
}

export type Soundscape =
    | { id: string; name: string; description: string; icon: ReactElement; type: 'noise'; params: NoiseParams; isPremium?: boolean }
    | { id: string; name: string; description: string; icon: ReactElement; type: 'binaural'; params: BinauralParams; isPremium?: boolean }
    | { id: string; name: string; description: string; icon: ReactElement; type: 'file'; params: FileParams; isPremium?: boolean }
    | { id: string; name: string; description: string; icon: ReactElement; type: 'synthetic'; params: SyntheticParams; isPremium?: boolean }
    | { id: string; name: string; description: string; icon: ReactElement; type: 'ramp'; params: RampParams; isPremium?: boolean };

export interface GuidedRelaxation {
    id: string;
    name: string;
    description: string;
    icon: ReactElement;
}

export interface Achievement {
    name: string;
    unlocked: boolean;
    icon: ReactElement;
}

export type Theme = 'day' | 'night';

export interface DreamSynthesis {
    overallSummary: string;
    recurringThemes: {
        theme: string;
        description: string;
        exampleDreamIds: number[];
    }[];
}

export interface SleepHabitAnalysis {
    positiveCorrelations: {
        habit: string;
        insight: string;
    }[];
    negativeCorrelations: {
        habit: string;
        insight: string;
    }[];
    recommendations: string[];
}

export interface Biometrics {
    displayName?: string; // User's display name
    age: number | null;
    gender: string;
    avgSleep: number | null;
    occupation?: string;
    sleepGoal?: number; // Target hours of sleep
    wakeGoal?: string; // Preferred wake time (HH:MM)
}

// Sync Types
export type SyncActionType = 'ADD_DREAM' | 'UPDATE_DREAM' | 'DELETE_DREAM' | 'ADD_ALARM' | 'UPDATE_ALARM' | 'DELETE_ALARM';

export interface SyncAction {
    id: string; // UUID
    type: SyncActionType;
    payload: unknown;
    timestamp: number;
    status: 'PENDING' | 'SYNCED' | 'FAILED';
    retryCount: number;
}

export type CoachPersonality = 'mystical' | 'scientific';
export type AnalysisPersonality = 'oneironaut' | 'jungian' | 'scientific';

// Sleep Session - links alarm to sleep gateway data to dream (for active session tracking)
export interface SleepSession {
    id: number; // Session ID (timestamp)
    alarmId: number | null; // Linked alarm ID
    alarmTime: string | null; // Alarm time for display
    startedAt: string; // When session was created
    sleepGatewayData: SleepAids; // Pre-sleep data from Sleep Gateway
    isActive: boolean; // Whether this session is still active (not yet logged)
}

// Sleep Entry - a logged night of sleep (primary entity in Chronicle)
export interface SleepEntry {
    id: number;                     // Entry ID (timestamp when created)
    date: string;                   // Date of sleep (YYYY-MM-DD format)
    sleepQuality: number | null;    // 1-5 rating
    sleepAids?: SleepAids;          // Pre-sleep data (sound, relaxation, checklist, day rating)
    notes?: string;                 // Optional notes about the sleep
    dreamIds: number[];             // IDs of dreams logged for this session
    createdAt: string;              // ISO timestamp when entry was created
}

// ============================================================
// ML ANALYTICS TYPES
// ============================================================

/**
 * Nuanced sentiment analysis from ML model
 */
export interface MLSentiment {
    primary: 'positive' | 'negative' | 'neutral' | 'mixed';
    confidence: number; // 0-1
    emotions: MLEmotion[];
    nuance: string; // e.g., "bittersweet nostalgia", "anxious anticipation"
    valence: number; // -1 to 1 (negative to positive)
    arousal: number; // 0-1 (calm to intense)
}

export interface MLEmotion {
    emotion: string; // e.g., "joy", "fear", "wonder", "melancholy"
    intensity: number; // 0-1
    triggers?: string[]; // What in the dream triggered this
}

/**
 * Semantically extracted theme (not keyword-based)
 */
export interface SemanticTheme {
    name: string; // e.g., "Transformation & Rebirth"
    symbols: string[]; // Key symbols: ["butterfly", "cocoon", "metamorphosis"]
    interpretation: string; // Psychological meaning
    dreamIds: number[];
    strength: number; // 0-1 how prominent across dreams
    archetype?: string; // Jungian archetype if applicable
}

/**
 * Detected narrative patterns across dreams
 */
export interface NarrativePattern {
    type: 'recurring_character' | 'location_theme' | 'emotional_arc' | 'symbol_chain' | 'unresolved_conflict';
    name: string; // e.g., "The Unknown Guide"
    description: string;
    frequency: number; // How many times detected
    firstSeen: string; // ISO date
    lastSeen: string; // ISO date
    dreamIds: number[];
    evolution?: string; // How the pattern has changed over time
}

/**
 * Sleep quality prediction based on context
 */
export interface SleepPrediction {
    predictedQuality: number; // 1-5
    confidence: number; // 0-1
    factors: PredictionFactor[];
    recommendations: string[];
    rationale: string; // Why this prediction
}

export interface PredictionFactor {
    factor: string; // e.g., "Evening screen time"
    impact: 'positive' | 'negative' | 'neutral';
    weight: number; // 0-1 how much it affects prediction
    source: 'sleepAids' | 'dayRating' | 'historical' | 'temporal';
}

/**
 * Complete ML analysis result for a set of dreams
 */
export interface MLAnalysisResult {
    generatedAt: string;
    dreamCount: number;
    sentiment: {
        overall: MLSentiment;
        trend: 'improving' | 'declining' | 'stable';
        distribution: { sentiment: string; percentage: number }[];
    };
    themes: SemanticTheme[];
    patterns: NarrativePattern[];
    insights: string[]; // Key takeaways
    nextSteps: string[]; // Actionable recommendations
}