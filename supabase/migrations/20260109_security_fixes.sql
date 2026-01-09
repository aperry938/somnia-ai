-- ============================================================
-- SECURITY FIXES MIGRATION
-- Date: January 2026
-- Purpose: Address critical RLS vulnerability in match_dreams
-- ============================================================

-- 1. CRITICAL FIX: Secure match_dreams function
-- The previous version allowed omitting user_id_input, which
-- would search ALL users' dreams - a complete privacy breach.

-- Drop the old function
DROP FUNCTION IF EXISTS match_dreams(vector(768), FLOAT, INT, UUID);

-- Create secure version with mandatory user_id
CREATE OR REPLACE FUNCTION match_dreams(
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 5,
    user_id_input UUID  -- NOW REQUIRED, NOT OPTIONAL
)
RETURNS TABLE (
    id BIGINT,
    dream_text TEXT,
    title TEXT,
    timestamp TIMESTAMPTZ,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Execute with function owner's permissions
SET search_path = public
AS $$
BEGIN
    -- Validate user_id is provided
    IF user_id_input IS NULL THEN
        RAISE EXCEPTION 'user_id_input is required for security';
    END IF;

    -- Additional security check: ensure caller is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Ensure user can only query their own dreams
    IF auth.uid() != user_id_input THEN
        RAISE EXCEPTION 'Access denied: can only query own dreams';
    END IF;

    RETURN QUERY
    SELECT
        d.id,
        d.dream_text,
        d.title,
        d.timestamp,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM public.dreams d
    WHERE
        d.user_id = user_id_input
        AND d.embedding IS NOT NULL
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Restrict access to authenticated users only
REVOKE EXECUTE ON FUNCTION match_dreams FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION match_dreams FROM anon;
GRANT EXECUTE ON FUNCTION match_dreams TO authenticated;

-- 2. Add secure version of get_dream_telemetry with auth check
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Security: ensure user can only query their own data
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF auth.uid() != user_id_input THEN
        RAISE EXCEPTION 'Access denied: can only query own telemetry';
    END IF;

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

-- 3. Add secure version of get_dreams_by_quadrant with auth check
CREATE OR REPLACE FUNCTION get_dreams_by_quadrant(
    user_id_input UUID,
    quadrant TEXT
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    timestamp TIMESTAMPTZ,
    valence FLOAT,
    arousal FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Security: ensure user can only query their own data
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF auth.uid() != user_id_input THEN
        RAISE EXCEPTION 'Access denied: can only query own dreams';
    END IF;

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

-- Restrict access
REVOKE EXECUTE ON FUNCTION get_dream_telemetry FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_dream_telemetry FROM anon;
GRANT EXECUTE ON FUNCTION get_dream_telemetry TO authenticated;

REVOKE EXECUTE ON FUNCTION get_dreams_by_quadrant FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_dreams_by_quadrant FROM anon;
GRANT EXECUTE ON FUNCTION get_dreams_by_quadrant TO authenticated;

-- 4. Audit log table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write audit logs
CREATE POLICY "Service role manages audit logs" ON public.security_audit_log
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON public.security_audit_log(event_type);

-- Comment for documentation
COMMENT ON TABLE public.security_audit_log IS 'Audit trail for security-relevant events';
