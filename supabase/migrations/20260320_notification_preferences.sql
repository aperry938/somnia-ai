-- Notification Preferences Table
-- Stores per-user email notification opt-in settings

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_weekly_digest BOOLEAN DEFAULT FALSE,
    email_streak_break BOOLEAN DEFAULT FALSE,
    email_achievements BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
DROP POLICY IF EXISTS "Users can read own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users can read own notification prefs" ON public.notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own preferences
DROP POLICY IF EXISTS "Users can insert own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users can insert own notification prefs" ON public.notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
DROP POLICY IF EXISTS "Users can update own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users can update own notification prefs" ON public.notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access on notification_preferences" ON public.notification_preferences;
CREATE POLICY "Service role full access on notification_preferences" ON public.notification_preferences
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_prefs_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_prefs_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_prefs_updated_at();

-- Permissions
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;

COMMENT ON TABLE public.notification_preferences IS 'Per-user email notification opt-in preferences';
