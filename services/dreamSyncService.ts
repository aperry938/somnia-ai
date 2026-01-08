/**
 * Dream Sync Service
 * Handles syncing dreams to Supabase for authenticated users.
 * Also manages vector embedding generation for semantic search.
 */

import { supabase } from './authService';
import { Dream } from '../types';
import { logger } from './logger';
import { checkRateLimit } from './rateLimitService';
import { getCurrentUser } from './authService';

// ============================================================
// TYPES
// ============================================================

interface SyncedDream {
    id: number;
    user_id: string;
    dream_text: string;
    title: string;
    timestamp: string;
    sleep_quality: number | null;
    mood: string | null;
    ai_analysis: Record<string, unknown> | null;
    embedding: number[] | null;
    sentiment_valence: number | null;
    sentiment_arousal: number | null;
    lucidity_score: number | null;
    analysis_tags: string[] | null;
    created_at: string;
    updated_at: string;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Check if user is authenticated and supabase is available
 */
const isAuthenticatedWithSupabase = async (): Promise<{ authenticated: boolean; userId: string | null }> => {
    if (!supabase) {
        return { authenticated: false, userId: null };
    }

    try {
        const user = await getCurrentUser();
        return { authenticated: !!user, userId: user?.id || null };
    } catch {
        return { authenticated: false, userId: null };
    }
};

/**
 * Convert local Dream to Supabase format
 */
const toSupabaseFormat = (dream: Dream, userId: string): Partial<SyncedDream> => ({
    id: dream.id,
    user_id: userId,
    dream_text: dream.dreamText,
    title: dream.title,
    timestamp: dream.timestamp,
    sleep_quality: dream.sleepQuality,
    mood: dream.mood || null,
    ai_analysis: dream.aiAnalysis as Record<string, unknown> | null,
    sentiment_valence: dream.aiAnalysis?.telemetry?.valence ?? null,
    sentiment_arousal: dream.aiAnalysis?.telemetry?.arousal ?? null,
    lucidity_score: dream.aiAnalysis?.telemetry?.lucidity ?? null,
    analysis_tags: dream.aiAnalysis?.telemetry?.tags ?? null,
});

/**
 * Convert Supabase row to local Dream format
 */
const toLocalFormat = (row: SyncedDream): Dream => ({
    id: row.id,
    dreamText: row.dream_text,
    title: row.title,
    timestamp: row.timestamp,
    sleepQuality: row.sleep_quality,
    mood: row.mood as Dream['mood'],
    aiAnalysis: row.ai_analysis as Dream['aiAnalysis'],
    imageUrl: null,
    chatHistory: [],
});

// ============================================================
// SYNC OPERATIONS
// ============================================================

/**
 * Sync a dream to Supabase (upsert)
 * Only works for authenticated users
 */
export const syncDream = async (dream: Dream): Promise<boolean> => {
    const { authenticated, userId } = await isAuthenticatedWithSupabase();

    if (!authenticated || !userId || !supabase) {
        logger.log('[DreamSync] Skipping sync - not authenticated');
        return false;
    }

    // Rate limit sync operations
    const rateCheck = checkRateLimit('sync', userId);
    if (!rateCheck.allowed) {
        logger.warn('[DreamSync] Rate limited, skipping sync');
        return false;
    }

    try {
        const supabaseData = toSupabaseFormat(dream, userId);

        const { error } = await supabase
            .from('dreams')
            .upsert(supabaseData, { onConflict: 'id' });

        if (error) {
            logger.error('[DreamSync] Sync failed:', error.message);
            return false;
        }

        logger.log('[DreamSync] Dream synced:', dream.id);
        return true;
    } catch (err) {
        logger.error('[DreamSync] Sync error:', err);
        return false;
    }
};

/**
 * Delete a dream from Supabase
 */
export const deleteSyncedDream = async (dreamId: number): Promise<boolean> => {
    const { authenticated, userId } = await isAuthenticatedWithSupabase();

    if (!authenticated || !userId || !supabase) {
        return false;
    }

    try {
        const { error } = await supabase
            .from('dreams')
            .delete()
            .eq('id', dreamId)
            .eq('user_id', userId);

        if (error) {
            logger.error('[DreamSync] Delete failed:', error.message);
            return false;
        }

        logger.log('[DreamSync] Dream deleted from cloud:', dreamId);
        return true;
    } catch (err) {
        logger.error('[DreamSync] Delete error:', err);
        return false;
    }
};

/**
 * Fetch all dreams for the current user from Supabase
 */
export const fetchDreamsFromCloud = async (): Promise<Dream[]> => {
    const { authenticated, userId } = await isAuthenticatedWithSupabase();

    if (!authenticated || !userId || !supabase) {
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('dreams')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false });

