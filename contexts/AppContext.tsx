import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { Alarm, Dream, SleepAids, Biometrics, Theme, CoachPersonality, AnalysisPersonality, DreamMood, SleepSession, AlarmPurpose, SleepEntry, WakeData } from '../types';

export type ArtStyle = 'surreal' | 'watercolor' | 'oil-painting' | 'anime' | 'photorealistic' | 'abstract' | 'fantasy' | 'minimalist';
import { enqueueAction } from '../services/syncService';
import { cacheDreamTitle } from '../services/geminiService';
import { logger } from '../services/logger';
import * as NativeAlarm from '../services/nativeAlarmService';
import { getGlobalTrendsPrefs } from '../services/dreamTrendsService';

/**
 * SECURITY FIX: Generate cryptographically secure random ID
 * Uses crypto.getRandomValues for unpredictable IDs instead of Date.now()
 * Returns a positive integer in the safe integer range
 */
const generateSecureId = (): number => {
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    // Combine two 32-bit values to create a larger random number
    // Use bitwise operations to ensure positive number in safe integer range
    return Math.abs(((array[0] ?? 0) * 0x100000000 + (array[1] ?? 0)) % Number.MAX_SAFE_INTEGER);
};

interface AppContextType {
    alarms: Alarm[];
    dreams: Dream[];
    biometrics: Biometrics;
    activeSleepAids: SleepAids;
    pendingSleepData: SleepAids | null;
    // Sleep Session Management
    activeSleepSession: SleepSession | null;
    startSleepSession: (alarmId?: number) => void;
    ensureSleepSession: () => void; // Creates session if none exists (for soundscape auto-start)
    updateSleepSessionData: (data: Partial<SleepAids>) => void;
    logSoundActivity: (name: string, durationSeconds: number) => void;
    logBreathingActivity: (name: string, durationSeconds: number) => void;
    saveWakeData: (wakeData: WakeData) => void;
    finalizeSleepSession: (options?: { alertnessBoostUsed?: boolean }) => void;
    createSleepEntryForSession: () => number | null; // Creates entry and links to session
    clearSleepSession: () => void;
    getNextActiveAlarm: () => Alarm | null;
    addAlarm: (time: string, smartWake: boolean, days?: number[], soundId?: string, purpose?: AlarmPurpose, label?: string) => number;
    updateAlarm: (id: number, time: string, smartWake: boolean, days?: number[], soundId?: string, purpose?: AlarmPurpose, label?: string) => void;
    toggleAlarmActive: (id: number) => void;
    deleteAlarm: (id: number) => void;
    addDream: (dreamText: string, sleepQuality: number | null, mood?: DreamMood) => number;
    addPastDream: (dreamText: string, sleepQuality: number | null, mood: DreamMood | undefined, timestamp: string) => number;
    updateDream: (updatedDream: Partial<Dream> & { id: number }) => void;
    getDreamById: (id: number) => Dream | undefined;
    deleteDream: (id: number) => void;
    importDreams: (dreams: Dream[]) => void;
    setActiveSleepAid: (type: keyof SleepAids, value: string | null) => void;
    clearActiveSleepAids: () => void;
    setPendingSleepData: (data: SleepAids | null) => void;
    setBiometrics: (data: Biometrics) => void;
    themeOverride: Theme | 'auto';
    setThemeOverride: (theme: Theme | 'auto') => void;
    isScribeOpen: boolean;
    setIsScribeOpen: (isOpen: boolean) => void;
    coachPersonality: CoachPersonality;
    setCoachPersonality: (personality: CoachPersonality) => void;
    volume: number;
    setVolume: (volume: number) => void;
    analysisPersonality: AnalysisPersonality;
    setAnalysisPersonality: (personality: AnalysisPersonality) => void;
    // Chronicle notification (unread dreams)
    lastSeenDreamCount: number;
    markDreamsAsSeen: () => void;
    getUnreadDreamCount: () => number;
    // Art style preference
    artStyle: ArtStyle;
    setArtStyle: (style: ArtStyle) => void;
    // Sleep Entries (Chronicle primary entity)
    sleepEntries: SleepEntry[];
    addSleepEntry: (date: string, sleepQuality: number | null, notes?: string, sleepAids?: SleepAids, alarmTime?: string, alarmSoundId?: string, wakeData?: WakeData) => number;
    updateSleepEntry: (entry: Partial<SleepEntry> & { id: number }) => void;
    deleteSleepEntry: (id: number) => void;
    getSleepEntryById: (id: number) => SleepEntry | undefined;
    addDreamToSleepEntry: (sleepEntryId: number, dreamText: string, mood?: DreamMood) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Enhanced useLocalStorage hook with:
 * - Storage quota handling
 * - JSON parse error recovery
 * - Data corruption detection
 * - Schema validation callback
 */
const useLocalStorage = <T,>(
    key: string,
    initialValue: T,
    validator?: (data: unknown) => data is T
): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item === null) return initialValue;

            let parsed: unknown;
            try {
                parsed = JSON.parse(item);
            } catch (parseError) {
                // JSON parse failed - data is corrupted
                logger.error(`[Storage] Corrupted data for key ${key}, resetting to default`, parseError);
                // Backup corrupted data for potential recovery
                try {
                    window.localStorage.setItem(`${key}_corrupted_${Date.now()}`, item);
                } catch {
                    // Ignore backup failure
                }
                return initialValue;
            }

            // Validate schema if validator provided
            if (validator && !validator(parsed)) {
                logger.warn(`[Storage] Schema validation failed for key ${key}, using default value`);
                return initialValue;
            }

            return parsed as T;
        } catch (error) {
            logger.error(`[Storage] Error reading ${key}:`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            const serialized = JSON.stringify(storedValue);
            window.localStorage.setItem(key, serialized);
        } catch (error) {
            // Handle storage quota exceeded
            if (error instanceof DOMException && (
                error.code === 22 || // Chrome
                error.code === 1014 || // Firefox
                error.name === 'QuotaExceededError' ||
                error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
            )) {
                logger.error(`[Storage] Quota exceeded for key ${key}, attempting cleanup`);
                // Attempt to free space by removing old backups
                try {
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const storageKey = localStorage.key(i);
                        if (storageKey && (
                            storageKey.includes('_corrupted_') ||
                            storageKey.startsWith('somnia_backup_')
                        )) {
                            keysToRemove.push(storageKey);
                        }
                    }
                    keysToRemove.forEach(k => localStorage.removeItem(k));
                    // Retry save after cleanup
                    window.localStorage.setItem(key, JSON.stringify(storedValue));
                } catch (retryError) {
                    logger.error(`[Storage] Failed to save ${key} even after cleanup:`, retryError);
                }
            } else {
                logger.error(`[Storage] Error saving ${key}:`, error);
            }
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
};

