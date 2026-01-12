-- Dreams Table Schema
-- Core table for storing user dreams with global trends support

-- 1. Create dreams table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.dreams (
    id BIGINT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dream_text TEXT NOT NULL,
    sleep_quality INTEGER CHECK (sleep_quality IS NULL OR (sleep_quality >= 1 AND sleep_quality <= 5)),
    title TEXT NOT NULL DEFAULT 'Untitled Dream',
    image_url TEXT,
    ai_analysis JSONB,
    tags TEXT[] DEFAULT '{}',
    mood TEXT,
    sleep_entry_id BIGINT,
    embedding vector(768), -- For semantic similarity (Deja Vu) - Gemini text-embedding-004
    -- Global Trends fields
    share_in_global_trends BOOLEAN DEFAULT FALSE,
    user_region TEXT,
    user_country TEXT,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_dreams_user_id ON public.dreams(user_id);
CREATE INDEX IF NOT EXISTS idx_dreams_timestamp ON public.dreams(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dreams_user_timestamp ON public.dreams(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dreams_sleep_entry ON public.dreams(sleep_entry_id);

-- Global trends indexes (partial for opted-in dreams only)
CREATE INDEX IF NOT EXISTS idx_dreams_global_trends ON public.dreams(share_in_global_trends)
    WHERE share_in_global_trends = TRUE;
CREATE INDEX IF NOT EXISTS idx_dreams_country_trends ON public.dreams(user_country)
    WHERE share_in_global_trends = TRUE AND user_country IS NOT NULL;

-- 3. Enable Row Level Security
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;

-- Users can read their own dreams
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

-- Service role has full access (for sync operations)
DROP POLICY IF EXISTS "Service role full access" ON public.dreams;
CREATE POLICY "Service role full access" ON public.dreams
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Auto-update updated_at timestamp
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

-- 5. Function to compute top dream by country
CREATE OR REPLACE FUNCTION get_country_top_dreams()
RETURNS TABLE (
    country TEXT,
    country_code TEXT,
    top_dream TEXT,
    dreamers BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH country_tag_counts AS (
        SELECT
            d.user_country,
            LOWER(TRIM(unnest(d.tags))) AS tag,
            COUNT(*) AS tag_count,
            COUNT(DISTINCT d.user_id) AS unique_dreamers
        FROM public.dreams d
        WHERE
            d.share_in_global_trends = TRUE
            AND d.user_country IS NOT NULL
            AND d.tags IS NOT NULL
            AND d.timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY d.user_country, LOWER(TRIM(unnest(d.tags)))
    ),
    ranked_tags AS (
        SELECT
            user_country,
            tag,
            tag_count,
            unique_dreamers,
            ROW_NUMBER() OVER (PARTITION BY user_country ORDER BY tag_count DESC) AS rn
        FROM country_tag_counts
    )
    SELECT
        rt.user_country AS country,
        UPPER(LEFT(rt.user_country, 2)) AS country_code, -- Simplified country code
        INITCAP(rt.tag) AS top_dream,
        rt.unique_dreamers AS dreamers
    FROM ranked_tags rt
    WHERE rt.rn = 1
    ORDER BY rt.unique_dreamers DESC
    LIMIT 12;
END;
$$;

GRANT EXECUTE ON FUNCTION get_country_top_dreams TO authenticated;
GRANT EXECUTE ON FUNCTION get_country_top_dreams TO anon;

-- 6. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dreams TO authenticated;
GRANT SELECT ON public.dreams TO anon; -- For global trends aggregation only

COMMENT ON TABLE public.dreams IS 'User dream entries with optional anonymous sharing for global trends';
COMMENT ON COLUMN public.dreams.share_in_global_trends IS 'User consent to include dream themes in anonymous global aggregation';
COMMENT ON COLUMN public.dreams.user_country IS 'Country for regional trend analysis (only used if share_in_global_trends is true)';
