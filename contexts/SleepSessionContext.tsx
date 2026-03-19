import React, { createContext, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Alarm, Dream, DreamMood, SleepAids, SleepSession, SleepEntry, WakeData } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { isSleepEntryArray } from '../utils/validators';
import { generateSecureId } from '../utils/id';
import { enqueueAction } from '../services/syncService';
import { logger } from '../services/logger';
import { getGlobalTrendsPrefs } from '../services/dreamTrendsService';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface SleepSessionContextType {
    // Sleep session state
    activeSleepSession: SleepSession | null;
    activeSleepAids: SleepAids;
    pendingSleepData: SleepAids | null;
    // Sleep session lifecycle
    startSleepSession: (alarmId?: number) => void;
    ensureSleepSession: () => void;
    updateSleepSessionData: (data: Partial<SleepAids>) => void;
    logSoundActivity: (name: string, durationSeconds: number) => void;
    logBreathingActivity: (name: string, durationSeconds: number) => void;
    saveWakeData: (wakeData: WakeData) => void;
    finalizeSleepSession: (options?: { alertnessBoostUsed?: boolean }) => void;
    createSleepEntryForSession: () => number | null;
    clearSleepSession: () => void;
    // Sleep aids
    setActiveSleepAid: (type: keyof SleepAids, value: string | null) => void;
    clearActiveSleepAids: () => void;
    setPendingSleepData: (data: SleepAids | null) => void;
    // Sleep entries
    sleepEntries: SleepEntry[];
    addSleepEntry: (date: string, sleepQuality: number | null, notes?: string, sleepAids?: SleepAids, alarmTime?: string, alarmSoundId?: string, wakeData?: WakeData) => number;
    updateSleepEntry: (entry: Partial<SleepEntry> & { id: number }) => void;
    deleteSleepEntry: (id: number) => void;
    getSleepEntryById: (id: number) => SleepEntry | undefined;
    // Cross-cutting: dream creation linked to session
    addDream: (dreamText: string, sleepQuality: number | null, mood?: DreamMood) => number;
    addDreamToSleepEntry: (sleepEntryId: number, dreamText: string, mood?: DreamMood) => number;
}

const SleepSessionContext = createContext<SleepSessionContextType | undefined>(undefined);

