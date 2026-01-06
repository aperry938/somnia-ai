import { DreamSynthesis } from '../types';

export type TrendPeriod = 'today' | 'week' | 'month' | 'all-time';

export interface GlobalTrend {
    topic: string;
    percentage: number; // 0-100
    change: 'up' | 'down' | 'stable';
    sentiment: 'positive' | 'negative' | 'neutral';
}

export interface GlobalStats {
    avgSleepTime: string;
    avgQuality: number;
    activeDreamers: number;
}

// Mock data for different time periods
// In production, this would fetch from a backend API
export const getGlobalDreamTrends = (period: TrendPeriod = 'week'): GlobalTrend[] => {
    const trendsData: Record<TrendPeriod, GlobalTrend[]> = {
        'today': [
            { topic: 'Flying', percentage: 38, change: 'up', sentiment: 'positive' },
            { topic: 'Work Stress', percentage: 31, change: 'up', sentiment: 'negative' },
            { topic: 'Family', percentage: 22, change: 'stable', sentiment: 'positive' },
            { topic: 'Water/Ocean', percentage: 18, change: 'down', sentiment: 'neutral' },
            { topic: 'Being Late', percentage: 14, change: 'up', sentiment: 'negative' },
        ],
        'week': [
            { topic: 'Flying', percentage: 42, change: 'up', sentiment: 'positive' },
            { topic: 'Water/Ocean', percentage: 28, change: 'stable', sentiment: 'neutral' },
            { topic: 'Being Chased', percentage: 15, change: 'down', sentiment: 'negative' },
            { topic: 'Late for Exam', percentage: 12, change: 'up', sentiment: 'negative' },
            { topic: 'Lucid Awareness', percentage: 8, change: 'up', sentiment: 'positive' },
        ],
        'month': [
            { topic: 'Flying', percentage: 45, change: 'stable', sentiment: 'positive' },
            { topic: 'Falling', percentage: 32, change: 'up', sentiment: 'negative' },
            { topic: 'Water/Ocean', percentage: 30, change: 'up', sentiment: 'neutral' },
            { topic: 'Being Chased', percentage: 21, change: 'stable', sentiment: 'negative' },
            { topic: 'Lucid Awareness', percentage: 11, change: 'up', sentiment: 'positive' },
        ],
        'all-time': [
            { topic: 'Flying', percentage: 48, change: 'stable', sentiment: 'positive' },
            { topic: 'Water/Ocean', percentage: 35, change: 'stable', sentiment: 'neutral' },
            { topic: 'Being Chased', percentage: 28, change: 'stable', sentiment: 'negative' },
            { topic: 'Falling', percentage: 24, change: 'stable', sentiment: 'negative' },
            { topic: 'Lost/Searching', percentage: 19, change: 'stable', sentiment: 'neutral' },
        ],
    };
    return trendsData[period];
};

export const getGlobalSleepStats = (period: TrendPeriod = 'week'): GlobalStats => {
    const statsData: Record<TrendPeriod, GlobalStats> = {
        'today': {
            avgSleepTime: '7h 08m',
            avgQuality: 3.7,
            activeDreamers: 3240
        },
        'week': {
            avgSleepTime: '7h 12m',
            avgQuality: 3.8,
            activeDreamers: 12450
        },
        'month': {
            avgSleepTime: '7h 18m',
            avgQuality: 3.9,
            activeDreamers: 45820
        },
        'all-time': {
            avgSleepTime: '7h 14m',
            avgQuality: 3.85,
            activeDreamers: 128500
        },
    };
    return statsData[period];
};
