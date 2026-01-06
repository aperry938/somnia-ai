// hooks/useAlarmManager.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Alarm } from '../types';
import { useClock } from './useClock';
import { useAppContext } from '../contexts/AppContext';

const SNOOZE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if an alarm should trigger today based on its days configuration
 * @param days - Array of day indices (0=Sunday, 6=Saturday). Empty = one-time alarm
 * @param currentDay - Current day of week (0-6)
 */
const shouldTriggerToday = (days: number[] | undefined, currentDay: number): boolean => {
    // One-time alarm (no days specified) - always triggers if time matches
    if (!days || days.length === 0) return true;
    // Repeating alarm - check if today is in the schedule
    return days.includes(currentDay);
};

/**
 * Manages alarm state, snooze logic, and ringing checks.
 * Polling happens every second via dependent update loop.
 */
export const useAlarmManager = () => {
    const { alarms, toggleAlarmActive, updateAlarm } = useAppContext();
    const { date } = useClock();
    const [ringingAlarm, setRingingAlarm] = useState<Alarm | null>(null);
    const [isSnoozed, setIsSnoozed] = useState(false);
    const snoozeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const snoozedAlarmRef = useRef<Alarm | null>(null);
    // Track which alarms have triggered this minute to prevent double-firing
    const triggeredThisMinuteRef = useRef<Set<string>>(new Set());
    const lastMinuteRef = useRef<string>('');

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

            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentDay = now.getDay(); // 0=Sunday, 6=Saturday
            const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

            // Reset triggered set when minute changes
            if (currentTime !== lastMinuteRef.current) {
                triggeredThisMinuteRef.current.clear();
                lastMinuteRef.current = currentTime;

                // Debug log alarm status once per minute (including soundId)
                console.log('[Alarm Check]', { currentTime, currentDay, alarms: alarms.map(a => ({ id: a.id, time: a.time, days: a.days, isActive: a.isActive, soundId: a.soundId })) });
            }

            // Check for normal alarm or smart wake
            const triggeredAlarm = alarms.find(alarm => {
                if (!alarm.isActive) return false;

                // Skip if this alarm already triggered this minute
                const alarmKey = `${alarm.id}-${currentTime}`;
                if (triggeredThisMinuteRef.current.has(alarmKey)) return false;

                // Check if alarm should trigger today (based on days configuration)
                const willTriggerToday = shouldTriggerToday(alarm.days, currentDay);
                if (!willTriggerToday) {
                    // Debug: log when an alarm is skipped due to day mismatch
                    if (alarm.time === currentTime) {
                        console.log('[Alarm Skip - Day Mismatch]', { alarmTime: alarm.time, days: alarm.days, currentDay, willTriggerToday });
                    }
                    return false;
                }

                // Normal trigger - exact time match
                if (alarm.time === currentTime) {
                    console.log('[Alarm Trigger]', { alarmId: alarm.id, alarmTime: alarm.time, currentTime, days: alarm.days, currentDay, soundId: alarm.soundId });
                    triggeredThisMinuteRef.current.add(alarmKey);
                    return true;
                }

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
                        if (Math.random() < 0.05) { // 5% chance per minute to wake up "lightly"
                            triggeredThisMinuteRef.current.add(alarmKey);
                            return true;
                        }
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
            // Sleep detection alarms (id=-1) don't need to be deactivated in storage
            if (ringingAlarm.id !== -1) {
                // Only deactivate one-time alarms (no days specified)
                // Repeating alarms stay active for the next scheduled day
                const isOneTimeAlarm = !ringingAlarm.days || ringingAlarm.days.length === 0;
                if (isOneTimeAlarm) {
                    toggleAlarmActive(ringingAlarm.id);
                }
                // For repeating alarms, just dismiss - they'll trigger again on the next scheduled day
            }

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

    /**
     * Trigger a "virtual" alarm for sleep detection.
     * Creates a temporary alarm object with the specified sound.
     */
    const triggerSleepDetectionAlarm = useCallback((soundId: string) => {
        // Don't trigger if an alarm is already ringing
        if (ringingAlarm || isSnoozed) return;

        const virtualAlarm: Alarm = {
            id: -1, // Special ID for sleep detection alarm
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            isActive: true,
            days: [], // One-time (won't deactivate anything since id=-1)
            soundId: soundId,
            smartWake: false,
        };
        setRingingAlarm(virtualAlarm);
    }, [ringingAlarm, isSnoozed]);

    return { ringingAlarm, stopRinging, snooze, isSnoozed, triggerSleepDetectionAlarm };
};
