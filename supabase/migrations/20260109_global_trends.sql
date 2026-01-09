-- Global Dream Trends: Privacy-Preserving Aggregation
-- Enables anonymous aggregation of dream themes/moods for global insights
-- Users must opt-in to share data for global trends

-- 1. Add opt-in column to user profiles (or dreams table)
-- Users must explicitly consent to have their dreams included in global stats
ALTER TABLE public.dreams
    ADD COLUMN IF NOT EXISTS share_in_global_trends BOOLEAN DEFAULT FALSE;

-- 2. Create global_trends_cache table for pre-computed aggregations
-- Refreshed periodically by cron job to avoid expensive real-time queries
CREATE TABLE IF NOT EXISTS public.global_trends_cache (
    id SERIAL PRIMARY KEY,
    period TEXT NOT NULL, -- 'today', 'week', 'month', 'all-time'
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    trends JSONB NOT NULL, -- Array of {topic, percentage, change, sentiment}
    stats JSONB NOT NULL   -- {avgSleepTime, avgQuality, activeDreamers}
);

-- Index for fast lookups by period
CREATE INDEX IF NOT EXISTS idx_global_trends_period ON public.global_trends_cache(period);

-- 3. Function to compute global tag/theme trends
-- Only includes dreams where user has opted in
CREATE OR REPLACE FUNCTION compute_global_tag_trends(
    time_period TEXT DEFAULT 'week'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    start_date TIMESTAMPTZ;
    prev_start_date TIMESTAMPTZ;
    result JSONB;
BEGIN
    -- Determine date range
    CASE time_period
        WHEN 'today' THEN
            start_date := DATE_TRUNC('day', NOW());
            prev_start_date := start_date - INTERVAL '1 day';
        WHEN 'week' THEN
            start_date := NOW() - INTERVAL '7 days';
            prev_start_date := start_date - INTERVAL '7 days';
        WHEN 'month' THEN
            start_date := NOW() - INTERVAL '30 days';
            prev_start_date := start_date - INTERVAL '30 days';
        ELSE -- 'all-time'
            start_date := '1970-01-01'::TIMESTAMPTZ;
            prev_start_date := '1970-01-01'::TIMESTAMPTZ;
    END CASE;

    -- Aggregate tags from opted-in dreams
    WITH current_tags AS (
        SELECT
            LOWER(TRIM(unnest(tags))) AS tag,
            COUNT(*) AS tag_count
        FROM public.dreams
        WHERE
            share_in_global_trends = TRUE
            AND timestamp >= start_date
            AND tags IS NOT NULL
        GROUP BY LOWER(TRIM(unnest(tags)))
    ),
    previous_tags AS (
        SELECT
            LOWER(TRIM(unnest(tags))) AS tag,
            COUNT(*) AS tag_count
        FROM public.dreams
        WHERE
            share_in_global_trends = TRUE
            AND timestamp >= prev_start_date
            AND timestamp < start_date
            AND tags IS NOT NULL
        GROUP BY LOWER(TRIM(unnest(tags)))
    ),
    total_dreams AS (
        SELECT COUNT(DISTINCT id) AS total
        FROM public.dreams
        WHERE share_in_global_trends = TRUE AND timestamp >= start_date
    ),
    tag_trends AS (
        SELECT
            c.tag AS topic,
            ROUND((c.tag_count::NUMERIC / NULLIF(t.total, 0) * 100)::NUMERIC, 1) AS percentage,
            CASE
                WHEN p.tag_count IS NULL THEN 'up'
                WHEN c.tag_count > p.tag_count * 1.1 THEN 'up'
                WHEN c.tag_count < p.tag_count * 0.9 THEN 'down'
                ELSE 'stable'
            END AS change,
            'neutral' AS sentiment -- Can be enhanced with sentiment analysis
        FROM current_tags c
        CROSS JOIN total_dreams t
        LEFT JOIN previous_tags p ON c.tag = p.tag
        ORDER BY c.tag_count DESC
        LIMIT 10
    )
    SELECT COALESCE(jsonb_agg(row_to_json(tag_trends)), '[]'::JSONB)
    INTO result
    FROM tag_trends;

    RETURN result;
END;
$$;

-- 4. Function to compute global mood trends
CREATE OR REPLACE FUNCTION compute_global_mood_trends(
    time_period TEXT DEFAULT 'week'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    start_date TIMESTAMPTZ;
    result JSONB;
BEGIN
    CASE time_period
        WHEN 'today' THEN start_date := DATE_TRUNC('day', NOW());
        WHEN 'week' THEN start_date := NOW() - INTERVAL '7 days';
        WHEN 'month' THEN start_date := NOW() - INTERVAL '30 days';
        ELSE start_date := '1970-01-01'::TIMESTAMPTZ;
    END CASE;

    WITH mood_counts AS (
        SELECT
            mood,
            COUNT(*) AS mood_count,
            AVG(sentiment_valence) AS avg_valence
        FROM public.dreams
        WHERE
            share_in_global_trends = TRUE
            AND timestamp >= start_date
            AND mood IS NOT NULL
        GROUP BY mood
    ),
    total AS (
        SELECT SUM(mood_count) AS total FROM mood_counts
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'topic', m.mood,
        'percentage', ROUND((m.mood_count::NUMERIC / NULLIF(t.total, 0) * 100)::NUMERIC, 1),
        'change', 'stable',
        'sentiment', CASE
            WHEN m.avg_valence > 0.3 THEN 'positive'
            WHEN m.avg_valence < -0.3 THEN 'negative'
            ELSE 'neutral'
        END
    ) ORDER BY m.mood_count DESC), '[]'::JSONB)
    INTO result
    FROM mood_counts m
    CROSS JOIN total t;

    RETURN result;
