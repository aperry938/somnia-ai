/**
 * Notification Preferences Service
 * Manages per-user email notification settings via Supabase.
 */

import { logger } from './logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface NotificationPreferences {
    emailWeeklyDigest: boolean;
    emailStreakBreak: boolean;
    emailAchievements: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
    emailWeeklyDigest: false,
    emailStreakBreak: false,
    emailAchievements: false,
};

function getAuthToken(): string | null {
    try {
        const session = JSON.parse(localStorage.getItem('somnia_supabase_session') || '');
        return session?.access_token || null;
    } catch {
        return null;
    }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
    const token = getAuthToken();
    if (!token || !SUPABASE_URL) return DEFAULT_PREFS;

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/notification_preferences?select=*&limit=1`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY || '',
                },
            }
        );

        if (!response.ok) return DEFAULT_PREFS;

        const data: unknown = await response.json();
        if (!Array.isArray(data) || data.length === 0) return DEFAULT_PREFS;

        const row = data[0] as Record<string, unknown>;
        return {
            emailWeeklyDigest: (row['email_weekly_digest'] as boolean) ?? false,
            emailStreakBreak: (row['email_streak_break'] as boolean) ?? false,
            emailAchievements: (row['email_achievements'] as boolean) ?? false,
        };
    } catch (error) {
        logger.error('[NotificationPrefs] Failed to fetch:', error);
        return DEFAULT_PREFS;
    }
}

export async function updateNotificationPreferences(
    prefs: Partial<NotificationPreferences>
): Promise<boolean> {
    const token = getAuthToken();
    if (!token || !SUPABASE_URL) return false;

    try {
        // Get user ID from token
        const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY || '' },
        });
        if (!userResponse.ok) return false;
        const user = (await userResponse.json()) as { id: string };

        const body: Record<string, unknown> = { user_id: user.id };
        if (prefs.emailWeeklyDigest !== undefined) body['email_weekly_digest'] = prefs.emailWeeklyDigest;
        if (prefs.emailStreakBreak !== undefined) body['email_streak_break'] = prefs.emailStreakBreak;
        if (prefs.emailAchievements !== undefined) body['email_achievements'] = prefs.emailAchievements;

        // Upsert: insert or update on conflict
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/notification_preferences`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY || '',
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates',
                },
                body: JSON.stringify(body),
            }
        );

        return response.ok;
    } catch (error) {
        logger.error('[NotificationPrefs] Failed to update:', error);
        return false;
    }
}
