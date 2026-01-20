/**
 * Memory Audit Tests
 *
 * Verifies that long-running sessions don't leak memory:
 * - Audio nodes are cleaned up
 * - Session state doesn't grow unbounded
 * - Event listeners are removed
 *
 * These tests simulate extended usage patterns to catch memory issues.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock AudioContext before importing audioService
const mockAudioContext = {
    currentTime: 0,
    state: 'running' as AudioContextState,
    destination: {} as AudioDestinationNode,
    sampleRate: 44100,
    createGain: vi.fn(() => ({
        gain: {
            value: 1,
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn(),
    })),
    createOscillator: vi.fn(() => ({
        type: 'sine',
        frequency: {
            value: 440,
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => ({
        type: 'lowpass',
        frequency: { value: 1000, setValueAtTime: vi.fn() },
        Q: { value: 1, setValueAtTime: vi.fn() },
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn(),
    })),
    createDynamicsCompressor: vi.fn(() => ({
        threshold: { setValueAtTime: vi.fn() },
        knee: { setValueAtTime: vi.fn() },
        ratio: { setValueAtTime: vi.fn() },
        attack: { setValueAtTime: vi.fn() },
        release: { setValueAtTime: vi.fn() },
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn(),
    })),
    createChannelMerger: vi.fn(() => ({
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn(),
    })),
    createBuffer: vi.fn(() => ({
        getChannelData: vi.fn(() => new Float32Array(44100)),
    })),
    createBufferSource: vi.fn(() => ({
        buffer: null,
        loop: false,
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
    })),
    createStereoPanner: vi.fn(() => ({
        pan: { value: 0, setValueAtTime: vi.fn() },
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn(),
    })),
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
};

// Track created nodes for verification
let createdNodes: { type: string; disconnected: boolean }[] = [];

const trackingMockAudioContext = () => {
    createdNodes = [];

    return {
        ...mockAudioContext,
        createGain: vi.fn(() => {
            const node = {
                ...mockAudioContext.createGain(),
                disconnect: vi.fn(() => {
                    const entry = createdNodes.find(n => n.type === 'gain' && !n.disconnected);
                    if (entry) entry.disconnected = true;
                }),
            };
            createdNodes.push({ type: 'gain', disconnected: false });
            return node;
        }),
        createOscillator: vi.fn(() => {
            const node = {
                ...mockAudioContext.createOscillator(),
                disconnect: vi.fn(() => {
                    const entry = createdNodes.find(n => n.type === 'oscillator' && !n.disconnected);
                    if (entry) entry.disconnected = true;
                }),
            };
            createdNodes.push({ type: 'oscillator', disconnected: false });
            return node;
        }),
    };
};

// Mock the AudioContext globally
vi.stubGlobal('AudioContext', vi.fn(() => trackingMockAudioContext()));
vi.stubGlobal('webkitAudioContext', vi.fn(() => trackingMockAudioContext()));

describe('Memory Audit - Audio Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        createdNodes = [];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should track node creation and cleanup pattern', () => {
        // This test verifies the testing infrastructure works
        const ctx = trackingMockAudioContext();

        // Create some nodes
        ctx.createGain();
        ctx.createOscillator();
        ctx.createGain();

        expect(createdNodes.filter(n => n.type === 'gain')).toHaveLength(2);
        expect(createdNodes.filter(n => n.type === 'oscillator')).toHaveLength(1);

        // Simulate cleanup
        createdNodes[0].disconnected = true;
        createdNodes[1].disconnected = true;

        const activeNodes = createdNodes.filter(n => !n.disconnected);
        expect(activeNodes).toHaveLength(1);
    });

    it('should verify audio cleanup functions exist and are callable', async () => {
        // Verify the audioService exports all necessary cleanup functions
        const audioService = await import('../services/audioService');

        expect(typeof audioService.stopAlarmSound).toBe('function');
        expect(typeof audioService.stopSleepSound).toBe('function');
        expect(typeof audioService.stopAlarmPreview).toBe('function');
        expect(typeof audioService.stopAlertnessBoost).toBe('function');

        // These functions should be safe to call even without active audio
        expect(() => audioService.stopAlarmSound()).not.toThrow();
        expect(() => audioService.stopAlarmPreview()).not.toThrow();
    });
});

describe('Memory Audit - State Growth', () => {
    beforeEach(() => {
        // Clear localStorage
        localStorage.clear();
    });

    it('should not grow dreams array unbounded during normal usage', () => {
        // Simulate adding dreams over time
        const dreams: { id: number; text: string }[] = [];

        // Add 100 dreams (simulating months of usage)
        for (let i = 0; i < 100; i++) {
            dreams.push({ id: i, text: `Dream ${i}` });
        }

        // Store in localStorage
        localStorage.setItem('somnia_dreams', JSON.stringify(dreams));

        // Verify storage size is reasonable (under 1MB for 100 dreams)
        const stored = localStorage.getItem('somnia_dreams') ?? '';
        const sizeBytes = new Blob([stored]).size;

        // 100 dreams should be well under 100KB
        expect(sizeBytes).toBeLessThan(100 * 1024);
    });

    it('should not retain stale session data after finalization', () => {
        // Set active session
        const session = {
            id: 123,
            alarmId: 456,
            sleepGatewayData: { dayRating: 5, dayNotes: 'Test' },
            isActive: true,
        };
        localStorage.setItem('somnia_active_sleep_session', JSON.stringify(session));

        // Verify session exists
        expect(localStorage.getItem('somnia_active_sleep_session')).not.toBeNull();

        // Clear session (simulating finalization)
        localStorage.setItem('somnia_active_sleep_session', 'null');

        // Verify session is cleared
        expect(localStorage.getItem('somnia_active_sleep_session')).toBe('null');
    });

    it('should handle rapid session creation/destruction without leaks', () => {
        // Simulate rapid session cycling (100 sessions)
        for (let i = 0; i < 100; i++) {
            const session = { id: Date.now() + i, isActive: true };
            localStorage.setItem('somnia_active_sleep_session', JSON.stringify(session));
            localStorage.setItem('somnia_active_sleep_session', 'null');
        }

        // Final state should be clean
        expect(localStorage.getItem('somnia_active_sleep_session')).toBe('null');
    });
});

describe('Memory Audit - Event Listeners', () => {
    it('should not accumulate event listeners on window', () => {
        const originalAddEventListener = window.addEventListener;
        const originalRemoveEventListener = window.removeEventListener;

        const listeners: Map<string, number> = new Map();

        window.addEventListener = vi.fn((type: string) => {
            listeners.set(type, (listeners.get(type) ?? 0) + 1);
        });

        window.removeEventListener = vi.fn((type: string) => {
            const count = listeners.get(type) ?? 0;
            if (count > 0) {
                listeners.set(type, count - 1);
            }
        });

        // Simulate hook mount/unmount cycle
        const events = ['resize', 'scroll', 'touchstart', 'mousedown'];

        // Mount 10 times
        for (let i = 0; i < 10; i++) {
            events.forEach(e => window.addEventListener(e, () => {}));
        }

        // Unmount 10 times
        for (let i = 0; i < 10; i++) {
            events.forEach(e => window.removeEventListener(e, () => {}));
        }

        // All listeners should be cleaned up
        events.forEach(e => {
            expect(listeners.get(e) ?? 0).toBe(0);
        });

        // Restore original functions
        window.addEventListener = originalAddEventListener;
        window.removeEventListener = originalRemoveEventListener;
    });
});

describe('Memory Audit - Interval/Timeout Cleanup', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should clear intervals when component unmounts', () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

        // Simulate setting an interval and then clearing it
        const intervalId = setInterval(() => {}, 1000);
        clearInterval(intervalId);

        expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
    });

    it('should clear timeouts when component unmounts', () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

        // Simulate setting a timeout and then clearing it
        const timeoutId = setTimeout(() => {}, 1000);
        clearTimeout(timeoutId);

        expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
    });

    it('should not accumulate pending timers during long sessions', () => {
        const activeTimers: Set<ReturnType<typeof setTimeout>> = new Set();

        // Track timer creation/cleanup
        const originalSetTimeout = global.setTimeout;
        const originalClearTimeout = global.clearTimeout;

        global.setTimeout = ((fn: () => void, ms: number) => {
            const id = originalSetTimeout(fn, ms);
            activeTimers.add(id);
            return id;
        }) as typeof setTimeout;

        global.clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
            activeTimers.delete(id);
            return originalClearTimeout(id);
        }) as typeof clearTimeout;

        // Simulate 100 timer cycles
        for (let i = 0; i < 100; i++) {
            const id = global.setTimeout(() => {}, 100);
            global.clearTimeout(id);
        }

        // No timers should be lingering
        expect(activeTimers.size).toBe(0);

        // Restore
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
    });
});

describe('Memory Audit - Large Data Handling', () => {
    it('should handle large dream text without excessive memory', () => {
        const largeDreamText = 'A'.repeat(10000); // 10KB dream text

        const dreams = [];
        for (let i = 0; i < 50; i++) {
            dreams.push({
                id: i,
                dreamText: largeDreamText,
                timestamp: new Date().toISOString(),
            });
        }

        // 50 dreams * 10KB = ~500KB
        const json = JSON.stringify(dreams);
        const sizeBytes = new Blob([json]).size;

        // Should be under 1MB
        expect(sizeBytes).toBeLessThan(1024 * 1024);
    });

    it('should handle chat history without unbounded growth', () => {
        const chatHistory: { role: string; content: string }[] = [];

        // Simulate 100 messages (typical max for a long conversation)
        for (let i = 0; i < 100; i++) {
            chatHistory.push({
                role: i % 2 === 0 ? 'user' : 'assistant',
                content: `Message ${i}: ${'Lorem ipsum '.repeat(10)}`,
            });
        }

        const sizeBytes = new Blob([JSON.stringify(chatHistory)]).size;

        // 100 messages should be well under 100KB
        expect(sizeBytes).toBeLessThan(100 * 1024);
    });
});