        if (error) {
            logger.error('[DreamSync] Fetch failed:', error.message);
            return [];
        }

        return (data || []).map(toLocalFormat);
    } catch (err) {
        logger.error('[DreamSync] Fetch error:', err);
        return [];
    }
};

/**
 * Sync all local dreams to Supabase (for initial sync after login)
 */
export const syncAllDreams = async (dreams: Dream[]): Promise<number> => {
    const { authenticated, userId } = await isAuthenticatedWithSupabase();

    if (!authenticated || !userId || !supabase) {
        logger.log('[DreamSync] Skipping bulk sync - not authenticated');
        return 0;
    }

    let synced = 0;

    // Sync in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < dreams.length; i += batchSize) {
        const batch = dreams.slice(i, i + batchSize);
        const batchData = batch.map(d => toSupabaseFormat(d, userId));

        try {
            const { error } = await supabase
                .from('dreams')
                .upsert(batchData, { onConflict: 'id' });

            if (!error) {
                synced += batch.length;
            } else {
                logger.error('[DreamSync] Batch sync error:', error.message);
            }
        } catch (err) {
            logger.error('[DreamSync] Batch sync failed:', err);
        }

        // Small delay between batches
        if (i + batchSize < dreams.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    logger.log(`[DreamSync] Bulk sync complete: ${synced}/${dreams.length} dreams`);
    return synced;
};

// ============================================================
// EMBEDDING GENERATION (for semantic search)
// ============================================================

/**
 * Generate embedding for a dream text using Gemini
 * This is called after dream is synced
 */
export const generateAndStoreEmbedding = async (dreamId: number, dreamText: string): Promise<boolean> => {
    const { authenticated, userId } = await isAuthenticatedWithSupabase();

    if (!authenticated || !userId || !supabase) {
        return false;
    }

    // Skip if text is too short
    if (dreamText.length < 50) {
        logger.log('[DreamSync] Skipping embedding - text too short');
        return false;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        logger.warn('[DreamSync] No Gemini API key for embeddings');
        return false;
    }

    try {
        // Call Gemini embedding API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: { parts: [{ text: dreamText }] },
                    taskType: 'SEMANTIC_SIMILARITY',
                }),
            }
        );

        if (!response.ok) {
            logger.error('[DreamSync] Embedding API error:', response.status);
            return false;
        }

        const data = await response.json();
        const embedding = data?.embedding?.values;

        if (!embedding || !Array.isArray(embedding)) {
            logger.error('[DreamSync] Invalid embedding response');
            return false;
        }

        // Store embedding in Supabase
        const { error } = await supabase
            .from('dreams')
            .update({ embedding })
            .eq('id', dreamId)
            .eq('user_id', userId);

        if (error) {
            logger.error('[DreamSync] Embedding storage failed:', error.message);
            return false;
        }

        logger.log('[DreamSync] Embedding stored for dream:', dreamId);
        return true;
    } catch (err) {
        logger.error('[DreamSync] Embedding error:', err);
        return false;
    }
};

/**
 * Find similar dreams using vector similarity search
 */
export const findSimilarDreams = async (
    dreamText: string,
    threshold: number = 0.75,
    limit: number = 5
): Promise<Dream[]> => {
    const { authenticated, userId } = await isAuthenticatedWithSupabase();

    if (!authenticated || !userId || !supabase) {
        return [];
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        return [];
    }

    try {
        // Generate embedding for query text
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: { parts: [{ text: dreamText }] },
                    taskType: 'SEMANTIC_SIMILARITY',
                }),
            }
        );

        if (!response.ok) return [];

        const data = await response.json();
        const queryEmbedding = data?.embedding?.values;
        if (!queryEmbedding) return [];

        // Call Supabase RPC function for similarity search
        const { data: matches, error } = await supabase.rpc('match_dreams', {
            query_embedding: queryEmbedding,
            match_threshold: threshold,
            match_count: limit,
            user_id_input: userId,
        });

        if (error) {
            logger.error('[DreamSync] Similarity search failed:', error.message);
            return [];
        }

        return (matches || []).map((m: { id: number; dream_text: string; title: string; dream_timestamp: string }) => ({
            id: m.id,
            dreamText: m.dream_text,
            title: m.title,
            timestamp: m.dream_timestamp,
            sleepQuality: null,
            imageUrl: null,
            aiAnalysis: null,
            chatHistory: [],
        }));
    } catch (err) {
        logger.error('[DreamSync] Similarity search error:', err);
        return [];
    }
};
