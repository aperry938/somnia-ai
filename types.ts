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

// Manual sleep activity (for retroactive logging)
export interface ManualSleepActivity {
    type: 'soundscape' | 'breathing' | 'meditation' | 'reading' | 'other';
    name: string;
    durationMinutes: number;
}

// Lucid dreaming induction techniques
export type LucidTechnique = 'WILD' | 'MILD' | 'WBTB' | 'SSILD' | 'reality_check' | 'none';

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
    // Lucid Dreaming Tracking
    lucidTechnique?: LucidTechnique; // Technique used before sleep
    realityChecksPerformed?: number; // Number of reality checks done during the day
    wakeBackToBedDuration?: number; // WBTB: minutes stayed awake
    // Manual retroactive logging
    manualActivities?: ManualSleepActivity[]; // Activities logged after the fact
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
    embedding?: number[]; // Vector embedding for semantic similarity (Déjà Vu detection)
}

// Moods for tracking emotional patterns
export type DreamMood = 'joyful' | 'peaceful' | 'anxious' | 'sad' | 'fearful' | 'confused' | 'neutral' | 'nostalgic' | 'hopeful' | 'nightmare';

// Dream emotional telemetry (Russell's Circumplex Model)
export interface DreamTelemetry {
    valence: number;  // -1 to 1 (negative to positive emotion)
    arousal: number;  // 0 to 1 (low to high energy)
    lucidity?: number; // 0-100 lucidity score
    tags?: string[];  // Emotional/thematic tags
}

// Similar dream match result (for Déjà Vu detection)
export interface SimilarDream {
    id: number;
    title: string;
    dreamText: string;
    timestamp: string;
    similarity: number; // 0 to 1
}

export interface DreamAnalysis {
    title: string;
    analysis: { title: string; content: string }[];
    integration: { title: string; content: string };
    imagePrompt?: string; // Detailed prompt for external AI image generators
    telemetry?: DreamTelemetry; // Emotional valence/arousal for scatter plot
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
    type: 'rain' | 'ocean' | 'fireplace';
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

export type Theme = 'day' | 'night' | 'sleep';

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
    // Health platform synced data
    avgBedtime?: string; // Average bedtime (HH:MM) from health data
    avgWakeTime?: string; // Average wake time (HH:MM) from health data
    restingHr?: number; // Resting heart rate from health data
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

// Wake data - metrics from when the alarm rings
export interface WakeData {
    snoozeCount: number;           // How many times user snoozed
    timeToSilence: number;         // Seconds until alarm was silenced
    alertnessBoostUsed: boolean;   // Whether user used alertness boost sound
    alarmType: 'manual' | 'smart'; // How the alarm was triggered
}

// Sleep Session - links alarm to sleep gateway data to dream (for active session tracking)
export interface SleepSession {
    id: number; // Session ID (timestamp)
    alarmId: number | null; // Linked alarm ID
    alarmTime: string | null; // Alarm time for display
    alarmSoundId?: string; // Sound used for the alarm (e.g., 'somnia', 'gentle')
    startedAt: string; // When session was created
    sleepGatewayData: SleepAids; // Pre-sleep data from Sleep Gateway
    wakeData?: WakeData; // Wake metrics when alarm was dismissed
    isActive: boolean; // Whether this session is still active (not yet logged)
    sleepEntryId?: number; // ID of pre-created SleepEntry to update when alarm/dream completes
}

// Sleep Entry - a logged night of sleep (primary entity in Chronicle)
export interface SleepEntry {
    id: number;                     // Entry ID (timestamp when created)
    date: string;                   // Date of sleep (YYYY-MM-DD format)
    sleepQuality: number | null;    // 1-5 rating
    sleepAids?: SleepAids;          // Pre-sleep data (sound, relaxation, checklist, day rating)
    wakeData?: WakeData;            // Wake metrics (snooze, silence time, boost)
    alarmTime?: string;             // Alarm time that was set (HH:MM format)
    alarmSoundId?: string;          // Alarm sound used
    manuallyLogged?: boolean;       // Whether activities were logged retroactively
    notes?: string;                 // Optional notes about the sleep
    dreamIds: number[];             // IDs of dreams logged for this session
    createdAt: string;              // ISO timestamp when entry was created
}