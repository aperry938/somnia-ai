import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Alarm, Dream, SleepAids, Biometrics, Theme, CoachPersonality, AnalysisPersonality, DreamMood, SleepSession, AlarmPurpose, SleepEntry } from '../types';

export type ArtStyle = 'surreal' | 'watercolor' | 'oil-painting' | 'anime' | 'photorealistic' | 'abstract' | 'fantasy' | 'minimalist';
import { enqueueAction } from '../services/syncService';
import { cacheDreamTitle } from '../services/geminiService';
import { logger } from '../services/logger';
import * as NativeAlarm from '../services/nativeAlarmService';

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
    return Math.abs((array[0] * 0x100000000 + array[1]) % Number.MAX_SAFE_INTEGER);
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
    updateSleepSessionData: (data: Partial<SleepAids>) => void;
    logSoundActivity: (name: string, durationSeconds: number) => void;
    logBreathingActivity: (name: string, durationSeconds: number) => void;
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
    addSleepEntry: (date: string, sleepQuality: number | null, notes?: string, sleepAids?: SleepAids, alarmTime?: string, alarmSoundId?: string) => number;
    updateSleepEntry: (entry: Partial<SleepEntry> & { id: number }) => void;
    deleteSleepEntry: (id: number) => void;
    getSleepEntryById: (id: number) => SleepEntry | undefined;
    addDreamToSleepEntry: (sleepEntryId: number, dreamText: string, mood?: DreamMood) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            logger.error(error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            logger.error(error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
};


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [alarms, setAlarms] = useLocalStorage<Alarm[]>('somnia_alarms', []);
    const [dreams, setDreams] = useLocalStorage<Dream[]>('somnia_dreams', []);
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
    const [sleepEntries, setSleepEntries] = useLocalStorage<SleepEntry[]>('somnia_sleep_entries', []);

    // Pre-populate title cache with existing dream titles to prevent unnecessary API calls
    useEffect(() => {
        dreams.forEach(dream => {
            if (dream.aiAnalysis?.title && dream.dreamText) {
                cacheDreamTitle(dream.dreamText, dream.aiAnalysis.title);
            }
        });
    }, []); // Only run on initial mount

    // Migration: Convert legacy dreams (without sleepEntryId) to sleep entries
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
            const date = dream.timestamp.split('T')[0]; // Get YYYY-MM-DD
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
                    updatedDreams[idx] = { ...updatedDreams[idx], sleepEntryId: entryId };
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
    }, []); // Only run on initial mount

    // Clear stale sleep sessions when linked alarm no longer exists or is inactive
    useEffect(() => {
        if (activeSleepSession?.alarmId) {
            const linkedAlarm = alarms.find(a => a.id === activeSleepSession.alarmId);
            // Clear session if alarm was deleted or deactivated
            if (!linkedAlarm || !linkedAlarm.isActive) {
                setActiveSleepSession(null);
            }
        }
    }, [alarms, activeSleepSession, setActiveSleepSession]);

    const addAlarm = (time: string, smartWake: boolean = false, days: number[] = [], soundId: string = 'somnia', purpose: AlarmPurpose = 'sleep', label?: string): number => {
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
            const [hour, minute] = time.split(':').map(Number);
            if (days && days.length > 0) {
                // Recurring alarm - Capacitor uses 1=Sunday, 7=Saturday but our days are 0-6
                const capacitorDays = days.map(d => d + 1);
                NativeAlarm.scheduleRecurringAlarm(
                    newAlarm.id,
                    label || 'Somnia Alarm',
                    'Time to wake up!',
                    hour,
                    minute,
                    capacitorDays
                );
            } else {
                // One-time alarm
                const now = new Date();
                const alarmDate = new Date();
                alarmDate.setHours(hour, minute, 0, 0);
                if (alarmDate <= now) {
                    alarmDate.setDate(alarmDate.getDate() + 1);
                }
                NativeAlarm.scheduleAlarm(
                    newAlarm.id,
                    label || 'Somnia Alarm',
                    'Time to wake up!',
                    alarmDate
                );
            }
        }

        return newAlarm.id;
    };

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
            const alarmMinutes = h * 60 + m;

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

    // Clear the active sleep session (after dream is logged)
    const clearSleepSession = useCallback(() => {
        setActiveSleepSession(null);
    }, [setActiveSleepSession]);

    // Mark all dreams as seen (called when Chronicle tab is visited)
    const markDreamsAsSeen = useCallback(() => {
        setLastSeenDreamCount(dreams.length);
    }, [dreams.length, setLastSeenDreamCount]);

    // Get count of unread/new dreams
    const getUnreadDreamCount = useCallback(() => {
        return Math.max(0, dreams.length - lastSeenDreamCount);
    }, [dreams.length, lastSeenDreamCount]);

    const updateAlarm = (id: number, time: string, smartWake: boolean, days: number[] = [], soundId: string = 'somnia', purpose: AlarmPurpose = 'sleep', label?: string) => {
        setAlarms(prev => prev.map(a => {
            if (a.id !== id) return a;
            // Explicitly preserve isActive and merge new values
            return { ...a, time, smartWake, days, soundId, purpose, label };
        }));
        // Include existing isActive in sync action
        const existingAlarm = alarms.find(a => a.id === id);
        enqueueAction('UPDATE_ALARM', { id, time, smartWake, days, soundId, purpose, label, isActive: existingAlarm?.isActive ?? true });
    };

    const toggleAlarmActive = (id: number) => {
        setAlarms(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
        // Toggle is effectively an update, but simplified for sync for now
        enqueueAction('UPDATE_ALARM', { id, isActive: 'TOGGLE' });
    };

    const deleteAlarm = (id: number) => {
        setAlarms(prev => prev.filter(a => a.id !== id));
        // Clear sleep session if it was linked to this alarm
        if (activeSleepSession?.alarmId === id) {
            setActiveSleepSession(null);
        }
        enqueueAction('DELETE_ALARM', { id });
        // Cancel native notification
        if (NativeAlarm.isNative) {
            NativeAlarm.cancelAlarm(id);
        }
    };

    const addDream = (dreamText: string, sleepQuality: number | null, mood?: DreamMood): number => {
        // Use sleep session data if available, otherwise fall back to pendingSleepData
        const sleepData = activeSleepSession?.sleepGatewayData ?? pendingSleepData ?? {};
        const wakeData = activeSleepSession?.wakeData;
        const hasSessionData = activeSleepSession || pendingSleepData;

        const dreamId = generateSecureId();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // If we have sleep session data, create a proper SleepEntry
        let sleepEntryId: number | undefined = undefined;
        if (hasSessionData) {
            const entryId = generateSecureId();
            const newEntry: SleepEntry = {
                id: entryId,
                date: today,
                sleepQuality,
                notes: sleepData.dayNotes,
                sleepAids: sleepData,
                wakeData: wakeData,
                manuallyLogged: !!pendingSleepData && !activeSleepSession,
                dreamIds: [dreamId],
                createdAt: new Date().toISOString(),
            };
            setSleepEntries(prev => [newEntry, ...prev]);
            sleepEntryId = entryId;
        }

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
        };
        setDreams(prev => [newDream, ...prev]);
        // Clear both session and pending data after dream is logged
        setActiveSleepSession(null);
        setPendingSleepData(null);
        enqueueAction('ADD_DREAM', newDream);
        return newDream.id;
    };

    // Add a past dream with custom timestamp (for Chronicle manual logging)
    const addPastDream = (dreamText: string, sleepQuality: number | null, mood: DreamMood | undefined, timestamp: string): number => {
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
        };
        setDreams(prev => [newDream, ...prev]);
        enqueueAction('ADD_DREAM', newDream);
        return newDream.id;
    };

    const importDreams = (dreamsToImport: Dream[]) => {
        setDreams(prev => [...dreamsToImport, ...prev]);
        // Import is local-heavy, maybe don't sync all at once or handle batch?
        // For simple queue, let's sync them individually or create a BATCH type later.
        // For now: Skip queuing imports to prevent spamming the queue.
    };

    const deleteDream = (id: number) => {
        setDreams(prev => prev.filter(d => d.id !== id));
        enqueueAction('DELETE_DREAM', { id });
    };

    const updateDream = useCallback((updatedDreamPart: Partial<Dream> & { id: number }) => {
        setDreams(prev => prev.map(d => d.id === updatedDreamPart.id ? { ...d, ...updatedDreamPart } : d));
        enqueueAction('UPDATE_DREAM', updatedDreamPart);
    }, [setDreams]);

    const getDreamById = useCallback((id: number) => {
        return dreams.find(d => d.id === id);
    }, [dreams]);

    const setActiveSleepAid = (type: keyof SleepAids, value: string | null) => {
        setActiveSleepAids(prev => ({ ...prev, [type]: value }));
    };

    const clearActiveSleepAids = () => {
        setActiveSleepAids({});
    };

    // ========== Sleep Entry CRUD ==========
    const addSleepEntry = (date: string, sleepQuality: number | null, notes?: string, sleepAids?: SleepAids, alarmTime?: string, alarmSoundId?: string): number => {
        const newEntry: SleepEntry = {
            id: generateSecureId(),
            date,
            sleepQuality,
            notes,
            sleepAids,
            alarmTime,
            alarmSoundId,
            dreamIds: [],
            createdAt: new Date().toISOString(),
        };
        setSleepEntries(prev => [newEntry, ...prev]);
        return newEntry.id;
    };

    const updateSleepEntry = useCallback((updatedEntry: Partial<SleepEntry> & { id: number }) => {
        setSleepEntries(prev => prev.map(e => e.id === updatedEntry.id ? { ...e, ...updatedEntry } : e));
    }, [setSleepEntries]);

    const deleteSleepEntry = (id: number) => {
        // Also delete associated dreams
        const entry = sleepEntries.find(e => e.id === id);
        if (entry) {
            entry.dreamIds.forEach(dreamId => {
                setDreams(prev => prev.filter(d => d.id !== dreamId));
            });
        }
        setSleepEntries(prev => prev.filter(e => e.id !== id));
    };

    const getSleepEntryById = useCallback((id: number) => {
        return sleepEntries.find(e => e.id === id);
    }, [sleepEntries]);

    const addDreamToSleepEntry = (sleepEntryId: number, dreamText: string, mood?: DreamMood): number => {
        const entry = sleepEntries.find(e => e.id === sleepEntryId);
        if (!entry) return -1;

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
    };

    const value: AppContextType = {
        alarms,
        dreams,
        biometrics,
        activeSleepAids,
        pendingSleepData,
        activeSleepSession,
        startSleepSession,
        updateSleepSessionData,
        logSoundActivity,
        logBreathingActivity,
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
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};