/**
 * Type guard validators for localStorage data
 */
const isAlarmArray = (data: unknown): data is Alarm[] => {
    return Array.isArray(data) && data.every(item =>
        typeof item === 'object' && item !== null &&
        typeof (item as Alarm).id === 'number' &&
        typeof (item as Alarm).time === 'string'
    );
};

const isDreamArray = (data: unknown): data is Dream[] => {
    return Array.isArray(data) && data.every(item =>
        typeof item === 'object' && item !== null &&
        typeof (item as Dream).id === 'number' &&
        typeof (item as Dream).dreamText === 'string'
    );
};

const isSleepEntryArray = (data: unknown): data is SleepEntry[] => {
    return Array.isArray(data) && data.every(item =>
        typeof item === 'object' && item !== null &&
        typeof (item as SleepEntry).id === 'number' &&
        typeof (item as SleepEntry).date === 'string'
    );
};


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Core data with schema validation
    const [alarms, setAlarms] = useLocalStorage<Alarm[]>('somnia_alarms', [], isAlarmArray);
    const [dreams, setDreams] = useLocalStorage<Dream[]>('somnia_dreams', [], isDreamArray);
    const [sleepEntries, setSleepEntries] = useLocalStorage<SleepEntry[]>('somnia_sleep_entries', [], isSleepEntryArray);

    // User preferences (no validation needed - simple types)
    const [biometrics, setBiometrics] = useLocalStorage<Biometrics>('somnia_biometrics', { age: null, gender: '', avgSleep: null });
    const [activeSleepAids, setActiveSleepAids] = useState<SleepAids>({});
    const [pendingSleepData, setPendingSleepData] = useLocalStorage<SleepAids | null>('somnia_pending_sleep_data', null);
    const [themeOverride, setThemeOverride] = useLocalStorage<Theme | 'auto'>('somnia_theme_override', 'night');
    const [coachPersonality, setCoachPersonality] = useLocalStorage<CoachPersonality>('somnia_coach_personality', 'mystical');
    const [volume, setVolume] = useLocalStorage<number>('somnia_volume', 0.5);
    const [analysisPersonality, setAnalysisPersonality] = useLocalStorage<AnalysisPersonality>('somnia_analysis_personality', 'oneironaut');
    const [isScribeOpen, setIsScribeOpen] = useState(false);
    const [activeSleepSession, setActiveSleepSession] = useLocalStorage<SleepSession | null>('somnia_active_sleep_session', null);
    const [lastSeenDreamCount, setLastSeenDreamCount] = useLocalStorage<number>('somnia_last_seen_dream_count', 0);
    const [artStyle, setArtStyle] = useLocalStorage<ArtStyle>('somnia_art_style', 'surreal');

    // Pre-populate title cache with existing dream titles to prevent unnecessary API calls
    // Mount-only effect: We intentionally read `dreams` only on initial load to seed the title cache.
    // Re-running on dreams changes would cause unnecessary cache operations since new dreams don't
    // have titles yet, and existing dreams are already cached.
    useEffect(() => {
        dreams.forEach(dream => {
            if (dream.aiAnalysis?.title && dream.dreamText) {
                cacheDreamTitle(dream.dreamText, dream.aiAnalysis.title);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for sync conflict resolution events and update React state
    // This fixes the bug where localStorage gets updated but React state stays stale
    useEffect(() => {
        const handleSyncConflictResolved = (event: CustomEvent<{ dreamId: number; resolution: 'server' | 'client' }>) => {
            const { dreamId, resolution } = event.detail;
            logger.log(`[AppContext] Sync conflict resolved for dream ${dreamId} with ${resolution} version`);

            // Re-read dreams from localStorage to get the updated version
            try {
                const storedDreams = localStorage.getItem('somnia_dreams');
                if (storedDreams) {
                    const parsedDreams: Dream[] = JSON.parse(storedDreams);
                    const updatedDream = parsedDreams.find(d => d.id === dreamId);
                    if (updatedDream) {
                        // Update only the affected dream in state
                        setDreams(prev => prev.map(d => d.id === dreamId ? updatedDream : d));
                    }
                }
            } catch (e) {
                logger.error('[AppContext] Failed to sync conflict-resolved dream to state:', e);
            }
        };

        window.addEventListener('syncConflictResolved', handleSyncConflictResolved as EventListener);
        return () => window.removeEventListener('syncConflictResolved', handleSyncConflictResolved as EventListener);
    }, [setDreams]);

    // Migration: Convert legacy dreams (without sleepEntryId) to sleep entries
    // Mount-only migration effect: This MUST run exactly once on app startup to migrate legacy data.
    // We intentionally omit `dreams`, `setDreams`, and `setSleepEntries` because:
    // (1) the migration flag ensures idempotency
    // (2) re-running on state changes would cause infinite loops or duplicate entries
    // (3) we need the initial localStorage values, not reactive state updates
    useEffect(() => {
        const migrationKey = 'somnia_migration_v1_complete';
        if (localStorage.getItem(migrationKey)) return; // Already migrated

        const legacyDreams = dreams.filter(d => !d.sleepEntryId);
        if (legacyDreams.length === 0) {
            localStorage.setItem(migrationKey, 'true');
            return;
        }

        logger.log('[Migration] Converting', legacyDreams.length, 'legacy dreams to sleep entries');

        // Group legacy dreams by date
        const dreamsByDate = new Map<string, typeof legacyDreams>();
        legacyDreams.forEach(dream => {
            const date = (dream.timestamp ?? '').split('T')[0] ?? ''; // Get YYYY-MM-DD
            const existing = dreamsByDate.get(date) || [];
            dreamsByDate.set(date, [...existing, dream]);
        });

        // Create sleep entries for each date
        const newSleepEntries: SleepEntry[] = [];
        const updatedDreams: Dream[] = [...dreams];

        dreamsByDate.forEach((dateDreams, date) => {
            const entryId = Date.now() + newSleepEntries.length; // Unique ID
            const dreamIds = dateDreams.map(d => d.id);

            // Get best sleep quality from dreams on this date
            const qualities = dateDreams.map(d => d.sleepQuality).filter((q): q is number => q !== null);
            const avgQuality = qualities.length > 0
                ? Math.round(qualities.reduce((a, b) => a + b, 0) / qualities.length)
                : null;

            // Get sleep aids from first dream (if any)
            const firstDreamWithAids = dateDreams.find(d => d.sleepAids);

            newSleepEntries.push({
                id: entryId,
                date,
                sleepQuality: avgQuality,
                sleepAids: firstDreamWithAids?.sleepAids,
                dreamIds,
                createdAt: new Date().toISOString(),
            });

            // Update dreams with sleepEntryId
            dreamIds.forEach(dreamId => {
                const idx = updatedDreams.findIndex(d => d.id === dreamId);
                if (idx !== -1) {
                    updatedDreams[idx] = { ...updatedDreams[idx]!, sleepEntryId: entryId } as Dream;
                }
            });
        });

        // Apply migration
        if (newSleepEntries.length > 0) {
            logger.log('[Migration] Created', newSleepEntries.length, 'sleep entries');
            setSleepEntries(prev => [...prev, ...newSleepEntries]);
            setDreams(updatedDreams);
        }

        localStorage.setItem(migrationKey, 'true');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Clear stale sleep sessions when linked alarm is DELETED (not just deactivated)
    // We only clear on deletion because:
    // - When alarm rings and is dismissed, it gets deactivated
    // - But user may still want to record a dream, which needs the session
    // - The session will be cleared after dream is recorded (in addDream) or finalizeSleepSession
    useEffect(() => {
        if (activeSleepSession?.alarmId) {
            const linkedAlarm = alarms.find(a => a.id === activeSleepSession.alarmId);
            // Only clear session if alarm was DELETED (not found), not just deactivated
            if (!linkedAlarm) {
                setActiveSleepSession(null);
            }
        }
    }, [alarms, activeSleepSession, setActiveSleepSession]);

    const addAlarm = useCallback((time: string, smartWake: boolean = false, days: number[] = [], soundId: string = 'somnia', purpose: AlarmPurpose = 'sleep', label?: string): number => {
        const newAlarm: Alarm = {
            id: generateSecureId(),
            time,
            isActive: true, // New alarms are ALWAYS active
            smartWake,
            smartWindow: 30,
            days,
            soundId,
            purpose,
            label
        };
        logger.log('[AppContext] Creating new alarm:', newAlarm);
        setAlarms(prev => [...prev, newAlarm]);
        enqueueAction('ADD_ALARM', newAlarm);

        // Schedule native notification for this alarm (iOS/Android)
        if (NativeAlarm.isNative) {
            if (days && days.length > 0) {
                // Recurring alarm
                NativeAlarm.scheduleRecurringAlarm(
                    newAlarm.id,
                    time,  // HH:mm format
                    days,  // Days array (0-6)
                    label || 'Somnia Alarm',
                    soundId
                );
            } else {
                // One-time alarm
                NativeAlarm.scheduleAlarm(
                    newAlarm.id,
                    time,  // HH:mm format
                    label || 'Somnia Alarm',
                    soundId
                );
            }
        }

        return newAlarm.id;
    }, [setAlarms]);

    // Get the next active alarm (soonest time today/tomorrow)
    const getNextActiveAlarm = useCallback((): Alarm | null => {
        const activeAlarms = alarms.filter(a => a.isActive);
        if (activeAlarms.length === 0) return null;

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const currentDay = now.getDay();

        // Find the soonest alarm
        let soonest: Alarm | null = null;
        let soonestDiff = Infinity;

        for (const alarm of activeAlarms) {
            const [h, m] = alarm.time.split(':').map(Number);
            const alarmMinutes = (h ?? 0) * 60 + (m ?? 0);

            // Check if alarm is for today or has no days set (one-time)
            const isForToday = alarm.days.length === 0 || alarm.days.includes(currentDay);
            const isForTomorrow = alarm.days.length === 0 || alarm.days.includes((currentDay + 1) % 7);

            let diff: number;
            if (isForToday && alarmMinutes > currentMinutes) {
                diff = alarmMinutes - currentMinutes;
            } else if (isForTomorrow) {
                diff = (24 * 60 - currentMinutes) + alarmMinutes;
            } else {
                continue;
            }

            if (diff < soonestDiff) {
                soonestDiff = diff;
                soonest = alarm;
            }
        }

        return soonest;
    }, [alarms]);

    // Start a new sleep session, optionally linked to a specific alarm
    const startSleepSession = useCallback((alarmId?: number) => {
        const alarm = alarmId ? alarms.find(a => a.id === alarmId) : getNextActiveAlarm();
        const newSession: SleepSession = {
            id: generateSecureId(),
            alarmId: alarm?.id ?? null,
            alarmTime: alarm?.time ?? null,
            alarmSoundId: alarm?.soundId,
            startedAt: new Date().toISOString(),
            sleepGatewayData: {},
            isActive: true
        };
        setActiveSleepSession(newSession);
    }, [alarms, getNextActiveAlarm, setActiveSleepSession]);

    // Ensure a sleep session exists (auto-create if none) - for soundscape/breathing auto-start
    const ensureSleepSession = useCallback(() => {
        setActiveSleepSession(prev => {
            if (prev) return prev; // Session already exists
            // Create a new session without linking to any alarm
            const newSession: SleepSession = {
                id: generateSecureId(),
                alarmId: null,
                alarmTime: null,
                startedAt: new Date().toISOString(),
                sleepGatewayData: {},
                isActive: true
            };
            return newSession;
        });
    }, [setActiveSleepSession]);

    // Update sleep gateway data for the active session
    const updateSleepSessionData = useCallback((data: Partial<SleepAids>) => {
        setActiveSleepSession(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                sleepGatewayData: { ...prev.sleepGatewayData, ...data }
            };
        });
    }, [setActiveSleepSession]);

    // Log a sound/soundscape activity to the session
    const logSoundActivity = useCallback((name: string, durationSeconds: number) => {
        setActiveSleepSession(prev => {
            if (!prev) return prev;
            const existingSounds = prev.sleepGatewayData.soundsPlayed || [];
            const existingPrepTime = prev.sleepGatewayData.totalPrepTime || 0;
            return {
                ...prev,
                sleepGatewayData: {
                    ...prev.sleepGatewayData,
                    soundsPlayed: [...existingSounds, { type: 'sound' as const, name, duration: durationSeconds }],
                    totalPrepTime: existingPrepTime + durationSeconds,
                }
            };
        });
    }, [setActiveSleepSession]);

    // Log a breathing exercise activity to the session
    const logBreathingActivity = useCallback((name: string, durationSeconds: number) => {
        setActiveSleepSession(prev => {
            if (!prev) return prev;
            const existingBreathing = prev.sleepGatewayData.breathingExercises || [];
            const existingPrepTime = prev.sleepGatewayData.totalPrepTime || 0;
            return {
                ...prev,
                sleepGatewayData: {
                    ...prev.sleepGatewayData,
                    breathingExercises: [...existingBreathing, { type: 'breathing' as const, name, duration: durationSeconds }],
                    totalPrepTime: existingPrepTime + durationSeconds,
                }
            };
        });
    }, [setActiveSleepSession]);

    // Save wake data to the active session (called when alarm is dismissed)
    const saveWakeData = useCallback((wakeData: WakeData) => {
        setActiveSleepSession(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                wakeData,
            };
        });
    }, [setActiveSleepSession]);

    // Clear the active sleep session (after dream is logged)
    const clearSleepSession = useCallback(() => {
        setActiveSleepSession(null);
    }, [setActiveSleepSession]);

    // Create a sleep entry when completing Sleep Gateway and link it to the session
    // This allows the entry to be updated later with wake data and dreams
    const createSleepEntryForSession = useCallback((): number | null => {
        if (!activeSleepSession) return null;
        if (activeSleepSession.sleepEntryId) return activeSleepSession.sleepEntryId; // Already has an entry

        const today = new Date().toISOString().split('T')[0] ?? '';
        const sleepData = activeSleepSession.sleepGatewayData ?? {};

        const entryId = generateSecureId();
        const newEntry: SleepEntry = {
            id: entryId,
            date: today,
            sleepQuality: null, // Will be set when dream is logged
            ...(sleepData.dayNotes ? { notes: sleepData.dayNotes } : {}),
            sleepAids: sleepData,
            wakeData: undefined, // Will be set when alarm is dismissed
            alarmTime: activeSleepSession.alarmTime ?? undefined,
            alarmSoundId: activeSleepSession.alarmSoundId,
            manuallyLogged: false,
            dreamIds: [], // Will be populated when dream is logged
            createdAt: new Date().toISOString(),
        };

        setSleepEntries(prev => [newEntry, ...prev]);

        // Update the session to link to this entry
        setActiveSleepSession(prev => prev ? { ...prev, sleepEntryId: entryId } : null);

        return entryId;
    }, [activeSleepSession, setActiveSleepSession, setSleepEntries]);

    // Finalize the sleep session WITHOUT a dream - updates or creates SleepEntry
    // Use this when user skips dream recording but we still want to save their sleep data
    const finalizeSleepSession = useCallback((options?: { alertnessBoostUsed?: boolean }) => {
        if (!activeSleepSession) return;

        const today = new Date().toISOString().split('T')[0] ?? '';
        const sleepData = activeSleepSession.sleepGatewayData ?? {};
        let wakeData = activeSleepSession.wakeData;

        // Update wakeData with boost info if provided
        if (options?.alertnessBoostUsed !== undefined) {
            if (wakeData) {
                wakeData = { ...wakeData, alertnessBoostUsed: options.alertnessBoostUsed };
            } else {
                // Create minimal wakeData if it doesn't exist but boost was used
                wakeData = {
                    snoozeCount: 0,
                    timeToSilence: 0,
                    alertnessBoostUsed: options.alertnessBoostUsed,
                    alarmType: 'manual'
                };
            }
        }

        // If we have an existing entry, UPDATE it
        if (activeSleepSession.sleepEntryId) {
            setSleepEntries(prev => prev.map(entry => {
                if (entry.id !== activeSleepSession.sleepEntryId) return entry;
                return {
                    ...entry,
                    wakeData: wakeData,
                };
            }));
        } else {
            // No existing entry, create a new one
            const newEntry: SleepEntry = {
                id: generateSecureId(),
                date: today,
                sleepQuality: null, // No dream means no sleep quality rating
                ...(sleepData.dayNotes ? { notes: sleepData.dayNotes } : {}),
                sleepAids: sleepData,
                wakeData: wakeData,
                alarmTime: activeSleepSession.alarmTime ?? undefined,
                alarmSoundId: activeSleepSession.alarmSoundId,
                manuallyLogged: false,
                dreamIds: [], // No dreams
                createdAt: new Date().toISOString(),
            };

            setSleepEntries(prev => [newEntry, ...prev]);
        }

        setActiveSleepSession(null);
        setPendingSleepData(null);
    }, [activeSleepSession, setActiveSleepSession, setPendingSleepData, setSleepEntries]);

    // Mark all dreams as seen (called when Chronicle tab is visited)
    const markDreamsAsSeen = useCallback(() => {
        setLastSeenDreamCount(dreams.length);
    }, [dreams.length, setLastSeenDreamCount]);

    // Get count of unread/new dreams
    const getUnreadDreamCount = useCallback(() => {
        return Math.max(0, dreams.length - lastSeenDreamCount);
    }, [dreams.length, lastSeenDreamCount]);

    const updateAlarm = useCallback((id: number, time: string, smartWake: boolean, days: number[] = [], soundId: string = 'somnia', purpose: AlarmPurpose = 'sleep', label?: string) => {
        // Use functional update to access current state and avoid stale closure issues
        setAlarms(prev => {
            const existingAlarm = prev.find(a => a.id === id);
            // Enqueue sync action with current isActive value from the latest state
            enqueueAction('UPDATE_ALARM', { id, time, smartWake, days, soundId, purpose, label, isActive: existingAlarm?.isActive ?? true });
            return prev.map(a => {
                if (a.id !== id) return a;
                // Explicitly preserve isActive and merge new values
                return { ...a, time, smartWake, days, soundId, purpose, label };
            });
        });
    }, [setAlarms]);

    const toggleAlarmActive = useCallback((id: number) => {
        setAlarms(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
        // Toggle is effectively an update, but simplified for sync for now
        enqueueAction('UPDATE_ALARM', { id, isActive: 'TOGGLE' });
    }, [setAlarms]);

    const deleteAlarm = useCallback((id: number) => {
        setAlarms(prev => prev.filter(a => a.id !== id));
        // Clear sleep session if it was linked to this alarm
        // Use functional update to avoid stale closure on activeSleepSession
        setActiveSleepSession(prev => {
            if (prev?.alarmId === id) {
                return null;
            }
            return prev;
        });
        enqueueAction('DELETE_ALARM', { id });
        // Cancel native notification
        if (NativeAlarm.isNative) {
            NativeAlarm.cancelAlarm(id);
        }
    }, [setAlarms, setActiveSleepSession]);

    const addDream = useCallback((dreamText: string, sleepQuality: number | null, mood?: DreamMood): number => {
        // Use sleep session data if available, otherwise fall back to pendingSleepData
        const sleepData = activeSleepSession?.sleepGatewayData ?? pendingSleepData ?? {};
        const wakeData = activeSleepSession?.wakeData;

        const dreamId = generateSecureId();
        const today = new Date().toISOString().split('T')[0] ?? ''; // YYYY-MM-DD

        let sleepEntryId: number | undefined = undefined;
        let foundExistingEntry = false;

        // If session has an existing sleepEntryId, UPDATE that entry
        if (activeSleepSession?.sleepEntryId) {
            // Verify the entry still exists before using
            const entryExists = sleepEntries.some(e => e.id === activeSleepSession.sleepEntryId);
            if (entryExists) {
                sleepEntryId = activeSleepSession.sleepEntryId;
                foundExistingEntry = true;
            }
        }
        // FALLBACK 1: Look for entry by ID if sleepEntryId wasn't found in session but entry exists
        // This handles edge cases where session state was partially lost
        if (!foundExistingEntry && activeSleepSession) {
            // Calculate yesterday's date for overnight sleep scenarios
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '';

            // First try: Match by alarmTime (today or yesterday) with no dreams
            if (activeSleepSession.alarmTime) {
                const existingEntry = sleepEntries.find(e =>
                    (e.date === today || e.date === yesterday) &&
                    e.alarmTime === activeSleepSession.alarmTime &&
                    e.dreamIds.length === 0
                );
                if (existingEntry) {
                    sleepEntryId = existingEntry.id;
                    foundExistingEntry = true;
                }
            }

            // Second try: Find most recent entry without dreams created in last 24 hours
            // This handles cases where alarmTime doesn't match or session was recreated
            if (!foundExistingEntry) {
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const recentEntry = sleepEntries.find(e =>
                    (e.date === today || e.date === yesterday) &&
                    e.dreamIds.length === 0 &&
                    e.createdAt >= twentyFourHoursAgo &&
                    !e.manuallyLogged // Don't link to manually logged entries
                );
                if (recentEntry) {
                    sleepEntryId = recentEntry.id;
                    foundExistingEntry = true;
                }
            }
        }

        if (foundExistingEntry && sleepEntryId) {
            // Update the existing entry with wake data and dream
            setSleepEntries(prev => prev.map(entry => {
                if (entry.id !== sleepEntryId) return entry;
                return {
                    ...entry,
                    sleepQuality,
                    wakeData: wakeData,
                    dreamIds: [...entry.dreamIds, dreamId],
                };
            }));
        }
        // If we have an active sleep session but NO existing entry, create one
        else if (activeSleepSession) {
            const entryId = generateSecureId();
            const newEntry: SleepEntry = {
                id: entryId,
                date: today,
                sleepQuality,
                ...(sleepData.dayNotes ? { notes: sleepData.dayNotes } : {}),
                sleepAids: sleepData,
                wakeData: wakeData,
                alarmTime: activeSleepSession.alarmTime ?? undefined,
                alarmSoundId: activeSleepSession.alarmSoundId,
                manuallyLogged: false,
                dreamIds: [dreamId],
                createdAt: new Date().toISOString(),
            };
            setSleepEntries(prev => [newEntry, ...prev]);
            sleepEntryId = entryId;
        }

        // Check global trends opt-in status for anonymous aggregation
        const trendsPrefs = getGlobalTrendsPrefs();

        const newDream: Dream = {
            id: dreamId,
            timestamp: new Date().toISOString(),
            dreamText,
            sleepQuality,
            title: "Untitled Dream",
            imageUrl: null,
            aiAnalysis: null,
            chatHistory: [],
            sleepAids: sleepData,
            sleepEntryId, // Link to the SleepEntry if created
            mood,
            // Global Trends: include location metadata if user opted in
            ...(trendsPrefs.optedIn && {
                shareInGlobalTrends: true,
                userRegion: trendsPrefs.location?.region,
                userCountry: trendsPrefs.location?.country,
            }),
        };
        setDreams(prev => [newDream, ...prev]);
        // Clear both session and pending data after dream is logged
        setActiveSleepSession(null);
        setPendingSleepData(null);
        enqueueAction('ADD_DREAM', newDream);
        return newDream.id;
    }, [activeSleepSession, pendingSleepData, sleepEntries, setDreams, setActiveSleepSession, setPendingSleepData, setSleepEntries]);

    // Add a past dream with custom timestamp (for Chronicle manual logging)
    const addPastDream = useCallback((dreamText: string, sleepQuality: number | null, mood: DreamMood | undefined, timestamp: string): number => {
        // Check global trends opt-in status for anonymous aggregation
        const trendsPrefs = getGlobalTrendsPrefs();

        const newDream: Dream = {
            id: generateSecureId(),
            timestamp,
            dreamText,
            sleepQuality,
            title: "Untitled Dream",
            imageUrl: null,
            aiAnalysis: null,
            chatHistory: [],
            mood,
            // Global Trends: include location metadata if user opted in
            ...(trendsPrefs.optedIn && {
                shareInGlobalTrends: true,
                userRegion: trendsPrefs.location?.region,
                userCountry: trendsPrefs.location?.country,
            }),
        };
        setDreams(prev => [newDream, ...prev]);
        enqueueAction('ADD_DREAM', newDream);
        return newDream.id;
    }, [setDreams]);

    const importDreams = useCallback((dreamsToImport: Dream[]) => {
        setDreams(prev => [...dreamsToImport, ...prev]);
        // Import is local-heavy, maybe don't sync all at once or handle batch?
        // For simple queue, let's sync them individually or create a BATCH type later.
        // For now: Skip queuing imports to prevent spamming the queue.
    }, [setDreams]);

    const deleteDream = useCallback((id: number) => {
        setDreams(prev => prev.filter(d => d.id !== id));
        enqueueAction('DELETE_DREAM', { id });
    }, [setDreams]);

    const updateDream = useCallback((updatedDreamPart: Partial<Dream> & { id: number }) => {
        setDreams(prev => prev.map(d => d.id === updatedDreamPart.id ? { ...d, ...updatedDreamPart } : d));
        enqueueAction('UPDATE_DREAM', updatedDreamPart);
    }, [setDreams]);

    const getDreamById = useCallback((id: number) => {
        return dreams.find(d => d.id === id);
    }, [dreams]);

    const setActiveSleepAid = useCallback((type: keyof SleepAids, value: string | null) => {
        setActiveSleepAids(prev => ({ ...prev, [type]: value }));
    }, []);

    const clearActiveSleepAids = useCallback(() => {
        setActiveSleepAids({});
    }, []);

    // ========== Sleep Entry CRUD ==========
    const addSleepEntry = useCallback((date: string, sleepQuality: number | null, notes?: string, sleepAids?: SleepAids, alarmTime?: string, alarmSoundId?: string, wakeData?: WakeData): number => {
        const newEntry: SleepEntry = {
            id: generateSecureId(),
            date,
            sleepQuality,
            notes,
            sleepAids,
            alarmTime,
            alarmSoundId,
            wakeData,
            dreamIds: [],
            createdAt: new Date().toISOString(),
        };
        setSleepEntries(prev => [newEntry, ...prev]);
        return newEntry.id;
    }, [setSleepEntries]);

    const updateSleepEntry = useCallback((updatedEntry: Partial<SleepEntry> & { id: number }) => {
        setSleepEntries(prev => prev.map(e => e.id === updatedEntry.id ? { ...e, ...updatedEntry } : e));
    }, [setSleepEntries]);

    const deleteSleepEntry = useCallback((id: number) => {
        // Get the entry first to find associated dream IDs
        // NOTE: We read from current sleepEntries state, then batch both updates
        const entry = sleepEntries.find(e => e.id === id);
        const dreamIdsToDelete = entry?.dreamIds ?? [];

        // Delete the sleep entry
        setSleepEntries(prev => prev.filter(e => e.id !== id));

        // Delete associated dreams (separate state update to avoid side effects in updater)
        if (dreamIdsToDelete.length > 0) {
            setDreams(prev => prev.filter(d => !dreamIdsToDelete.includes(d.id)));
        }
    }, [sleepEntries, setDreams, setSleepEntries]);

    const getSleepEntryById = useCallback((id: number) => {
        return sleepEntries.find(e => e.id === id);
    }, [sleepEntries]);

    const addDreamToSleepEntry = useCallback((sleepEntryId: number, dreamText: string, mood?: DreamMood): number => {
        const entry = sleepEntries.find(e => e.id === sleepEntryId);
        if (!entry) return -1;

        // Check global trends opt-in status for anonymous aggregation
        const trendsPrefs = getGlobalTrendsPrefs();

        const newDream: Dream = {
            id: generateSecureId(),
            timestamp: new Date().toISOString(),
            dreamText,
            sleepQuality: entry.sleepQuality, // Inherit from parent entry
            title: "Untitled Dream",
            imageUrl: null,
            aiAnalysis: null,
            chatHistory: [],
            mood,
            sleepEntryId,
            // Global Trends: include location metadata if user opted in
            ...(trendsPrefs.optedIn && {
                shareInGlobalTrends: true,
                userRegion: trendsPrefs.location?.region,
                userCountry: trendsPrefs.location?.country,
            }),
        };
        setDreams(prev => [newDream, ...prev]);

        // Add dream ID to the sleep entry
        setSleepEntries(prev => prev.map(e =>
            e.id === sleepEntryId
                ? { ...e, dreamIds: [...e.dreamIds, newDream.id] }
                : e
        ));

        enqueueAction('ADD_DREAM', newDream);
        return newDream.id;
    }, [sleepEntries, setDreams, setSleepEntries]);

    // Memoize context value to prevent unnecessary re-renders in consuming components
    // Only re-create value object when actual dependencies change
    const value: AppContextType = useMemo(() => ({
        alarms,
        dreams,
        biometrics,
        activeSleepAids,
        pendingSleepData,
        activeSleepSession,
        startSleepSession,
        ensureSleepSession,
        updateSleepSessionData,
        logSoundActivity,
        logBreathingActivity,
        saveWakeData,
        finalizeSleepSession,
        createSleepEntryForSession,
        clearSleepSession,
        getNextActiveAlarm,
        addAlarm,
        updateAlarm,
        toggleAlarmActive,
        deleteAlarm,
        addDream,
        addPastDream,
        updateDream,
        getDreamById,
        deleteDream,
        importDreams,
        setActiveSleepAid,
        clearActiveSleepAids,
        setPendingSleepData,
        setBiometrics,
        themeOverride,
        setThemeOverride,
        isScribeOpen,
        setIsScribeOpen,
        coachPersonality,
        setCoachPersonality,
        volume,
        setVolume,
        analysisPersonality,
        setAnalysisPersonality,
        lastSeenDreamCount,
        markDreamsAsSeen,
        getUnreadDreamCount,
        artStyle,
        setArtStyle,
        // Sleep Entries
        sleepEntries,
        addSleepEntry,
        updateSleepEntry,
        deleteSleepEntry,
        getSleepEntryById,
        addDreamToSleepEntry,
    }), [
        // Data state
        alarms, dreams, biometrics, activeSleepAids, pendingSleepData,
        activeSleepSession, themeOverride, coachPersonality, volume,
        analysisPersonality, isScribeOpen, lastSeenDreamCount, artStyle, sleepEntries,
        // Callbacks (memoized with useCallback, so these are stable references)
        startSleepSession, ensureSleepSession, updateSleepSessionData, logSoundActivity,
        logBreathingActivity, saveWakeData, finalizeSleepSession, createSleepEntryForSession,
        clearSleepSession, getNextActiveAlarm, addAlarm, updateAlarm, toggleAlarmActive,
        deleteAlarm, addDream, addPastDream, updateDream, getDreamById, deleteDream,
        importDreams, setActiveSleepAid, clearActiveSleepAids, setPendingSleepData,
        setBiometrics, setThemeOverride, setCoachPersonality, setVolume, setAnalysisPersonality,
        markDreamsAsSeen, getUnreadDreamCount, setArtStyle, addSleepEntry, updateSleepEntry,
        deleteSleepEntry, getSleepEntryById, addDreamToSleepEntry,
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};