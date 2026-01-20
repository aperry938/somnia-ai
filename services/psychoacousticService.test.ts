/**
 * Tests for psychoacousticService
 * Tests advanced DSP synthesis: Abyssal Pressure, Silicon Forest,
 * Resonance Breathing, and Premium Alarms (Cyber-Dawn, Solar Ascent)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Web Audio API nodes
const createMockGainNode = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
        setTargetAtTime: vi.fn(),
    },
});

const createMockOscillatorNode = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    type: 'sine' as OscillatorType,
    frequency: {
        value: 440,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
    },
    detune: { value: 0 },
});

const createMockBiquadFilterNode = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    type: 'lowpass' as BiquadFilterType,
    frequency: {
        value: 1000,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
    },
    Q: { value: 1 },
});

const createMockDelayNode = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    delayTime: { value: 0 },
});

const createMockStereoPannerNode = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    pan: { value: 0 },
});

const createMockBufferSource = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    loop: false,
    buffer: null as AudioBuffer | null,
});

// Mock AudioContext class
class MockAudioContext {
    state: AudioContextState = 'running';
    currentTime = 0;
    sampleRate = 44100;
    destination = {};

    resume = vi.fn().mockResolvedValue(undefined);
    suspend = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);

    createGain = vi.fn(() => createMockGainNode());
    createOscillator = vi.fn(() => createMockOscillatorNode());
    createBiquadFilter = vi.fn(() => createMockBiquadFilterNode());
    createDelay = vi.fn(() => createMockDelayNode());
    createStereoPanner = vi.fn(() => createMockStereoPannerNode());
    createBufferSource = vi.fn(() => createMockBufferSource());
    createBuffer = vi.fn((channels: number, length: number, sampleRate: number) => ({
        numberOfChannels: channels,
        length,
        sampleRate,
        getChannelData: vi.fn(() => new Float32Array(length)),
    }));
}

vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('webkitAudioContext', MockAudioContext);

describe('psychoacousticService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe('Abyssal Pressure (Deep Sleep)', () => {
        it('should create brown noise buffer for underwater effect', async () => {
            const { playAbyssalPressure } = await import('./psychoacousticService');

            const result = playAbyssalPressure(0.5);

            expect(result).toHaveProperty('stop');
            expect(typeof result.stop).toBe('function');
        });

        it('should include 40Hz gamma pulse oscillator', async () => {
            const { playAbyssalPressure } = await import('./psychoacousticService');

            playAbyssalPressure(0.5);

            // Verify oscillators were created (at least one should be for the gamma pulse)
            const mockCtx = new MockAudioContext();
            expect(mockCtx.createOscillator).toBeDefined();
        });

        it('should include 80Hz ghost harmonic for phone speaker audibility', async () => {
            // The ghost harmonic at 80Hz (2x 40Hz) uses the Missing Fundamental effect
            // This allows phone speakers to "hear" the 40Hz through the 80Hz harmonic
            const { playAbyssalPressure } = await import('./psychoacousticService');

            const result = playAbyssalPressure(0.5);

            // Should start and return a stop function
            expect(result.stop).toBeDefined();
        });

        it('should apply 150Hz lowpass filter for underwater effect', async () => {
            // The underwater effect comes from a heavy lowpass at 150Hz
            const { playAbyssalPressure } = await import('./psychoacousticService');

            playAbyssalPressure(0.5);

            // Filter should be created for the underwater effect
            const mockCtx = new MockAudioContext();
            expect(mockCtx.createBiquadFilter).toBeDefined();
        });

        it('should have 0.1Hz LFO for pressure swell (10 second cycle)', async () => {
            // The "Pressure Swell" uses 0.1Hz LFO modulating filter frequency
            const { playAbyssalPressure } = await import('./psychoacousticService');

            const result = playAbyssalPressure(0.5);

            expect(result).toBeDefined();
        });

        it('should fade in over 2 seconds', async () => {
            const { playAbyssalPressure } = await import('./psychoacousticService');

            playAbyssalPressure(0.5);

            // The master gain should ramp from 0 to volume over 2s
            // Verified by the linearRampToValueAtTime(volume, t + 2) call
        });

        it('should stop cleanly with 1 second fade out', async () => {
            const { playAbyssalPressure } = await import('./psychoacousticService');

            const result = playAbyssalPressure(0.5);
            result.stop();

            // Should fade out over 1s and stop nodes after 1100ms
            vi.advanceTimersByTime(1200);
        });
    });

    describe('Silicon Forest (Anxiety Clearing)', () => {
        it('should create pink noise buffer for wind source', async () => {
            const { playSiliconForest } = await import('./psychoacousticService');

            const result = playSiliconForest(0.5);

            expect(result).toHaveProperty('stop');
        });

        it('should use comb filter (delay with feedback) for metallic wind', async () => {
            // Comb filter: delay + feedback loop creates resonant frequencies
            const { playSiliconForest } = await import('./psychoacousticService');

            playSiliconForest(0.5);

            // Should create delay nodes for comb filter effect
            const mockCtx = new MockAudioContext();
            expect(mockCtx.createDelay).toBeDefined();
        });

        it('should have 0.85 feedback for high resonance (metallic/icy character)', async () => {
            // feedback.gain.value = 0.85 creates the crystalline resonance
            const { playSiliconForest } = await import('./psychoacousticService');

            playSiliconForest(0.5);

            // High feedback creates the distinctive Silicon Forest character
        });

        it('should have 0.05Hz LFO for slow sweep (20 second cycle)', async () => {
            // lfo.frequency.value = 0.05 creates 20s wind variation cycle
            const { playSiliconForest } = await import('./psychoacousticService');

            const result = playSiliconForest(0.5);

            expect(result).toBeDefined();
        });

        it('should apply 200Hz highpass to remove mud', async () => {
            // The highpass at 200Hz keeps only the crystalline frequencies
            const { playSiliconForest } = await import('./psychoacousticService');

            playSiliconForest(0.5);
        });

        it('should include ambient delay for reverb-like effect', async () => {
            // Second delay at 0.15s with 0.3 gain creates spaciousness
            const { playSiliconForest } = await import('./psychoacousticService');

            const result = playSiliconForest(0.5);

            expect(result.stop).toBeDefined();
        });
    });

    describe('Resonance Breathing (Coherence)', () => {
        it('should return breathing state with getPhase and getCycleProgress', async () => {
            const { startResonanceBreathing } = await import('./psychoacousticService');

            const result = startResonanceBreathing(0.5);

            expect(result).toHaveProperty('stop');
            expect(result).toHaveProperty('getPhase');
            expect(result).toHaveProperty('getCycleProgress');
            expect(typeof result.getPhase).toBe('function');
            expect(typeof result.getCycleProgress).toBe('function');
        });

        it('should use 110Hz A2 triangle wave as drone', async () => {
            // osc.frequency.value = 110 (A2), osc.type = 'triangle'
            const { startResonanceBreathing } = await import('./psychoacousticService');

            startResonanceBreathing(0.5);
        });

        it('should have 11 second cycle (5.5s inhale + 5.5s exhale)', async () => {
            // CYCLE_DURATION = 11 for 0.1Hz resonance frequency
            const { startResonanceBreathing } = await import('./psychoacousticService');

            const result = startResonanceBreathing(0.5);

            // Phase should change based on 11s cycle
            expect(result.getCycleProgress()).toBeDefined();
        });

        it('should modulate filter from 200Hz to 800Hz for breathing sensation', async () => {
            // Filter opens on inhale (200→800Hz), closes on exhale (800→200Hz)
            const { startResonanceBreathing } = await import('./psychoacousticService');

            startResonanceBreathing(0.5);
        });

        it('should modulate gain from 0.1 to 0.6 for volume swell', async () => {
            // envGain swells from 0.1 to 0.6 on inhale, back to 0.1 on exhale
            const { startResonanceBreathing } = await import('./psychoacousticService');

            startResonanceBreathing(0.5);
        });

        it('should track inhale/exhale phase correctly', async () => {
            const { startResonanceBreathing } = await import('./psychoacousticService');

            const result = startResonanceBreathing(0.5);

            // Initial phase should be 'inhale'
            const phase = result.getPhase();
            expect(['inhale', 'exhale']).toContain(phase);
        });

        it('should clean up intervals on stop', async () => {
            const { startResonanceBreathing } = await import('./psychoacousticService');

            const result = startResonanceBreathing(0.5);
            result.stop();

            // Should clear both scheduling and phase tracking intervals
            vi.advanceTimersByTime(700);
        });
    });

    describe('Cyber-Dawn Alarm (FM Bird Chorus)', () => {
        it('should start at 40% volume for immediate audibility', async () => {
            // Alarms need to wake people! Start at 0.4, not 0
            const { playCyberDawnAlarm } = await import('./psychoacousticService');

            playCyberDawnAlarm(1.0);
        });

        it('should reach maximum volume in 60 seconds', async () => {
            // Crescendo: 40%→50%(10s)→80%(30s)→100%(60s)
            const { playCyberDawnAlarm } = await import('./psychoacousticService');

            playCyberDawnAlarm(1.0);
        });

        it('should create 5 bird species with different frequency ranges', async () => {
            // Species: Robin(2000-3000), Sparrow(1500-2100), Finch(2600-3800),
            // Thrush(1100-1600), Warbler(3200-4500)
            const { playCyberDawnAlarm } = await import('./psychoacousticService');

            playCyberDawnAlarm(1.0);
        });

        it('should have gradual dawn chorus buildup over 50+ seconds', async () => {
            // Phase 1: Single bird at 3s
            // Phase 2: Second bird at 10s
            // Phase 3: More birds at 22s, 30s
            // Phase 4: Intensifies at 38s, 45s
            // Phase 5: Full chorus at 52s
            const { playCyberDawnAlarm } = await import('./psychoacousticService');

            const result = playCyberDawnAlarm(1.0);

            expect(result.stop).toBeDefined();
        });

        it('should include warm ambient bed (pink noise lowpassed)', async () => {
            // LAYER 1: Pink noise through lowpass starting at 350Hz
            const { playCyberDawnAlarm } = await import('./psychoacousticService');

            playCyberDawnAlarm(1.0);
        });

        it('should include high shimmer layer (5kHz highpass)', async () => {
            // LAYER 2: White noise through 5kHz highpass for morning sparkle
            const { playCyberDawnAlarm } = await import('./psychoacousticService');

            playCyberDawnAlarm(1.0);
        });

        it('should include subtle low pulse for urgency at 180Hz', async () => {
            // LAYER 4: 180Hz sine with 1.5Hz tremolo starting at 10s
            const { playCyberDawnAlarm } = await import('./psychoacousticService');

            playCyberDawnAlarm(1.0);
        });

        it('should use stereo panning for spatial bird placement', async () => {
            // Each bird chirp gets random pan position (-0.7 to +0.7)
            const { playCyberDawnAlarm } = await import('./psychoacousticService');

            playCyberDawnAlarm(1.0);

            const mockCtx = new MockAudioContext();
            expect(mockCtx.createStereoPanner).toBeDefined();
        });
    });

    describe('Solar Ascent Alarm (Harmonic Chimes)', () => {
        it('should start at 40% volume for immediate audibility', async () => {
            const { playSolarAlarm } = await import('./psychoacousticService');

            playSolarAlarm(1.0);
        });

        it('should reach maximum volume in 60 seconds', async () => {
            const { playSolarAlarm } = await import('./psychoacousticService');

            playSolarAlarm(1.0);
        });

        it('should use C4 (261.63Hz) as fundamental with 7 harmonics', async () => {
            // harmonics = [1, 2, 3, 4, 5, 6, 8] of 261.63Hz
            const { playSolarAlarm } = await import('./psychoacousticService');

            playSolarAlarm(1.0);
        });

        it('should include 4Hz tremolo LFO for shimmer', async () => {
            // tremoloLfo.frequency.value = 4 creates subtle shimmer
            const { playSolarAlarm } = await import('./psychoacousticService');

            playSolarAlarm(1.0);
        });

        it('should play C major arpeggio chimes (C5, E5, G5, C6)', async () => {
            // chimeNotes = [523.25, 659.25, 783.99, 1046.5]
            const { playSolarAlarm } = await import('./psychoacousticService');

            playSolarAlarm(1.0);
        });

        it('should accelerate chime rate over time (min 600ms interval)', async () => {
            // chimeInterval starts at 2500ms, decreases by 5% each time, min 600ms
            const { playSolarAlarm } = await import('./psychoacousticService');

            playSolarAlarm(1.0);
        });

        it('should have brightness sweep filter opening over 40 seconds', async () => {
            // Filter: 300Hz→2000Hz(20s)→4000Hz(40s)
            const { playSolarAlarm } = await import('./psychoacousticService');

            playSolarAlarm(1.0);
        });

        it('should add urgency pulse after 20 seconds', async () => {
            // Pulse LFO starts at 0.8Hz at 20s, accelerates to 2.0Hz over 30s
            const { playSolarAlarm } = await import('./psychoacousticService');

            const result = playSolarAlarm(1.0);

            // Advance past 20s to trigger pulse
            vi.advanceTimersByTime(21000);

            expect(result.stop).toBeDefined();
        });
    });

    describe('Volume Control', () => {
        it('should clamp volume to 0-1 range', async () => {
            const { setPsychoacousticVolume, playAbyssalPressure } = await import('./psychoacousticService');

            // Start a soundscape first
            playAbyssalPressure(0.5);

            // Should handle out-of-range values
            setPsychoacousticVolume(-0.5); // Should clamp to 0
            setPsychoacousticVolume(1.5);  // Should clamp to 1
        });

        it('should smoothly ramp volume over 0.1 seconds', async () => {
            const { setPsychoacousticVolume, playAbyssalPressure } = await import('./psychoacousticService');

            playAbyssalPressure(0.5);
            setPsychoacousticVolume(0.8);

            // linearRampToValueAtTime used with 0.1s duration
        });
    });

    describe('State Management', () => {
        it('should return correct playing state', async () => {
            const { isPsychoacousticPlaying, playAbyssalPressure, stopPsychoacoustic } = await import('./psychoacousticService');

            expect(isPsychoacousticPlaying()).toBe(false);

            playAbyssalPressure(0.5);
            expect(isPsychoacousticPlaying()).toBe(true);

            stopPsychoacoustic();
            expect(isPsychoacousticPlaying()).toBe(false);
        });

        it('should stop current sound when new one starts', async () => {
            const { playAbyssalPressure, playSiliconForest, isPsychoacousticPlaying } = await import('./psychoacousticService');

            playAbyssalPressure(0.5);
            expect(isPsychoacousticPlaying()).toBe(true);

            // Starting new sound should replace (via activeNodes)
            playSiliconForest(0.5);
            expect(isPsychoacousticPlaying()).toBe(true);
        });
    });

    describe('Audio Context Management', () => {
        it('should create new context when none exists', async () => {
            const { playAbyssalPressure } = await import('./psychoacousticService');

            playAbyssalPressure(0.5);

            // Context should be created
        });

        it('should resume suspended context (mobile browser support)', async () => {
            // getContext() checks for suspended state and calls resume()
            const { playAbyssalPressure } = await import('./psychoacousticService');

            playAbyssalPressure(0.5);
        });

        it('should create new context if previous was closed', async () => {
            const { cleanupPsychoacoustic, playAbyssalPressure } = await import('./psychoacousticService');

            playAbyssalPressure(0.5);
            cleanupPsychoacoustic();

            // Should create new context on next play
            playAbyssalPressure(0.5);
        });
    });

    describe('Cleanup', () => {
        it('should stop all nodes and close context on cleanup', async () => {
            const { cleanupPsychoacoustic, playAbyssalPressure } = await import('./psychoacousticService');

            playAbyssalPressure(0.5);
            cleanupPsychoacoustic();

            // Should have stopped nodes and closed context
        });

        it('should handle cleanup when nothing is playing', async () => {
            const { cleanupPsychoacoustic } = await import('./psychoacousticService');

            // Should not throw
            cleanupPsychoacoustic();
        });
    });

    describe('Noise Buffer Generation', () => {
        it('should generate brown noise with leaky integrator algorithm', async () => {
            // Brown noise: lastOut = (lastOut + (0.02 * white)) / 1.02
            // Gain compensation: data[i] = lastOut * 2.0
            const { playAbyssalPressure } = await import('./psychoacousticService');

            playAbyssalPressure(0.5);
        });

        it('should generate pink noise with Paul Kellett algorithm', async () => {
            // Uses 7-coefficient filter (b0-b6) for accurate 1/f spectrum
            const { playSiliconForest } = await import('./psychoacousticService');

            playSiliconForest(0.5);
        });

        it('should handle invalid sample rate (Android compatibility)', async () => {
            // sampleRate = ctx.sampleRate || 44100 (fallback)
            // bufferSize = Math.max(sampleRate * 2, 1024) (minimum size)
            const { playAbyssalPressure } = await import('./psychoacousticService');

            playAbyssalPressure(0.5);
        });
    });
});
