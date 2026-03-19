/**
 * AppContext — Compatibility layer that composes focused contexts.
 *
 * All state and logic now lives in:
 *   - AlarmContext (alarm CRUD, scheduling)
 *   - DreamContext (dream CRUD, import/export)
 *   - SleepSessionContext (session lifecycle, sleep entries, cross-cutting dream creation)
 *   - PreferencesContext (theme, volume, personalities, art style)
 *
 * useAppContext() is preserved for backward compatibility — consumers can migrate
 * incrementally to the focused hooks (useAlarms, useDreams, useSleepSession, usePreferences).
 */
import React, { ReactNode } from 'react';
import { Alarm, Dream, SleepAids, Biometrics, Theme, CoachPersonality, AnalysisPersonality, DreamMood, SleepSession, AlarmPurpose, SleepEntry, WakeData } from '../types';
import { AlarmProvider, useAlarms } from './AlarmContext';
import { DreamProvider, useDreams } from './DreamContext';
import { SleepSessionProvider, useSleepSession } from './SleepSessionContext';
import { PreferencesProvider, usePreferences, ArtStyle } from './PreferencesContext';

// Re-export ArtStyle for consumers that import it from AppContext
export type { ArtStyle };

interface AppContextType {
    alarms: Alarm[];
    dreams: Dream[];
    biometrics: Biometrics;
    activeSleepAids: SleepAids;
    pendingSleepData: SleepAids | null;
    activeSleepSession: SleepSession | null;
    startSleepSession: (alarmId?: number) => void;
    ensureSleepSession: () => void;
    updateSleepSessionData: (data: Partial<SleepAids>) => void;
    logSoundActivity: (name: string, durationSeconds: number) => void;
    logBreathingActivity: (name: string, durationSeconds: number) => void;
    saveWakeData: (wakeData: WakeData) => void;
    finalizeSleepSession: (options?: { alertnessBoostUsed?: boolean }) => void;
    createSleepEntryForSession: () => number | null;
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
    lastSeenDreamCount: number;
    markDreamsAsSeen: () => void;
    getUnreadDreamCount: () => number;
    artStyle: ArtStyle;
    setArtStyle: (style: ArtStyle) => void;
    sleepEntries: SleepEntry[];
    addSleepEntry: (date: string, sleepQuality: number | null, notes?: string, sleepAids?: SleepAids, alarmTime?: string, alarmSoundId?: string, wakeData?: WakeData) => number;
    updateSleepEntry: (entry: Partial<SleepEntry> & { id: number }) => void;
    deleteSleepEntry: (id: number) => void;
    getSleepEntryById: (id: number) => SleepEntry | undefined;
    addDreamToSleepEntry: (sleepEntryId: number, dreamText: string, mood?: DreamMood) => number;
}

/**
 * Inner component that wires AlarmContext → SleepSessionContext.
 * SleepSessionContext needs alarms and getNextActiveAlarm from AlarmContext,
 * and dreams/setDreams from DreamContext. This component bridges them.
 */
const SleepSessionBridge: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { alarms, getNextActiveAlarm } = useAlarms();
    const { dreams, setDreams } = useDreams();

    return (
        <SleepSessionProvider
            alarms={alarms}
            getNextActiveAlarm={getNextActiveAlarm}
            dreams={dreams}
            setDreams={setDreams}
        >
            {children}
        </SleepSessionProvider>
    );
};

/**
 * Composed provider that nests all focused contexts in the correct dependency order:
 * PreferencesProvider → DreamProvider → AlarmProvider → SleepSessionProvider
 */
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <PreferencesProvider>
            <DreamProvider>
                <AlarmProvider>
                    <SleepSessionBridge>
                        {children}
                    </SleepSessionBridge>
                </AlarmProvider>
            </DreamProvider>
        </PreferencesProvider>
    );
};

/**
 * Backward-compatible hook that aggregates all focused contexts.
 * New code should prefer useAlarms(), useDreams(), useSleepSession(), usePreferences().
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = (): AppContextType => {
    const alarmCtx = useAlarms();
    const dreamCtx = useDreams();
    const sessionCtx = useSleepSession();
    const prefsCtx = usePreferences();

    return {
        // Alarms
        alarms: alarmCtx.alarms,
        addAlarm: alarmCtx.addAlarm,
        updateAlarm: alarmCtx.updateAlarm,
        toggleAlarmActive: alarmCtx.toggleAlarmActive,
        deleteAlarm: alarmCtx.deleteAlarm,
        getNextActiveAlarm: alarmCtx.getNextActiveAlarm,
        // Dreams
        dreams: dreamCtx.dreams,
        addPastDream: dreamCtx.addPastDream,
        updateDream: dreamCtx.updateDream,
        getDreamById: dreamCtx.getDreamById,
        deleteDream: dreamCtx.deleteDream,
        importDreams: dreamCtx.importDreams,
        lastSeenDreamCount: dreamCtx.lastSeenDreamCount,
        markDreamsAsSeen: dreamCtx.markDreamsAsSeen,
        getUnreadDreamCount: dreamCtx.getUnreadDreamCount,
        // Sleep session + entries
        activeSleepSession: sessionCtx.activeSleepSession,
        activeSleepAids: sessionCtx.activeSleepAids,
        pendingSleepData: sessionCtx.pendingSleepData,
        startSleepSession: sessionCtx.startSleepSession,
        ensureSleepSession: sessionCtx.ensureSleepSession,
        updateSleepSessionData: sessionCtx.updateSleepSessionData,
        logSoundActivity: sessionCtx.logSoundActivity,
        logBreathingActivity: sessionCtx.logBreathingActivity,
        saveWakeData: sessionCtx.saveWakeData,
        finalizeSleepSession: sessionCtx.finalizeSleepSession,
        createSleepEntryForSession: sessionCtx.createSleepEntryForSession,
        clearSleepSession: sessionCtx.clearSleepSession,
        setActiveSleepAid: sessionCtx.setActiveSleepAid,
        clearActiveSleepAids: sessionCtx.clearActiveSleepAids,
        setPendingSleepData: sessionCtx.setPendingSleepData,
        sleepEntries: sessionCtx.sleepEntries,
        addSleepEntry: sessionCtx.addSleepEntry,
        updateSleepEntry: sessionCtx.updateSleepEntry,
        deleteSleepEntry: sessionCtx.deleteSleepEntry,
        getSleepEntryById: sessionCtx.getSleepEntryById,
        addDream: sessionCtx.addDream,
        addDreamToSleepEntry: sessionCtx.addDreamToSleepEntry,
        // Preferences
        biometrics: prefsCtx.biometrics,
        setBiometrics: prefsCtx.setBiometrics,
        themeOverride: prefsCtx.themeOverride,
        setThemeOverride: prefsCtx.setThemeOverride,
        isScribeOpen: prefsCtx.isScribeOpen,
        setIsScribeOpen: prefsCtx.setIsScribeOpen,
        coachPersonality: prefsCtx.coachPersonality,
        setCoachPersonality: prefsCtx.setCoachPersonality,
        volume: prefsCtx.volume,
        setVolume: prefsCtx.setVolume,
        analysisPersonality: prefsCtx.analysisPersonality,
        setAnalysisPersonality: prefsCtx.setAnalysisPersonality,
        artStyle: prefsCtx.artStyle,
        setArtStyle: prefsCtx.setArtStyle,
    };
};
