import { DreamSynthesis } from '../types';

export interface GlobalTrend {
    topic: string;
    percentage: number; // 0-100
    change: 'up' | 'down' | 'stable';
    sentiment: 'positive' | 'negative' | 'neutral';
}

export const getGlobalDreamTrends = (): GlobalTrend[] => {
    // In a real app, this would fetch from a backend API
    // aggregated from thousands of anonymous users.
    return [
        { topic: 'Flying', percentage: 42, change: 'up', sentiment: 'positive' },
        { topic: 'Water/Ocean', percentage: 28, change: 'stable', sentiment: 'neutral' },
        { topic: 'Being Chased', percentage: 15, change: 'down', sentiment: 'negative' },
        { topic: 'Late for Exam', percentage: 12, change: 'up', sentiment: 'negative' },
        { topic: 'Lucid Awareness', percentage: 8, change: 'up', sentiment: 'positive' },
    ];
};

export const getGlobalSleepStats = () => {
    return {
        avgSleepTime: '7h 12m',
        avgQuality: 3.8,
        activeDreamers: 12450
    };
};
