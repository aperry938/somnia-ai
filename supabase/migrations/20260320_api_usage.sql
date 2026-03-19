-- API Usage Tracking & Server-Side Rate Limiting
-- Tracks all AI API calls per user for rate enforcement and cost monitoring

-- 1. Create api_usage table
CREATE TABLE IF NOT EXISTS public.api_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,           -- 'ai_analysis', 'ai_imagery', 'ai_chat', 'ai_synthesis', 'ai_embedding', 'crisis_detection'
    model TEXT,                       -- 'gemini-2.5-flash', 'gemini-2.5-pro', 'text-embedding-004'
    estimated_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for rate limit lookups and analytics
CREATE INDEX IF NOT EXISTS idx_api_usage_user_category_time
    ON public.api_usage(user_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at
    ON public.api_usage(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Users can insert their own usage records
DROP POLICY IF EXISTS "Users can insert own usage" ON public.api_usage;
CREATE POLICY "Users can insert own usage" ON public.api_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own usage (for client-side budget display)
DROP POLICY IF EXISTS "Users can read own usage" ON public.api_usage;
CREATE POLICY "Users can read own usage" ON public.api_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access (for admin analytics)
DROP POLICY IF EXISTS "Service role full access on api_usage" ON public.api_usage;
CREATE POLICY "Service role full access on api_usage" ON public.api_usage
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Rate limit check function
-- Returns whether user is within limits for a given category and time window
CREATE OR REPLACE FUNCTION check_user_rate_limit(
    user_id_input UUID,
    category_input TEXT,
    window_seconds INTEGER,
    max_requests INTEGER
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_count BIGINT,
    reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    window_start TIMESTAMPTZ;
    usage_count BIGINT;
BEGIN
    window_start := NOW() - (window_seconds || ' seconds')::INTERVAL;

    SELECT COUNT(*) INTO usage_count
    FROM public.api_usage
    WHERE api_usage.user_id = user_id_input
      AND api_usage.category = category_input
      AND api_usage.created_at >= window_start;

    RETURN QUERY SELECT
        (usage_count < max_requests) AS allowed,
        usage_count AS current_count,
        (window_start + (window_seconds || ' seconds')::INTERVAL) AS reset_at;
END;
$$;

-- 5. Usage summary function for analytics
CREATE OR REPLACE FUNCTION get_usage_summary(
    user_id_input UUID DEFAULT NULL,
    period_input TEXT DEFAULT 'month'
)
RETURNS TABLE (
    category TEXT,
    model TEXT,
    request_count BIGINT,
    total_tokens BIGINT,
    period_start TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    period_start_time TIMESTAMPTZ;
BEGIN
    -- Calculate period start
    IF period_input = 'day' THEN
        period_start_time := DATE_TRUNC('day', NOW());
    ELSIF period_input = 'week' THEN
        period_start_time := DATE_TRUNC('week', NOW());
    ELSE
        period_start_time := DATE_TRUNC('month', NOW());
    END IF;

    RETURN QUERY
    SELECT
        au.category,
        au.model,
        COUNT(*) AS request_count,
        COALESCE(SUM(au.estimated_tokens), 0) AS total_tokens,
        period_start_time AS period_start
    FROM public.api_usage au
    WHERE au.created_at >= period_start_time
      AND (user_id_input IS NULL OR au.user_id = user_id_input)
    GROUP BY au.category, au.model
    ORDER BY request_count DESC;
END;
$$;

-- 6. Cleanup function: remove entries older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_api_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.api_usage
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- 7. Permissions
GRANT SELECT, INSERT ON public.api_usage TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.api_usage_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION get_usage_summary TO authenticated;

COMMENT ON TABLE public.api_usage IS 'Tracks API usage per user for rate limiting and cost monitoring';