export const SleepSessionProvider: React.FC<{
    children: ReactNode;
    alarms: Alarm[];
    getNextActiveAlarm: () => Alarm | null;
    dreams: Dream[];
    setDreams: React.Dispatch<React.SetStateAction<Dream[]>>;
}> = ({ children, alarms, getNextActiveAlarm, dreams, setDreams }) => {
    const [sleepEntries, setSleepEntries] = useLocalStorage<SleepEntry[]>('somnia_sleep_entries', [], isSleepEntryArray);
    const [activeSleepSession, setActiveSleepSession] = useLocalStorage<SleepSession | null>('somnia_active_sleep_session', null);
    const [activeSleepAids, setActiveSleepAids] = React.useState<SleepAids>({});
    const [pendingSleepData, setPendingSleepData] = useLocalStorage<SleepAids | null>('somnia_pending_sleep_data', null);

    // Migration: Convert legacy dreams to sleep entries
    useEffect(() => {
        const migrationKey = 'somnia_migration_v1_complete';
        if (localStorage.getItem(migrationKey)) return;

        const legacyDreams = dreams.filter(d => !d.sleepEntryId);
        if (legacyDreams.length === 0) {
            localStorage.setItem(migrationKey, 'true');
            return;
        }

        logger.log('[Migration] Converting', legacyDreams.length, 'legacy dreams to sleep entries');

        const dreamsByDate = new Map<string, typeof legacyDreams>();
        legacyDreams.forEach(dream => {
            const date = (dream.timestamp ?? '').split('T')[0] ?? '';
            const existing = dreamsByDate.get(date) || [];
            dreamsByDate.set(date, [...existing, dream]);
        });

        const newSleepEntries: SleepEntry[] = [];
        const updatedDreams: Dream[] = [...dreams];

        dreamsByDate.forEach((dateDreams, date) => {
            const entryId = Date.now() + newSleepEntries.length;
            const dreamIds = dateDreams.map(d => d.id);

            const qualities = dateDreams.map(d => d.sleepQuality).filter((q): q is number => q !== null);
            const avgQuality = qualities.length > 0
                ? Math.round(qualities.reduce((a, b) => a + b, 0) / qualities.length)
                : null;

            const firstDreamWithAids = dateDreams.find(d => d.sleepAids);

            newSleepEntries.push({
                id: entryId,
                date,
                sleepQuality: avgQuality,
                sleepAids: firstDreamWithAids?.sleepAids,
                dreamIds,
                createdAt: new Date().toISOString(),
            });

            dreamIds.forEach(dreamId => {
                const idx = updatedDreams.findIndex(d => d.id === dreamId);
                if (idx !== -1) {
                    updatedDreams[idx] = { ...updatedDreams[idx]!, sleepEntryId: entryId } as Dream;
                }
            });
        });

        if (newSleepEntries.length > 0) {
            logger.log('[Migration] Created', newSleepEntries.length, 'sleep entries');
            setSleepEntries(prev => [...prev, ...newSleepEntries]);
            setDreams(updatedDreams);
        }

        localStorage.setItem(migrationKey, 'true');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Clear stale sessions when linked alarm is deleted
    useEffect(() => {
        if (activeSleepSession?.alarmId) {
            const linkedAlarm = alarms.find(a => a.id === activeSleepSession.alarmId);
            if (!linkedAlarm) {
                setActiveSleepSession(null);
            }
        }
    }, [alarms, activeSleepSession, setActiveSleepSession]);

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

    const ensureSleepSession = useCallback(() => {
        setActiveSleepSession(prev => {
            if (prev) return prev;
            return {
                id: generateSecureId(),
                alarmId: null,
                alarmTime: null,
                startedAt: new Date().toISOString(),
                sleepGatewayData: {},
                isActive: true
            };
        });
    }, [setActiveSleepSession]);

    const updateSleepSessionData = useCallback((data: Partial<SleepAids>) => {
        setActiveSleepSession(prev => prev ? { ...prev, sleepGatewayData: { ...prev.sleepGatewayData, ...data } } : prev);
    }, [setActiveSleepSession]);

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

    const saveWakeData = useCallback((wakeData: WakeData) => {
        setActiveSleepSession(prev => prev ? { ...prev, wakeData } : prev);
    }, [setActiveSleepSession]);

    const clearSleepSession = useCallback(() => {
        setActiveSleepSession(null);
    }, [setActiveSleepSession]);

    const createSleepEntryForSession = useCallback((): number | null => {
        if (!activeSleepSession) return null;
        if (activeSleepSession.sleepEntryId) return activeSleepSession.sleepEntryId;

        const today = new Date().toISOString().split('T')[0] ?? '';
        const sleepData = activeSleepSession.sleepGatewayData ?? {};

        const entryId = generateSecureId();
        const newEntry: SleepEntry = {
            id: entryId,
            date: today,
            sleepQuality: null,
            ...(sleepData.dayNotes ? { notes: sleepData.dayNotes } : {}),
            sleepAids: sleepData,
            wakeData: undefined,
            alarmTime: activeSleepSession.alarmTime ?? undefined,
            alarmSoundId: activeSleepSession.alarmSoundId,
            manuallyLogged: false,
            dreamIds: [],
            createdAt: new Date().toISOString(),
        };

        setSleepEntries(prev => [newEntry, ...prev]);
        setActiveSleepSession(prev => prev ? { ...prev, sleepEntryId: entryId } : null);

        return entryId;
    }, [activeSleepSession, setActiveSleepSession, setSleepEntries]);

    const finalizeSleepSession = useCallback((options?: { alertnessBoostUsed?: boolean }) => {
        if (!activeSleepSession) return;

        const today = new Date().toISOString().split('T')[0] ?? '';
        const sleepData = activeSleepSession.sleepGatewayData ?? {};
        let wakeData = activeSleepSession.wakeData;

        if (options?.alertnessBoostUsed !== undefined) {
            if (wakeData) {
                wakeData = { ...wakeData, alertnessBoostUsed: options.alertnessBoostUsed };
            } else {
                wakeData = { snoozeCount: 0, timeToSilence: 0, alertnessBoostUsed: options.alertnessBoostUsed, alarmType: 'manual' };
            }
        }

        if (activeSleepSession.sleepEntryId) {
            setSleepEntries(prev => prev.map(entry => {
                if (entry.id !== activeSleepSession.sleepEntryId) return entry;
                return { ...entry, wakeData };
            }));
        } else {
            const newEntry: SleepEntry = {
                id: generateSecureId(),
                date: today,
                sleepQuality: null,
                ...(sleepData.dayNotes ? { notes: sleepData.dayNotes } : {}),
                sleepAids: sleepData,
                wakeData,
                alarmTime: activeSleepSession.alarmTime ?? undefined,
                alarmSoundId: activeSleepSession.alarmSoundId,
                manuallyLogged: false,
                dreamIds: [],
                createdAt: new Date().toISOString(),
            };
            setSleepEntries(prev => [newEntry, ...prev]);
        }

        setActiveSleepSession(null);
        setPendingSleepData(null);
    }, [activeSleepSession, setActiveSleepSession, setPendingSleepData, setSleepEntries]);

    const setActiveSleepAid = useCallback((type: keyof SleepAids, value: string | null) => {
        setActiveSleepAids(prev => ({ ...prev, [type]: value }));
    }, []);

    const clearActiveSleepAids = useCallback(() => {
        setActiveSleepAids({});
    }, []);

    // Sleep Entry CRUD
    const addSleepEntry = useCallback((date: string, sleepQuality: number | null, notes?: string, sleepAids?: SleepAids, alarmTime?: string, alarmSoundId?: string, wakeData?: WakeData): number => {
        const newEntry: SleepEntry = {
            id: generateSecureId(),
            date, sleepQuality, notes, sleepAids, alarmTime, alarmSoundId, wakeData,
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
        const entry = sleepEntries.find(e => e.id === id);
        const dreamIdsToDelete = entry?.dreamIds ?? [];

        setSleepEntries(prev => prev.filter(e => e.id !== id));

        if (dreamIdsToDelete.length > 0) {
            setDreams(prev => prev.filter(d => !dreamIdsToDelete.includes(d.id)));
        }
    }, [sleepEntries, setDreams, setSleepEntries]);

    const getSleepEntryById = useCallback((id: number) => {
        return sleepEntries.find(e => e.id === id);
    }, [sleepEntries]);

    // Cross-cutting: Add dream linked to active session
    const addDream = useCallback((dreamText: string, sleepQuality: number | null, mood?: DreamMood): number => {
        const sleepData = activeSleepSession?.sleepGatewayData ?? pendingSleepData ?? {};
        const wakeData = activeSleepSession?.wakeData;

        const dreamId = generateSecureId();
        const today = new Date().toISOString().split('T')[0] ?? '';

        let sleepEntryId: number | undefined = undefined;
        let foundExistingEntry = false;

        // If session has an existing sleepEntryId, UPDATE that entry
        if (activeSleepSession?.sleepEntryId) {
            const entryExists = sleepEntries.some(e => e.id === activeSleepSession.sleepEntryId);
            if (entryExists) {
                sleepEntryId = activeSleepSession.sleepEntryId;
                foundExistingEntry = true;
            }
        }

        // FALLBACK: Look for matching entry by context
        if (!foundExistingEntry && activeSleepSession) {
            const yesterday = new Date(Date.now() - MS_PER_DAY).toISOString().split('T')[0] ?? '';

            if (activeSleepSession.alarmTime) {
                // Sort by createdAt descending to prefer the most recent entry
                const existingEntry = [...sleepEntries]
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .find(e =>
                        (e.date === today || e.date === yesterday) &&
                        e.alarmTime === activeSleepSession.alarmTime &&
                        e.dreamIds.length === 0
                    );
                if (existingEntry) {
                    sleepEntryId = existingEntry.id;
                    foundExistingEntry = true;
                }
            }

            if (!foundExistingEntry) {
                const twentyFourHoursAgo = new Date(Date.now() - MS_PER_DAY).toISOString();
                // Sort by createdAt descending to prefer the most recent entry
                const recentEntry = [...sleepEntries]
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .find(e =>
                        (e.date === today || e.date === yesterday) &&
                        e.dreamIds.length === 0 &&
                        e.createdAt >= twentyFourHoursAgo &&
                        !e.manuallyLogged
                    );
                if (recentEntry) {
                    sleepEntryId = recentEntry.id;
                    foundExistingEntry = true;
                }
            }
        }

        if (foundExistingEntry && sleepEntryId) {
            setSleepEntries(prev => prev.map(entry => {
                if (entry.id !== sleepEntryId) return entry;
                return { ...entry, sleepQuality, wakeData, dreamIds: [...entry.dreamIds, dreamId] };
            }));
        } else if (activeSleepSession) {
            const entryId = generateSecureId();
            const newEntry: SleepEntry = {
                id: entryId,
                date: today,
                sleepQuality,
                ...(sleepData.dayNotes ? { notes: sleepData.dayNotes } : {}),
                sleepAids: sleepData,
                wakeData,
                alarmTime: activeSleepSession.alarmTime ?? undefined,
                alarmSoundId: activeSleepSession.alarmSoundId,
                manuallyLogged: false,
                dreamIds: [dreamId],
                createdAt: new Date().toISOString(),
            };
            setSleepEntries(prev => [newEntry, ...prev]);
            sleepEntryId = entryId;
        }

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
            sleepEntryId,
            mood,
            ...(trendsPrefs.optedIn && {
                shareInGlobalTrends: true,
                userRegion: trendsPrefs.location?.region,
                userCountry: trendsPrefs.location?.country,
            }),
        };
        setDreams(prev => [newDream, ...prev]);
        setActiveSleepSession(null);
        setPendingSleepData(null);
        enqueueAction('ADD_DREAM', newDream);
        return newDream.id;
    }, [activeSleepSession, pendingSleepData, sleepEntries, setDreams, setActiveSleepSession, setPendingSleepData, setSleepEntries]);

    const addDreamToSleepEntry = useCallback((sleepEntryId: number, dreamText: string, mood?: DreamMood): number => {
        const entry = sleepEntries.find(e => e.id === sleepEntryId);
        if (!entry) return -1;

        const trendsPrefs = getGlobalTrendsPrefs();

        const newDream: Dream = {
            id: generateSecureId(),
            timestamp: new Date().toISOString(),
            dreamText,
            sleepQuality: entry.sleepQuality,
            title: "Untitled Dream",
            imageUrl: null,
            aiAnalysis: null,
            chatHistory: [],
            mood,
            sleepEntryId,
            ...(trendsPrefs.optedIn && {
                shareInGlobalTrends: true,
                userRegion: trendsPrefs.location?.region,
                userCountry: trendsPrefs.location?.country,
            }),
        };
        setDreams(prev => [newDream, ...prev]);
        setSleepEntries(prev => prev.map(e =>
            e.id === sleepEntryId ? { ...e, dreamIds: [...e.dreamIds, newDream.id] } : e
        ));
        enqueueAction('ADD_DREAM', newDream);
        return newDream.id;
    }, [sleepEntries, setDreams, setSleepEntries]);

    // Notify AlarmContext when alarm is deleted (handled via onAlarmDeleted prop in AlarmProvider)
    // This context handles clearing its own session when alarms change (via the effect above)

    const value = useMemo(() => ({
        activeSleepSession, activeSleepAids, pendingSleepData,
        startSleepSession, ensureSleepSession, updateSleepSessionData,
        logSoundActivity, logBreathingActivity, saveWakeData,
        finalizeSleepSession, createSleepEntryForSession, clearSleepSession,
        setActiveSleepAid, clearActiveSleepAids, setPendingSleepData,
        sleepEntries, addSleepEntry, updateSleepEntry, deleteSleepEntry, getSleepEntryById,
        addDream, addDreamToSleepEntry,
    }), [
        activeSleepSession, activeSleepAids, pendingSleepData,
        startSleepSession, ensureSleepSession, updateSleepSessionData,
        logSoundActivity, logBreathingActivity, saveWakeData,
        finalizeSleepSession, createSleepEntryForSession, clearSleepSession,
        setPendingSleepData,
        sleepEntries, addSleepEntry, updateSleepEntry, deleteSleepEntry, getSleepEntryById,
        addDream, addDreamToSleepEntry,
    ]);

    return <SleepSessionContext.Provider value={value}>{children}</SleepSessionContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSleepSession = (): SleepSessionContextType => {
    const context = useContext(SleepSessionContext);
    if (context === undefined) {
        throw new Error('useSleepSession must be used within a SleepSessionProvider');
    }
    return context;
};
