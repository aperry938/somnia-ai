/**
 * Sleep Session Flow Integration Tests
 *
 * Tests the complete user journey:
 * Alarm → Sleep Session → Sleep Gateway → Dream Entry → Session Finalize
 *
 * These tests verify cross-feature interactions and state transitions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AppProvider, useAppContext } from '../contexts/AppContext';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock nativeAlarmService to prevent native code execution
vi.mock('../services/nativeAlarmService', () => ({
    isNative: false,
    scheduleAlarm: vi.fn(),
    scheduleRecurringAlarm: vi.fn(),
    cancelAlarm: vi.fn(),
    requestPermissions: vi.fn().mockResolvedValue(true),
}));

// Mock syncService to prevent network calls
vi.mock('../services/syncService', () => ({
    enqueueAction: vi.fn(),
}));

// Mock dreamTrendsService
vi.mock('../services/dreamTrendsService', () => ({
    getGlobalTrendsPrefs: vi.fn().mockReturnValue({ optedIn: false }),
}));

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AppProvider>{children}</AppProvider>
);

describe('Sleep Session Flow Integration', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Complete Flow: Alarm → Session → Dream', () => {
        it('should complete full sleep session flow with alarm', async () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            // Step 1: Create alarm
            let alarmId: number = 0;
            act(() => {
                alarmId = result.current.addAlarm('07:00', false, [], 'somnia', 'sleep');
            });
            expect(result.current.alarms).toHaveLength(1);
            expect(result.current.alarms[0]?.time).toBe('07:00');

            // Step 2: Start sleep session linked to alarm
            act(() => {
                result.current.startSleepSession(alarmId);
            });
            expect(result.current.activeSleepSession).not.toBeNull();
            expect(result.current.activeSleepSession?.alarmId).toBe(alarmId);
            expect(result.current.activeSleepSession?.alarmTime).toBe('07:00');
            expect(result.current.activeSleepSession?.isActive).toBe(true);

            // Step 3: Log pre-sleep data (Sleep Gateway)
            act(() => {
                result.current.updateSleepSessionData({
                    dayRating: 4,
                    dayNotes: 'Productive day, felt energized',
                    checklist: ['No caffeine after 2pm', 'Read before bed'],
                });
            });
            expect(result.current.activeSleepSession?.sleepGatewayData.dayRating).toBe(4);

            // Step 4: Log sound activity
            act(() => {
                result.current.logSoundActivity('Ocean Waves', 1800); // 30 minutes
            });
            expect(result.current.activeSleepSession?.sleepGatewayData.soundsPlayed).toHaveLength(1);
            expect(result.current.activeSleepSession?.sleepGatewayData.totalPrepTime).toBe(1800);

            // Step 5: Log breathing exercise
            act(() => {
                result.current.logBreathingActivity('4-7-8 Technique', 300); // 5 minutes
            });
            expect(result.current.activeSleepSession?.sleepGatewayData.breathingExercises).toHaveLength(1);
            expect(result.current.activeSleepSession?.sleepGatewayData.totalPrepTime).toBe(2100);

            // Step 6: Save wake data (alarm dismissed)
            act(() => {
                result.current.saveWakeData({
                    snoozeCount: 1,
                    timeToSilence: 45,
                    alertnessBoostUsed: true,
                    alarmType: 'smart',
                });
            });
            expect(result.current.activeSleepSession?.wakeData?.snoozeCount).toBe(1);

            // Step 7: Log dream (should create sleep entry and link everything)
            let dreamId: number = 0;
            act(() => {
                dreamId = result.current.addDream(
                    'I was flying over a beautiful ocean, feeling completely free.',
                    4,
                    'joyful'
                );
            });

            // Verify dream was created
            expect(result.current.dreams).toHaveLength(1);
            expect(result.current.dreams[0]?.dreamText).toContain('flying over a beautiful ocean');
            expect(result.current.dreams[0]?.sleepQuality).toBe(4);
            expect(result.current.dreams[0]?.mood).toBe('joyful');

            // Verify sleep entry was created with all data
            expect(result.current.sleepEntries).toHaveLength(1);
            const entry = result.current.sleepEntries[0];
            expect(entry?.sleepQuality).toBe(4);
            expect(entry?.sleepAids?.dayRating).toBe(4);
            expect(entry?.wakeData?.snoozeCount).toBe(1);
            expect(entry?.dreamIds).toContain(dreamId);

            // Verify session was cleared
            expect(result.current.activeSleepSession).toBeNull();
        });

        it('should link dream to existing sleep entry when session has sleepEntryId', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            // Create alarm and start session
            let alarmId: number = 0;
            act(() => {
                alarmId = result.current.addAlarm('06:30', false);
            });

            act(() => {
                result.current.startSleepSession(alarmId);
                result.current.updateSleepSessionData({ dayRating: 3 });
            });

            // Create entry for session (simulates completing Sleep Gateway)
            let entryId: number | null = null;
            act(() => {
                entryId = result.current.createSleepEntryForSession();
            });
            expect(entryId).not.toBeNull();
            expect(result.current.sleepEntries).toHaveLength(1);

            // Log dream - should link to existing entry
            act(() => {
                result.current.addDream('A vivid dream about space exploration.', 5);
            });

            expect(result.current.sleepEntries).toHaveLength(1); // No new entry
            expect(result.current.sleepEntries[0]?.dreamIds).toHaveLength(1);
            expect(result.current.sleepEntries[0]?.sleepQuality).toBe(5);
        });
    });

    describe('Session Without Alarm (Soundscape Auto-Start)', () => {
        it('should create session when ensureSleepSession is called', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            expect(result.current.activeSleepSession).toBeNull();

            act(() => {
                result.current.ensureSleepSession();
            });

            expect(result.current.activeSleepSession).not.toBeNull();
            expect(result.current.activeSleepSession?.alarmId).toBeNull();
            expect(result.current.activeSleepSession?.isActive).toBe(true);
        });

        it('should not create duplicate session if one exists', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            act(() => {
                result.current.ensureSleepSession();
            });

            const sessionId = result.current.activeSleepSession?.id;

            act(() => {
                result.current.ensureSleepSession();
            });

            // Same session should exist
            expect(result.current.activeSleepSession?.id).toBe(sessionId);
        });
    });

    describe('Session Finalization Without Dream', () => {
        it('should finalize session and create entry without dream', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            // Start session and add data
            act(() => {
                result.current.ensureSleepSession();
                result.current.updateSleepSessionData({ dayRating: 2, dayNotes: 'Rough day' });
                result.current.logSoundActivity('Rain', 900);
            });

            // Finalize without dream
            act(() => {
                result.current.finalizeSleepSession({ alertnessBoostUsed: false });
            });

            // Entry should be created but with no dreams
            expect(result.current.sleepEntries).toHaveLength(1);
            expect(result.current.sleepEntries[0]?.dreamIds).toHaveLength(0);
            expect(result.current.sleepEntries[0]?.sleepAids?.dayRating).toBe(2);
            expect(result.current.sleepEntries[0]?.wakeData?.alertnessBoostUsed).toBe(false);

            // Session should be cleared
            expect(result.current.activeSleepSession).toBeNull();
        });

        it('should update existing entry when finalizing session with sleepEntryId', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            // Create session first (separate act for state to propagate)
            act(() => {
                result.current.ensureSleepSession();
            });

            // Update session data
            act(() => {
                result.current.updateSleepSessionData({ dayRating: 4 });
            });

            // Create entry for session
            act(() => {
                result.current.createSleepEntryForSession();
            });

            expect(result.current.sleepEntries).toHaveLength(1);

            // Add wake data
            act(() => {
                result.current.saveWakeData({
                    snoozeCount: 2,
                    timeToSilence: 30,
                    alertnessBoostUsed: true,
                    alarmType: 'manual',
                });
            });

            // Finalize
            act(() => {
                result.current.finalizeSleepSession();
            });

            // Should update existing entry, not create new one
            expect(result.current.sleepEntries).toHaveLength(1);
            expect(result.current.sleepEntries[0]?.wakeData?.snoozeCount).toBe(2);
        });
    });

    describe('Alarm-Session Relationship', () => {
        it('should clear session when linked alarm is deleted', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            // Create alarm first
            let alarmId: number = 0;
            act(() => {
                alarmId = result.current.addAlarm('07:30', false);
            });

            // Start session linked to alarm (separate act for state propagation)
            act(() => {
                result.current.startSleepSession(alarmId);
            });

            expect(result.current.activeSleepSession?.alarmId).toBe(alarmId);

            act(() => {
                result.current.deleteAlarm(alarmId);
            });

            // Session should be cleared when alarm is deleted
            expect(result.current.activeSleepSession).toBeNull();
        });

        it('should NOT clear session when alarm is toggled inactive', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            let alarmId: number = 0;
            act(() => {
                alarmId = result.current.addAlarm('08:00', false);
                result.current.startSleepSession(alarmId);
            });

            const sessionId = result.current.activeSleepSession?.id;

            act(() => {
                result.current.toggleAlarmActive(alarmId);
            });

            // Session should persist when alarm is just deactivated
            expect(result.current.activeSleepSession?.id).toBe(sessionId);
        });

        it('should get next active alarm correctly', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            // Add multiple alarms
            act(() => {
                result.current.addAlarm('06:00', false); // Earlier
                result.current.addAlarm('09:00', false); // Later
            });

            const nextAlarm = result.current.getNextActiveAlarm();
            expect(nextAlarm).not.toBeNull();
            // Should return one of the alarms (depends on current time)
            expect(['06:00', '09:00']).toContain(nextAlarm?.time);
        });
    });

    describe('Multiple Dreams in Session', () => {
        it('should allow adding multiple dreams to same sleep entry', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            // Create entry first
            let entryId: number = 0;
            act(() => {
                entryId = result.current.addSleepEntry(
                    new Date().toISOString().split('T')[0] ?? '',
                    null
                );
            });

            // Add multiple dreams to the entry
            act(() => {
                result.current.addDreamToSleepEntry(entryId, 'First dream about flying.');
                result.current.addDreamToSleepEntry(entryId, 'Second dream about swimming.');
            });

            expect(result.current.dreams).toHaveLength(2);
            expect(result.current.sleepEntries[0]?.dreamIds).toHaveLength(2);

            // Both dreams should reference the same entry
            expect(result.current.dreams[0]?.sleepEntryId).toBe(entryId);
            expect(result.current.dreams[1]?.sleepEntryId).toBe(entryId);
        });
    });

    describe('Session State Persistence', () => {
        it('should persist session to localStorage', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            act(() => {
                result.current.ensureSleepSession();
                result.current.updateSleepSessionData({ dayRating: 5 });
            });

            const stored = localStorageMock.getItem('somnia_active_sleep_session');
            expect(stored).not.toBeNull();

            const parsed = JSON.parse(stored ?? '{}');
            expect(parsed.sleepGatewayData.dayRating).toBe(5);
        });

        it('should clear session from localStorage after dream logged', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            act(() => {
                result.current.ensureSleepSession();
                result.current.addDream('Test dream', 3);
            });

            const stored = localStorageMock.getItem('somnia_active_sleep_session');
            expect(stored).toBe('null');
        });
    });

    describe('Edge Cases', () => {
        it('should handle session with no sleep data', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            act(() => {
                result.current.ensureSleepSession();
            });

            // Log dream immediately without any sleep gateway data
            act(() => {
                result.current.addDream('Quick dream log.', 3);
            });

            expect(result.current.dreams).toHaveLength(1);
            expect(result.current.sleepEntries).toHaveLength(1);
            expect(result.current.activeSleepSession).toBeNull();
        });

        it('should handle clearSleepSession explicitly', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            act(() => {
                result.current.ensureSleepSession();
                result.current.updateSleepSessionData({ dayRating: 4 });
            });

            expect(result.current.activeSleepSession).not.toBeNull();

            act(() => {
                result.current.clearSleepSession();
            });

            expect(result.current.activeSleepSession).toBeNull();
        });

        it('should not crash when finalizing empty session', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            // Try to finalize when no session exists
            act(() => {
                result.current.finalizeSleepSession();
            });

            // Should not throw, just be a no-op
            expect(result.current.activeSleepSession).toBeNull();
        });
    });
});
