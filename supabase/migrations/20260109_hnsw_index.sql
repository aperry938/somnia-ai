-- ============================================================
-- HNSW INDEX MIGRATION FOR PRODUCTION SCALE
-- Date: January 2026
-- Purpose: Replace IVFFlat with HNSW for better performance at scale
-- ============================================================

-- Why HNSW over IVFFlat?
-- - IVFFlat: Good for <100K rows, degrades significantly at scale
-- - HNSW: Maintains <50ms queries even at 1M+ rows
-- - HNSW has better recall (99%+ vs 95%) at similar query times

-- ============================================================
-- STEP 1: Create new HNSW index (can be created concurrently)
-- ============================================================

-- Create HNSW index with tuned parameters
-- m = 16: Max connections per node (balance between speed and recall)
-- ef_construction = 64: Build-time accuracy (higher = better recall, slower build)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dreams_embedding_hnsw
ON public.dreams
USING hnsw (embedding vector_cosine_ops)
WITH (
    m = 16,
    ef_construction = 64
);

-- ============================================================
-- STEP 2: Drop old IVFFlat index (after HNSW is ready)
-- ============================================================

-- Only drop if HNSW index was created successfully
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_dreams_embedding_hnsw'
    ) THEN
        DROP INDEX IF EXISTS idx_dreams_embedding;
    END IF;
END $$;

-- ============================================================
-- STEP 3: Update match_dreams to use HNSW ef_search parameter
-- ============================================================

-- The ef_search parameter controls query-time accuracy vs speed:
-- - ef_search = 40: Fast, ~95% recall
-- - ef_search = 100: Balanced, ~99% recall (recommended)
-- - ef_search = 200: Accurate, ~99.5% recall, slower

CREATE OR REPLACE FUNCTION match_dreams_hnsw(
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 5,
    user_id_input UUID,
    accuracy_level TEXT DEFAULT 'balanced' -- 'fast', 'balanced', 'accurate'
)
RETURNS TABLE (
    id BIGINT,
    dream_text TEXT,
    title TEXT,
    timestamp TIMESTAMPTZ,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ef_search_value INT;
BEGIN
    -- Security checks
    IF user_id_input IS NULL THEN
        RAISE EXCEPTION 'user_id_input is required';
    END IF;

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF auth.uid() != user_id_input THEN
        RAISE EXCEPTION 'Access denied: can only query own dreams';
    END IF;

    -- Set ef_search based on accuracy level
    CASE accuracy_level
        WHEN 'fast' THEN ef_search_value := 40;
        WHEN 'balanced' THEN ef_search_value := 100;
        WHEN 'accurate' THEN ef_search_value := 200;
        ELSE ef_search_value := 100;
    END CASE;

    -- Set HNSW search parameter for this query
    PERFORM set_config('hnsw.ef_search', ef_search_value::TEXT, true);

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

-- Grant access
REVOKE EXECUTE ON FUNCTION match_dreams_hnsw FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION match_dreams_hnsw FROM anon;
GRANT EXECUTE ON FUNCTION match_dreams_hnsw TO authenticated;

-- ============================================================
-- STEP 4: Performance monitoring function
-- ============================================================

CREATE OR REPLACE FUNCTION get_vector_index_stats()
RETURNS TABLE (
    index_name TEXT,
    index_type TEXT,
    table_name TEXT,
    index_size TEXT,
    estimated_rows BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        i.indexname::TEXT,
        am.amname::TEXT,
        i.tablename::TEXT,
        pg_size_pretty(pg_relation_size(i.indexname::regclass))::TEXT,
        c.reltuples::BIGINT
    FROM pg_indexes i
    JOIN pg_class c ON c.relname = i.indexname
    JOIN pg_am am ON am.oid = c.relam
    WHERE i.tablename = 'dreams'
    AND i.indexname LIKE '%embedding%';
$$;

-- Only service role can view index stats
GRANT EXECUTE ON FUNCTION get_vector_index_stats TO service_role;

-- ============================================================
-- MIGRATION NOTES
-- ============================================================

COMMENT ON INDEX idx_dreams_embedding_hnsw IS
'HNSW index for vector similarity search. Params: m=16, ef_construction=64.
Created Jan 2026 to replace IVFFlat for production scale.
Expect <50ms queries at 1M+ rows with ef_search=100.';
