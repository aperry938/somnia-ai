import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Alarm, Dream, SleepAids, Biometrics, Theme } from '../types';

interface AppContextType {
    alarms: Alarm[];
    dreams: Dream[];
    biometrics: Biometrics;
    activeSleepAids: SleepAids;
    pendingSleepData: SleepAids | null;
    addAlarm: (time: string) => void;
    updateAlarm: (id: number, time: string) => void;
    toggleAlarmActive: (id: number) => void;
    deleteAlarm: (id: number) => void;
    addDream: (dreamText: string, sleepQuality: number | null) => number;
    updateDream: (updatedDream: Partial<Dream> & { id: number }) => void;
    getDreamById: (id: number) => Dream | undefined;
    setActiveSleepAid: (type: keyof SleepAids, value: string | null) => void;
    clearActiveSleepAids: () => void;
    setPendingSleepData: (data: SleepAids | null) => void;
    setBiometrics: (data: Biometrics) => void;
    themeOverride: Theme | 'auto';
    setThemeOverride: (theme: Theme | 'auto') => void;
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

    const addAlarm = (time: string) => {
        const newAlarm: Alarm = { id: Date.now(), time, isActive: true };
        setAlarms(prev => [...prev, newAlarm]);
    };

    const updateAlarm = (id: number, time: string) => {
        setAlarms(prev => prev.map(a => a.id === id ? { ...a, time } : a));
    };

    const toggleAlarmActive = (id: number) => {
        setAlarms(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
    };

    const deleteAlarm = (id: number) => {
        setAlarms(prev => prev.filter(a => a.id !== id));
    };

    const addDream = (dreamText: string, sleepQuality: number | null): number => {
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
        };
        setDreams(prev => [newDream, ...prev]);
        setPendingSleepData(null); // Clear pending data after it has been used
        return newDream.id;
    };

    const updateDream = useCallback((updatedDreamPart: Partial<Dream> & { id: number }) => {
        setDreams(prev => prev.map(d => d.id === updatedDreamPart.id ? { ...d, ...updatedDreamPart } : d));
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
        setActiveSleepAid,
        clearActiveSleepAids,
        setPendingSleepData,
        setBiometrics,
        themeOverride,
        setThemeOverride,
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