// hooks/useAlarmManager.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Alarm } from '../types';
import { useClock } from './useClock';
import { useAppContext } from '../contexts/AppContext';

const SNOOZE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Manages alarm state, snooze logic, and ringing checks.
 * Polling happens every second via dependent update loop.
 */
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
        const checkAlarms = async () => {
            // Don't check if one is already ringing or snoozed
            if (ringingAlarm || isSnoozed) return;

            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

            // Check for normal alarm or smart wake
            const triggeredAlarm = alarms.find(alarm => {
                if (!alarm.isActive) return false;

                // Normal trigger
                if (alarm.time === currentTime) return true;

                // Smart Wake logic
                if (alarm.smartWake) {
                    const [ah, am] = alarm.time.split(':').map(Number);
                    const alarmDate = new Date();
                    alarmDate.setHours(ah, am, 0, 0);

                    // If alarm is tomorrow (e.g. alarm 7am, now 11pm), naive check assumes today
                    // Simple check: Is current time within [Alarm - Window, Alarm)?
                    const windowMins = alarm.smartWindow || 30;
                    const diffMs = alarmDate.getTime() - now.getTime();
                    const diffMins = diffMs / 60000;

                    if (diffMins > 0 && diffMins <= windowMins) {
                        // In window. Check stage.
                        // We need to do this async, but useEffect loop is sync. 
                        // For simplicity, we trigger randomly based on "Light Sleep" probability
                        // In a real app, calls to healthService would handle this statefully.
                        // Let's rely on a pseudo-random chance for the mock to avoid async loops blocking
                        return Math.random() < 0.05; // 5% chance per minute to wake up "lightly"
                    }
                }
                return false;
            });

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
