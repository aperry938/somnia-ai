/**
 * Admin Analytics Service
 * Fetches aggregated usage data from Supabase for the superuser dashboard.
 */

import { logger } from './logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface UsageStat {
    category: string;
    model: string | null;
    request_count: number;
    total_tokens: number;
    period_start: string;
}

export interface UsageSummary {
    stats: UsageStat[];
    totalRequests: number;
    totalTokens: number;
    estimatedCostUsd: number;
}

// Model costs per 1K tokens (USD)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
    'gemini-2.5-flash': { input: 0.00015, output: 0.0006 },
    'gemini-2.5-pro': { input: 0.00125, output: 0.005 },
    'text-embedding-004': { input: 0.000025, output: 0 },
};

function getAuthToken(): string | null {
    try {
        const session = JSON.parse(localStorage.getItem('somnia_supabase_session') || '');
        return session?.access_token || null;
    } catch {
        return null;
    }
}

export async function fetchUsageSummary(period: 'day' | 'week' | 'month' = 'month'): Promise<UsageSummary> {
    const token = getAuthToken();
    if (!token || !SUPABASE_URL) {
        return { stats: [], totalRequests: 0, totalTokens: 0, estimatedCostUsd: 0 };
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_usage_summary`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ period_input: period }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const stats: UsageStat[] = await response.json();

        const totalRequests = stats.reduce((sum, s) => sum + Number(s.request_count), 0);
        const totalTokens = stats.reduce((sum, s) => sum + Number(s.total_tokens), 0);

        // Estimate cost per model
        let estimatedCostUsd = 0;
        for (const stat of stats) {
            const model = stat.model || 'gemini-2.5-flash';
            const costs = MODEL_COSTS[model] || { input: 0.00015, output: 0.0006 };
            // Assume 70% input, 30% output token distribution
            const inputTokens = Number(stat.total_tokens) * 0.7;
            const outputTokens = Number(stat.total_tokens) * 0.3;
            estimatedCostUsd += (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;
        }

        return { stats, totalRequests, totalTokens, estimatedCostUsd };
    } catch (error) {
        logger.error('[AdminAnalytics] Failed to fetch usage summary:', error);
        return { stats: [], totalRequests: 0, totalTokens: 0, estimatedCostUsd: 0 };
    }
}
