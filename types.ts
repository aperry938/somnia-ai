import type { ReactElement } from 'react';

export type Page = 'alarms' | 'sleep' | 'chronicle' | 'insights' | 'dream-detail';

export interface Alarm {
    id: number;
    time: string;
    isActive: boolean;
}

export interface SleepAids {
    sound?: string;
    soundDuration?: number; // Duration in minutes the soundscape was used
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
}

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

export interface Soundscape {
    id: string;
    name: string;
    description: string;
    icon: ReactElement;
    type: 'noise' | 'binaural' | 'file';
    params: any;
}

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