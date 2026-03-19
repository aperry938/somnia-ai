import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { Alarm, AlarmPurpose } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { isAlarmArray } from '../utils/validators';
import { generateSecureId } from '../utils/id';
import { enqueueAction } from '../services/syncService';
import { logger } from '../services/logger';
import * as NativeAlarm from '../services/nativeAlarmService';

interface AlarmContextType {
    alarms: Alarm[];
    addAlarm: (time: string, smartWake: boolean, days?: number[], soundId?: string, purpose?: AlarmPurpose, label?: string) => number;
    updateAlarm: (id: number, time: string, smartWake: boolean, days?: number[], soundId?: string, purpose?: AlarmPurpose, label?: string) => void;
    toggleAlarmActive: (id: number) => void;
    deleteAlarm: (id: number) => void;
    getNextActiveAlarm: () => Alarm | null;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

export const AlarmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [alarms, setAlarms] = useLocalStorage<Alarm[]>('somnia_alarms', [], isAlarmArray);

    const addAlarm = useCallback((time: string, smartWake: boolean = false, days: number[] = [], soundId: string = 'somnia', purpose: AlarmPurpose = 'sleep', label?: string): number => {
        const newAlarm: Alarm = {
            id: generateSecureId(),
            time,
            isActive: true,
            smartWake,
            smartWindow: 30,
            days,
            soundId,
            purpose,
            label
        };
        logger.log('[AlarmContext] Creating new alarm:', newAlarm);
        setAlarms(prev => [...prev, newAlarm]);
        enqueueAction('ADD_ALARM', newAlarm);

        if (NativeAlarm.isNative) {
            if (days && days.length > 0) {
                NativeAlarm.scheduleRecurringAlarm(newAlarm.id, time, days, label || 'Somnia Alarm', soundId);
            } else {
                NativeAlarm.scheduleAlarm(newAlarm.id, time, label || 'Somnia Alarm', soundId);
            }
        }

        return newAlarm.id;
    }, [setAlarms]);

    const getNextActiveAlarm = useCallback((): Alarm | null => {
        const activeAlarms = alarms.filter(a => a.isActive);
        if (activeAlarms.length === 0) return null;

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const currentDay = now.getDay();

        let soonest: Alarm | null = null;
        let soonestDiff = Infinity;

        for (const alarm of activeAlarms) {
            const [h, m] = alarm.time.split(':').map(Number);
            const alarmMinutes = (h ?? 0) * 60 + (m ?? 0);

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

    const updateAlarm = useCallback((id: number, time: string, smartWake: boolean, days: number[] = [], soundId: string = 'somnia', purpose: AlarmPurpose = 'sleep', label?: string) => {
        setAlarms(prev => {
            const existingAlarm = prev.find(a => a.id === id);
            enqueueAction('UPDATE_ALARM', { id, time, smartWake, days, soundId, purpose, label, isActive: existingAlarm?.isActive ?? true });
            return prev.map(a => {
                if (a.id !== id) return a;
                return { ...a, time, smartWake, days, soundId, purpose, label };
            });
        });
    }, [setAlarms]);

    const toggleAlarmActive = useCallback((id: number) => {
        setAlarms(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
        enqueueAction('UPDATE_ALARM', { id, isActive: 'TOGGLE' });
    }, [setAlarms]);

    const deleteAlarm = useCallback((id: number) => {
        setAlarms(prev => prev.filter(a => a.id !== id));
        enqueueAction('DELETE_ALARM', { id });
        if (NativeAlarm.isNative) {
            NativeAlarm.cancelAlarm(id);
        }
    }, [setAlarms]);

    const value = useMemo(() => ({
        alarms, addAlarm, updateAlarm, toggleAlarmActive, deleteAlarm, getNextActiveAlarm,
    }), [alarms, addAlarm, updateAlarm, toggleAlarmActive, deleteAlarm, getNextActiveAlarm]);

    return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAlarms = (): AlarmContextType => {
    const context = useContext(AlarmContext);
    if (context === undefined) {
        throw new Error('useAlarms must be used within an AlarmProvider');
    }
    return context;
};
