/**
 * Sync Service Tests
 * Tests for offline sync queue management and conflict resolution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator.onLine
let mockOnline = true;
Object.defineProperty(navigator, 'onLine', {
    get: () => mockOnline,
    configurable: true,
});

describe('syncService', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        mockOnline = true;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getSyncQueue', () => {
        it('should return empty array when no queue exists', async () => {
            const { getSyncQueue } = await import('./syncService');
            const queue = getSyncQueue();
            expect(queue).toEqual([]);
        });

        it('should return parsed queue from localStorage', async () => {
            const mockQueue = [
                { type: 'UPSERT', dreamId: 1, status: 'PENDING', retryCount: 0 }
            ];
            localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockQueue));

            const { getSyncQueue } = await import('./syncService');
            const queue = getSyncQueue();
            expect(queue).toEqual(mockQueue);
        });

        it('should return empty array on parse error', async () => {
            localStorageMock.getItem.mockReturnValueOnce('invalid json');

            const { getSyncQueue } = await import('./syncService');
            const queue = getSyncQueue();
            expect(queue).toEqual([]);
        });
    });

    describe('getPendingCount', () => {
        it('should count only PENDING actions', async () => {
            const mockQueue = [
                { type: 'UPSERT', dreamId: 1, status: 'PENDING', retryCount: 0 },
                { type: 'UPSERT', dreamId: 2, status: 'SYNCED', retryCount: 0 },
                { type: 'UPSERT', dreamId: 3, status: 'FAILED', retryCount: 3 },
                { type: 'UPSERT', dreamId: 4, status: 'PENDING', retryCount: 1 },
            ];
            localStorageMock.getItem.mockReturnValue(JSON.stringify(mockQueue));

            const { getPendingCount } = await import('./syncService');
            const count = getPendingCount();
            expect(count).toBe(2);
        });
    });

    describe('getFailedCount', () => {
        it('should count only FAILED actions', async () => {
            const mockQueue = [
                { type: 'UPSERT', dreamId: 1, status: 'PENDING', retryCount: 0 },
                { type: 'UPSERT', dreamId: 2, status: 'FAILED', retryCount: 3 },
                { type: 'UPSERT', dreamId: 3, status: 'FAILED', retryCount: 3 },
            ];
            localStorageMock.getItem.mockReturnValue(JSON.stringify(mockQueue));

            const { getFailedCount } = await import('./syncService');
            const count = getFailedCount();
            expect(count).toBe(2);
        });
    });

    describe('retryFailedActions', () => {
        it('should reset FAILED actions to PENDING with retryCount 0', async () => {
            const mockQueue = [
                { type: 'UPSERT', dreamId: 1, status: 'FAILED', retryCount: 3 },
                { type: 'UPSERT', dreamId: 2, status: 'SYNCED', retryCount: 0 },
            ];
            localStorageMock.getItem.mockReturnValue(JSON.stringify(mockQueue));

            const { retryFailedActions } = await import('./syncService');
            retryFailedActions();

            // Check that setItem was called with updated queue
            const savedQueue = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedQueue[0].status).toBe('PENDING');
            expect(savedQueue[0].retryCount).toBe(0);
            expect(savedQueue[1].status).toBe('SYNCED'); // unchanged
        });
    });

    describe('offline handling', () => {
        it('should check navigator.onLine before processing', async () => {
            mockOnline = false;

            const { processSyncQueue } = await import('./syncService');
            const result = await processSyncQueue();

            // Should return early when offline
            expect(result).toEqual({ success: 0, failed: 0, conflictsResolved: 0 });
        });
    });
});
