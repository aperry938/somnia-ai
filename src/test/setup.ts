
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Create a proper localStorage mock for test environments
const createLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    };
};

// Stub localStorage globally for all tests
const localStorageMock = createLocalStorageMock();
vi.stubGlobal('localStorage', localStorageMock);

// Clear localStorage before each test to ensure isolation
beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
});

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
    cleanup();
});
