/**
 * Test Utilities for Somnia.ai
 * Provides custom render functions with all necessary providers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AppProvider } from '../contexts/AppContext';
import { ToastProvider } from '../components/shared/Toast';
import { Dream, Alarm, Biometrics, SleepAids } from '../types';

// Default mock data factories
export const createMockDream = (overrides: Partial<Dream> = {}): Dream => ({
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    dreamText: 'A vivid dream about flying over mountains.',
    sleepQuality: 4,
    title: 'The Mountain Flight',
    imageUrl: null,
    aiAnalysis: null,
    chatHistory: [],
    tags: [],
    sleepAids: {},
    ...overrides,
});

export const createMockAlarm = (overrides: Partial<Alarm> = {}): Alarm => ({
    id: Date.now() + Math.random(),
    time: '07:00',
    isActive: true,
    smartWake: false,
    smartWindow: 30,
    ...overrides,
});

export const createMockBiometrics = (overrides: Partial<Biometrics> = {}): Biometrics => ({
    age: 30,
    gender: 'prefer-not-to-say',
    avgSleep: 7.5,
    ...overrides,
});

export const createMockSleepAids = (overrides: Partial<SleepAids> = {}): SleepAids => ({
    sound: 'White Noise',
    soundDuration: 30,
    dayRating: 4,
    dayNotes: 'Had a productive day',
    ...overrides,
});

// All providers wrapper
interface AllProvidersProps {
    children: React.ReactNode;
}

const AllProviders: React.FC<AllProvidersProps> = ({ children }) => {
    return (
        <AppProvider>
            <ToastProvider>
                {children}
            </ToastProvider>
        </AppProvider>
    );
};

// Custom render that includes all providers
const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render with custom render
export { customRender as render };

// Utility to wait for async operations
export const waitForAsync = (ms: number = 100) =>
    new Promise(resolve => setTimeout(resolve, ms));

// Mock localStorage
export const mockLocalStorage = () => {
    const store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    };
};

// Setup mock localStorage for tests
export const setupMockLocalStorage = () => {
    const mock = mockLocalStorage();
    Object.defineProperty(window, 'localStorage', { value: mock });
    return mock;
};
