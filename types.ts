import type { ReactElement } from 'react';

export type Page = 'alarms' | 'sleep' | 'chronicle' | 'insights' | 'dream-detail' | 'privacy' | 'terms';

export interface Alarm {
    id: number;
    time: string;
    isActive: boolean;
    smartWake?: boolean; // If true, wake up during light sleep
    smartWindow?: number; // Minutes before alarm to check (default 30)
}

export interface SleepAids {
    sound?: string;
    soundDuration?: number; // Duration in minutes the soundscape was used
    volume?: number; // Volume level (0-1)
    relaxation?: string;
    checklist?: string[];
    dayRating?: number | null;
    dayNotes?: string;
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
}

// Moods for tracking emotional patterns
export type DreamMood = 'joyful' | 'peaceful' | 'anxious' | 'sad' | 'fearful' | 'confused' | 'neutral';

export interface DreamAnalysis {
    title: string;
    analysis: { title: string; content: string }[];
    integration: { title: string; content: string };
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

export type Soundscape =
    | { id: string; name: string; description: string; icon: ReactElement; type: 'noise'; params: NoiseParams; isPremium?: boolean }
    | { id: string; name: string; description: string; icon: ReactElement; type: 'binaural'; params: BinauralParams; isPremium?: boolean }
    | { id: string; name: string; description: string; icon: ReactElement; type: 'file'; params: FileParams; isPremium?: boolean };

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
    age: number | null;
    gender: string;
    avgSleep: number | null;
}

// Sync Types
export type SyncActionType = 'ADD_DREAM' | 'UPDATE_DREAM' | 'DELETE_DREAM' | 'ADD_ALARM' | 'UPDATE_ALARM' | 'DELETE_ALARM';

export interface SyncAction {
    id: string; // UUID
    type: SyncActionType;
    payload: any;
    timestamp: number;
    status: 'PENDING' | 'SYNCED' | 'FAILED';
    retryCount: number;
}

export type CoachPersonality = 'mystical' | 'scientific';
export type AnalysisPersonality = 'oneironaut' | 'jungian' | 'scientific';