END;
$$;

-- 5. Function to compute global sleep stats
CREATE OR REPLACE FUNCTION compute_global_sleep_stats(
    time_period TEXT DEFAULT 'week'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    start_date TIMESTAMPTZ;
    result JSONB;
BEGIN
    CASE time_period
        WHEN 'today' THEN start_date := DATE_TRUNC('day', NOW());
        WHEN 'week' THEN start_date := NOW() - INTERVAL '7 days';
        WHEN 'month' THEN start_date := NOW() - INTERVAL '30 days';
        ELSE start_date := '1970-01-01'::TIMESTAMPTZ;
    END CASE;

    SELECT jsonb_build_object(
        'avgSleepTime', '7h 14m', -- Placeholder - need sleep duration in schema
        'avgQuality', COALESCE(ROUND(AVG(sleep_quality)::NUMERIC, 1), 3.5),
        'activeDreamers', COUNT(DISTINCT user_id)
    )
    INTO result
    FROM public.dreams
    WHERE
        share_in_global_trends = TRUE
        AND timestamp >= start_date;

    RETURN result;
END;
$$;

-- 6. Master function to get or compute global trends
CREATE OR REPLACE FUNCTION get_global_trends(
    time_period TEXT DEFAULT 'week'
)
RETURNS TABLE (
    trends JSONB,
    stats JSONB,
    cached_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cached_record RECORD;
    cache_ttl INTERVAL;
BEGIN
    -- Set cache TTL based on period
    CASE time_period
        WHEN 'today' THEN cache_ttl := INTERVAL '15 minutes';
        WHEN 'week' THEN cache_ttl := INTERVAL '1 hour';
        WHEN 'month' THEN cache_ttl := INTERVAL '6 hours';
        ELSE cache_ttl := INTERVAL '24 hours';
    END CASE;

    -- Check cache
    SELECT * INTO cached_record
    FROM public.global_trends_cache
    WHERE period = time_period
    AND computed_at > NOW() - cache_ttl
    ORDER BY computed_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT cached_record.trends, cached_record.stats, cached_record.computed_at;
    ELSE
        -- Compute fresh trends
        INSERT INTO public.global_trends_cache (period, trends, stats)
        VALUES (
            time_period,
            compute_global_tag_trends(time_period),
            compute_global_sleep_stats(time_period)
        )
        RETURNING global_trends_cache.trends, global_trends_cache.stats, global_trends_cache.computed_at
        INTO cached_record;

        RETURN QUERY SELECT cached_record.trends, cached_record.stats, cached_record.computed_at;
    END IF;
END;
$$;

-- 7. Grant access to authenticated and anonymous users (public data)
GRANT EXECUTE ON FUNCTION get_global_trends TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_trends TO anon;

-- Public read access to cached trends (no individual user data exposed)
ALTER TABLE public.global_trends_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read global trends" ON public.global_trends_cache
    FOR SELECT USING (true);

-- 8. Helper function for users to opt-in/out
CREATE OR REPLACE FUNCTION set_global_trends_opt_in(opt_in BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.dreams
    SET share_in_global_trends = opt_in
    WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION set_global_trends_opt_in TO authenticated;

-- 9. Cleanup old cache entries (keep last 10 per period)
CREATE OR REPLACE FUNCTION cleanup_global_trends_cache()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.global_trends_cache
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY period ORDER BY computed_at DESC) as rn
            FROM public.global_trends_cache
        ) sub
        WHERE rn <= 10
    );
END;
$$;
