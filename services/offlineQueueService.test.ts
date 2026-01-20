/**
 * Offline Queue Service Tests
 * Tests for offline dream analysis queue management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    isOnline,
    queueForAnalysis,
    isQueued,
    removeFromQueue,
    getQueueLength,
    clearQueue
} from './offlineQueueService';

// Mock navigator.onLine
let mockOnline = true;
Object.defineProperty(navigator, 'onLine', {
    get: () => mockOnline,
    configurable: true,
});

describe('offlineQueueService', () => {
    beforeEach(() => {
        // Clear the queue before each test
        clearQueue();
        vi.clearAllMocks();
        mockOnline = true;
    });

    describe('isOnline', () => {
        it('should return true when navigator.onLine is true', () => {
            mockOnline = true;
            expect(isOnline()).toBe(true);
        });

        it('should return false when navigator.onLine is false', () => {
            mockOnline = false;
            expect(isOnline()).toBe(false);
        });
    });

    describe('queueForAnalysis', () => {
        it('should add item to queue', () => {
            queueForAnalysis(123, 'Test dream text');
            expect(getQueueLength()).toBe(1);
            expect(isQueued(123)).toBe(true);
        });

        it('should not add duplicate dreamId', () => {
            queueForAnalysis(123, 'Test dream text');
            queueForAnalysis(123, 'Test dream text'); // duplicate
            expect(getQueueLength()).toBe(1);
        });

        it('should add multiple different dreamIds', () => {
            queueForAnalysis(123, 'Test dream 1');
            queueForAnalysis(456, 'Test dream 2');
            expect(getQueueLength()).toBe(2);
        });
    });

    describe('isQueued', () => {
        it('should return true if dreamId is in queue', () => {
            queueForAnalysis(123, 'Test dream');
            expect(isQueued(123)).toBe(true);
        });

        it('should return false if dreamId is not in queue', () => {
            queueForAnalysis(456, 'Test dream');
            expect(isQueued(123)).toBe(false);
        });

        it('should return false for empty queue', () => {
            expect(isQueued(123)).toBe(false);
        });
    });

    describe('removeFromQueue', () => {
        it('should remove item from queue', () => {
            queueForAnalysis(123, 'Test dream 1');
            queueForAnalysis(456, 'Test dream 2');
            removeFromQueue(123);
            expect(getQueueLength()).toBe(1);
            expect(isQueued(123)).toBe(false);
            expect(isQueued(456)).toBe(true);
        });

        it('should handle removing non-existent item', () => {
            queueForAnalysis(123, 'Test dream');
            removeFromQueue(999); // doesn't exist
            expect(getQueueLength()).toBe(1);
        });
    });

    describe('getQueueLength', () => {
        it('should return number of items in queue', () => {
            queueForAnalysis(123, 'Test dream 1');
            queueForAnalysis(456, 'Test dream 2');
            expect(getQueueLength()).toBe(2);
        });

        it('should return 0 for empty queue', () => {
            expect(getQueueLength()).toBe(0);
        });
    });

    describe('clearQueue', () => {
        it('should remove all items from queue', () => {
            queueForAnalysis(123, 'Test dream 1');
            queueForAnalysis(456, 'Test dream 2');
            clearQueue();
            expect(getQueueLength()).toBe(0);
        });
    });
});
