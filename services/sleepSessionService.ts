/**
 * Sleep Session Service
 * Tracks pre-sleep activities and links them to alarms
 */

// Types
export interface SleepActivity {
    type: 'breathing' | 'sound' | 'checklist';
    name: string;
    startTime: string;
    duration: number; // seconds
    completed: boolean;
}

export interface SleepSession {
    id: string;
    alarmId: string | null;
    alarmTime: string | null;
    startedAt: string;
    activities: SleepActivity[];
    checklistItems: string[];
    totalPrepTime: number; // seconds
    mood?: number;
    intention?: string;
    isSaved: boolean;
}

// Storage key
const ACTIVE_SESSION_KEY = 'somnia_active_sleep_session';
const COMPLETED_SESSIONS_KEY = 'somnia_completed_sleep_sessions';

// Generate unique ID
const generateId = (): string => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Start a new sleep session
 */
export const startSleepSession = (alarmId?: string, alarmTime?: string): SleepSession => {
    const session: SleepSession = {
        id: generateId(),
        alarmId: alarmId || null,
        alarmTime: alarmTime || null,
        startedAt: new Date().toISOString(),
        activities: [],
        checklistItems: [],
        totalPrepTime: 0,
        isSaved: false,
    };

    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    return session;
};

/**
 * Get the current active sleep session
 */
export const getActiveSession = (): SleepSession | null => {
    const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!stored) return null;

    try {
        return JSON.parse(stored);
    } catch {
        return null;
    }
};

/**
 * Check if there's an active session
 */
export const hasActiveSession = (): boolean => {
    return getActiveSession() !== null;
};

/**
 * Link an alarm to the current session
 */
export const linkAlarmToSession = (alarmId: string, alarmTime: string): void => {
    const session = getActiveSession();
    if (session) {
        session.alarmId = alarmId;
        session.alarmTime = alarmTime;
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    }
};

/**
 * Log a breathing exercise activity
 */
export const logBreathingActivity = (name: string, duration: number): void => {
    const session = getActiveSession();
    if (session) {
        session.activities.push({
            type: 'breathing',
            name,
            startTime: new Date().toISOString(),
            duration,
            completed: true,
        });
        session.totalPrepTime += duration;
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    }
};

/**
 * Log a sound/soundscape activity
 */
export const logSoundActivity = (name: string, duration: number): void => {
    const session = getActiveSession();
    if (session) {
        session.activities.push({
            type: 'sound',
            name,
            startTime: new Date().toISOString(),
            duration,
            completed: true,
        });
        session.totalPrepTime += duration;
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    }
};

/**
 * Log a checklist item completion
 */
export const logChecklistItem = (item: string): void => {
    const session = getActiveSession();
    if (session && !session.checklistItems.includes(item)) {
        session.checklistItems.push(item);
        session.activities.push({
            type: 'checklist',
            name: item,
            startTime: new Date().toISOString(),
            duration: 0,
            completed: true,
        });
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    }
};

/**
 * Update session mood and intention
 */
export const updateSessionReflection = (mood?: number, intention?: string): void => {
    const session = getActiveSession();
    if (session) {
        if (mood !== undefined) session.mood = mood;
        if (intention !== undefined) session.intention = intention;
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    }
};

/**
 * Get session summary for display
 */
export const getSessionSummary = (): {
    breathingExercises: SleepActivity[];
    soundsPlayed: SleepActivity[];
    checklistCompleted: string[];
    totalPrepMinutes: number;
    alarmTime: string | null;
} | null => {
    const session = getActiveSession();
    if (!session) return null;

    return {
        breathingExercises: session.activities.filter(a => a.type === 'breathing'),
        soundsPlayed: session.activities.filter(a => a.type === 'sound'),
        checklistCompleted: session.checklistItems,
        totalPrepMinutes: Math.round(session.totalPrepTime / 60),
        alarmTime: session.alarmTime,
    };
};

/**
 * Save session (mark as complete, ready to attach to dream log)
 */
export const saveSession = (): SleepSession | null => {
    const session = getActiveSession();
    if (session) {
        session.isSaved = true;
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
        return session;
    }
    return null;
};

/**
 * Complete and archive the session
 */
export const completeSession = (): SleepSession | null => {
    const session = getActiveSession();
    if (session) {
        // Archive to completed sessions
        const completedStr = localStorage.getItem(COMPLETED_SESSIONS_KEY);
        const completed: SleepSession[] = completedStr ? JSON.parse(completedStr) : [];
        completed.push(session);
        // Keep last 30 sessions
        if (completed.length > 30) completed.shift();
        localStorage.setItem(COMPLETED_SESSIONS_KEY, JSON.stringify(completed));

        // Clear active session
        localStorage.removeItem(ACTIVE_SESSION_KEY);
        return session;
    }
    return null;
};

/**
 * Clear active session without saving
 */
export const clearActiveSession = (): void => {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
};

/**
 * Check if user should be prompted for Sleep Gateway
 * Returns true if there's a recurring alarm within the next 10 hours
 */
export const shouldPromptSleepGateway = (alarms: Array<{ id: string; time: string; isActive: boolean; days?: number[] }>): {
    shouldPrompt: boolean;
    alarmId: string | null;
    alarmTime: string | null;
} => {
    const now = new Date();
    const tenHoursFromNow = new Date(now.getTime() + 10 * 60 * 60 * 1000);

    for (const alarm of alarms) {
        if (!alarm.isActive) continue;

        const [hours, minutes] = alarm.time.split(':').map(Number);
        const alarmToday = new Date(now);
        alarmToday.setHours(hours ?? 0, minutes ?? 0, 0, 0);

        // If alarm already passed today, check tomorrow
        if (alarmToday <= now) {
            alarmToday.setDate(alarmToday.getDate() + 1);
        }

        // Check if alarm is within next 10 hours
        if (alarmToday <= tenHoursFromNow && alarmToday > now) {
            // Check if today/tomorrow matches alarm days (if recurring)
            if (alarm.days && alarm.days.length > 0) {
                const alarmDay = alarmToday.getDay();
                if (!alarm.days.includes(alarmDay)) continue;
            }

            // Don't prompt if session already active
            if (hasActiveSession()) {
                return { shouldPrompt: false, alarmId: null, alarmTime: null };
            }

            return {
                shouldPrompt: true,
                alarmId: alarm.id,
                alarmTime: alarm.time,
            };
        }
    }

    return { shouldPrompt: false, alarmId: null, alarmTime: null };
};

/**
 * Format time for display (e.g., "7 min")
 */
export const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
};
