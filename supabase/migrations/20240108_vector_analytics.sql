-- Vector Analytics Migration: From Keywords to Embeddings
-- This migration enables semantic search and ML-powered analytics
-- Run in Supabase SQL Editor

-- 1. Enable pgvector extension for semantic embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create dreams table if not exists (with vector columns)
-- Note: If dreams table exists from local storage migration, alter it instead
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dreams') THEN
        CREATE TABLE public.dreams (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            dream_text TEXT NOT NULL,
            title TEXT,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
            ai_analysis JSONB,
            image_url TEXT,
            tags TEXT[],
            mood TEXT,
            sleep_aids JSONB,
            sleep_entry_id BIGINT,
            -- Vector Analytics Columns (NEW)
            embedding vector(768),           -- Gemini text-embedding-004 output
            sentiment_valence FLOAT,         -- -1.0 (Unpleasant) to 1.0 (Pleasant)
            sentiment_arousal FLOAT,         -- 0.0 (Calm) to 1.0 (Intense)
            lucidity_score INTEGER,          -- 0-100 probability of lucid dream
            analysis_tags TEXT[],            -- AI-extracted tags like ["Archetype: Shadow", "Symbol: Water"]
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- Add vector columns to existing table
        ALTER TABLE public.dreams
            ADD COLUMN IF NOT EXISTS embedding vector(768),
            ADD COLUMN IF NOT EXISTS sentiment_valence FLOAT,
            ADD COLUMN IF NOT EXISTS sentiment_arousal FLOAT,
            ADD COLUMN IF NOT EXISTS lucidity_score INTEGER,
            ADD COLUMN IF NOT EXISTS analysis_tags TEXT[];
    END IF;
END $$;

-- 3. Create index for vector similarity search (IVFFlat for performance)
-- Only create if at least 100 dreams with embeddings exist (for proper centroid calculation)
-- For smaller datasets, exact search is fine
CREATE INDEX IF NOT EXISTS idx_dreams_embedding ON public.dreams
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Create indexes for telemetry queries
CREATE INDEX IF NOT EXISTS idx_dreams_user_id ON public.dreams(user_id);
CREATE INDEX IF NOT EXISTS idx_dreams_timestamp ON public.dreams(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dreams_valence ON public.dreams(sentiment_valence) WHERE sentiment_valence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dreams_arousal ON public.dreams(sentiment_arousal) WHERE sentiment_arousal IS NOT NULL;

-- 5. Semantic Search Function: Find similar dreams using cosine similarity
CREATE OR REPLACE FUNCTION match_dreams(
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 5,
    user_id_input UUID DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    dream_text TEXT,
    title TEXT,
    timestamp TIMESTAMPTZ,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.dream_text,
        d.title,
        d.timestamp,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM public.dreams d
    WHERE
        (user_id_input IS NULL OR d.user_id = user_id_input)
        AND d.embedding IS NOT NULL
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 6. Get Dream Telemetry for Scatter Plot (Russell's Circumplex)
CREATE OR REPLACE FUNCTION get_dream_telemetry(
    user_id_input UUID,
    limit_count INT DEFAULT 100
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    timestamp TIMESTAMPTZ,
    valence FLOAT,
    arousal FLOAT,
    lucidity INTEGER,
    tags TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.timestamp,
        d.sentiment_valence,
        d.sentiment_arousal,
        d.lucidity_score,
        d.analysis_tags
    FROM public.dreams d
    WHERE
        d.user_id = user_id_input
        AND d.sentiment_valence IS NOT NULL
        AND d.sentiment_arousal IS NOT NULL
    ORDER BY d.timestamp DESC
    LIMIT limit_count;
END;
$$;

-- 7. Find Dreams by Emotional Quadrant (for filtering)
CREATE OR REPLACE FUNCTION get_dreams_by_quadrant(
    user_id_input UUID,
    quadrant TEXT -- 'high_energy_positive', 'high_energy_negative', 'low_energy_positive', 'low_energy_negative'
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    timestamp TIMESTAMPTZ,
    valence FLOAT,
    arousal FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.timestamp,
        d.sentiment_valence,
        d.sentiment_arousal
    FROM public.dreams d
    WHERE
        d.user_id = user_id_input
        AND d.sentiment_valence IS NOT NULL
        AND d.sentiment_arousal IS NOT NULL
        AND CASE
            WHEN quadrant = 'high_energy_positive' THEN d.sentiment_arousal > 0.5 AND d.sentiment_valence > 0
            WHEN quadrant = 'high_energy_negative' THEN d.sentiment_arousal > 0.5 AND d.sentiment_valence < 0
            WHEN quadrant = 'low_energy_positive' THEN d.sentiment_arousal <= 0.5 AND d.sentiment_valence > 0
            WHEN quadrant = 'low_energy_negative' THEN d.sentiment_arousal <= 0.5 AND d.sentiment_valence < 0
            ELSE TRUE
        END
    ORDER BY d.timestamp DESC;
END;
$$;

-- 8. Enable Row Level Security
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;

-- Users can only see their own dreams
DROP POLICY IF EXISTS "Users can read own dreams" ON public.dreams;
CREATE POLICY "Users can read own dreams" ON public.dreams
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own dreams
DROP POLICY IF EXISTS "Users can insert own dreams" ON public.dreams;
CREATE POLICY "Users can insert own dreams" ON public.dreams
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own dreams
DROP POLICY IF EXISTS "Users can update own dreams" ON public.dreams;
CREATE POLICY "Users can update own dreams" ON public.dreams
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own dreams
DROP POLICY IF EXISTS "Users can delete own dreams" ON public.dreams;
CREATE POLICY "Users can delete own dreams" ON public.dreams
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_dreams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_dreams_updated_at ON public.dreams;
CREATE TRIGGER update_dreams_updated_at
    BEFORE UPDATE ON public.dreams
    FOR EACH ROW
    EXECUTE FUNCTION update_dreams_updated_at();

-- 10. Grant access to authenticated users for RPC functions
GRANT EXECUTE ON FUNCTION match_dreams TO authenticated;
GRANT EXECUTE ON FUNCTION get_dream_telemetry TO authenticated;
GRANT EXECUTE ON FUNCTION get_dreams_by_quadrant TO authenticated;
