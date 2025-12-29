// hooks/useAlarmManager.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Alarm } from '../types';
import { useClock } from './useClock';
import { useAppContext } from '../contexts/AppContext';

const SNOOZE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const useAlarmManager = () => {
    const { alarms, toggleAlarmActive } = useAppContext();
    const { date } = useClock();
    const [ringingAlarm, setRingingAlarm] = useState<Alarm | null>(null);
    const [isSnoozed, setIsSnoozed] = useState(false);
    const snoozeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const snoozedAlarmRef = useRef<Alarm | null>(null);

    // Cleanup snooze timeout on unmount
    useEffect(() => {
        return () => {
            if (snoozeTimeoutRef.current) {
                clearTimeout(snoozeTimeoutRef.current);
            }
        };
    }, []);

    // Check for triggered alarms
    useEffect(() => {
        const checkAlarms = () => {
            // Don't check if one is already ringing or snoozed
            if (ringingAlarm || isSnoozed) return;

            const currentTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            const triggeredAlarm = alarms.find(alarm => alarm.time === currentTime && alarm.isActive);

            if (triggeredAlarm) {
                setRingingAlarm(triggeredAlarm);
            }
        };

        checkAlarms();
    }, [date, alarms, ringingAlarm, isSnoozed]);

    const stopRinging = useCallback(() => {
        if (ringingAlarm) {
            // Deactivate the alarm so it doesn't ring again the next minute
            toggleAlarmActive(ringingAlarm.id);
            setRingingAlarm(null);
            setIsSnoozed(false);
            snoozedAlarmRef.current = null;

            // Clear any pending snooze timeout
            if (snoozeTimeoutRef.current) {
                clearTimeout(snoozeTimeoutRef.current);
                snoozeTimeoutRef.current = null;
            }
        }
    }, [ringingAlarm, toggleAlarmActive]);

    const snooze = useCallback(() => {
        if (ringingAlarm) {
            // Store the alarm for re-triggering
            snoozedAlarmRef.current = ringingAlarm;

            // Dismiss the current ring
            setRingingAlarm(null);
            setIsSnoozed(true);

            // Set timeout to re-trigger after snooze duration
            snoozeTimeoutRef.current = setTimeout(() => {
                if (snoozedAlarmRef.current) {
                    setRingingAlarm(snoozedAlarmRef.current);
                    setIsSnoozed(false);
                    snoozedAlarmRef.current = null;
                }
            }, SNOOZE_DURATION_MS);
        }
    }, [ringingAlarm]);

    return { ringingAlarm, stopRinging, snooze, isSnoozed };
};
