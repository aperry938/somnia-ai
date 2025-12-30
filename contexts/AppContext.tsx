import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Alarm, Dream, SleepAids, Biometrics, Theme, CoachPersonality, AnalysisPersonality, DreamMood } from '../types';
import { enqueueAction } from '../services/syncService';

interface AppContextType {
    alarms: Alarm[];
    dreams: Dream[];
    biometrics: Biometrics;
    activeSleepAids: SleepAids;
    pendingSleepData: SleepAids | null;
    addAlarm: (time: string, smartWake: boolean) => void;
    updateAlarm: (id: number, time: string, smartWake: boolean) => void;
    toggleAlarmActive: (id: number) => void;
    deleteAlarm: (id: number) => void;
    addDream: (dreamText: string, sleepQuality: number | null, mood?: DreamMood) => number;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error(error);
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
    const [themeOverride, setThemeOverride] = useLocalStorage<Theme | 'auto'>('somnia_theme_override', 'auto');
    const [coachPersonality, setCoachPersonality] = useLocalStorage<CoachPersonality>('somnia_coach_personality', 'mystical');
    const [volume, setVolume] = useLocalStorage<number>('somnia_volume', 0.5);
    const [analysisPersonality, setAnalysisPersonality] = useLocalStorage<AnalysisPersonality>('somnia_analysis_personality', 'oneironaut');
    const [isScribeOpen, setIsScribeOpen] = useState(false);

    const addAlarm = (time: string, smartWake: boolean = false) => {
        const newAlarm: Alarm = {
            id: Date.now(),
            time,
            isActive: true,
            smartWake,
            smartWindow: 30
        };
        setAlarms(prev => [...prev, newAlarm]);
        enqueueAction('ADD_ALARM', newAlarm);
    };

    const updateAlarm = (id: number, time: string, smartWake: boolean) => {
        setAlarms(prev => prev.map(a => a.id === id ? { ...a, time, smartWake } : a));
        enqueueAction('UPDATE_ALARM', { id, time, smartWake });
    };

    const toggleAlarmActive = (id: number) => {
        setAlarms(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
        // Toggle is effectively an update, but simplified for sync for now
        enqueueAction('UPDATE_ALARM', { id, isActive: 'TOGGLE' });
    };

    const deleteAlarm = (id: number) => {
        setAlarms(prev => prev.filter(a => a.id !== id));
        enqueueAction('DELETE_ALARM', { id });
    };

    const addDream = (dreamText: string, sleepQuality: number | null, mood?: DreamMood): number => {
        const newDream: Dream = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            dreamText,
            sleepQuality,
            title: "Untitled Dream",
            imageUrl: null,
            aiAnalysis: null,
            chatHistory: [],
            sleepAids: pendingSleepData ?? {},
            mood,
        };
        setDreams(prev => [newDream, ...prev]);
        setPendingSleepData(null); // Clear pending data after it has been used
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

    const value: AppContextType = {
        alarms,
        dreams,
        biometrics,
        activeSleepAids,
        pendingSleepData,
        addAlarm,
        updateAlarm,
        toggleAlarmActive,
        deleteAlarm,
        addDream,
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