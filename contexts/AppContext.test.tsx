/**
 * Tests for AppContext
 * Tests state management and LocalStorage persistence
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

// Wrapper component for testing hooks
const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AppProvider>{children}</AppProvider>
);

describe('AppContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('Dream Management', () => {
        it('should add a new dream', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            act(() => {
                result.current.addDream('I was flying over mountains.', 4);
            });

            expect(result.current.dreams).toHaveLength(1);
            expect(result.current.dreams[0].dreamText).toBe('I was flying over mountains.');
            expect(result.current.dreams[0].sleepQuality).toBe(4);
        });

        it('should persist dreams to localStorage', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            act(() => {
                result.current.addDream('Test dream', 3);
            });

            const stored = JSON.parse(localStorageMock.getItem('somnia_dreams') || '[]');
            expect(stored).toHaveLength(1);
        });

        it('should delete a dream', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            let dreamId: number;
            act(() => {
                dreamId = result.current.addDream('Dream to delete', 3);
            });

            expect(result.current.dreams).toHaveLength(1);

            act(() => {
                result.current.deleteDream(dreamId);
            });

            expect(result.current.dreams).toHaveLength(0);
        });

        it('should update a dream', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            let dreamId: number;
            act(() => {
                dreamId = result.current.addDream('Original text', 3);
            });

            act(() => {
                result.current.updateDream({ id: dreamId, title: 'Updated Title' });
            });

            expect(result.current.dreams[0].title).toBe('Updated Title');
        });

        it('should get dream by ID', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            let dreamId: number;
            act(() => {
                dreamId = result.current.addDream('Findable dream', 5);
            });

            const found = result.current.getDreamById(dreamId);
            expect(found).toBeDefined();
            expect(found?.dreamText).toBe('Findable dream');
        });
    });

    describe('Alarm Management', () => {
        it('should add a new alarm', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            act(() => {
                result.current.addAlarm('07:00', false);
            });

            expect(result.current.alarms).toHaveLength(1);
            expect(result.current.alarms[0].time).toBe('07:00');
        });

        it('should toggle alarm active state', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            act(() => {
                result.current.addAlarm('06:30', true);
            });

            const alarmId = result.current.alarms[0].id;
            expect(result.current.alarms[0].isActive).toBe(true);

            act(() => {
                result.current.toggleAlarmActive(alarmId);
            });

            expect(result.current.alarms[0].isActive).toBe(false);
        });

        it('should delete an alarm', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            act(() => {
                result.current.addAlarm('08:00', false);
            });

            const alarmId = result.current.alarms[0].id;

            act(() => {
                result.current.deleteAlarm(alarmId);
            });

            expect(result.current.alarms).toHaveLength(0);
        });
    });

    describe('Biometrics', () => {
        it('should update biometrics', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            act(() => {
                result.current.setBiometrics({ age: 30, gender: 'female', avgSleep: 7 });
            });

            expect(result.current.biometrics.age).toBe(30);
            expect(result.current.biometrics.gender).toBe('female');
            expect(result.current.biometrics.avgSleep).toBe(7);
        });
    });

    describe('Theme Override', () => {
        it('should cycle through theme modes', () => {
            const { result } = renderHook(() => useAppContext(), { wrapper });

            expect(result.current.themeOverride).toBe('auto');

            act(() => {
                result.current.setThemeOverride('day');
            });

            expect(result.current.themeOverride).toBe('day');

            act(() => {
                result.current.setThemeOverride('night');
            });

            expect(result.current.themeOverride).toBe('night');
        });
    });
});
