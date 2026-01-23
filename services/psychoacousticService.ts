/**
 * SOMNIA EXPANSION PACK v2.0: Psychoacoustic Environments
 *
 * Advanced DSP synthesis using Web Audio API for:
 * - Deep Sleep (Abyssal Pressure): Brown Noise + 40Hz Gamma Pulse
 * - Anxiety Clearing (Silicon Forest): Comb-filtered metallic wind
 * - Coherence Breathing (Resonance Chamber): Timbre-modulated 5.5s cycles
 * - Synthetic Alarms: FM birds (Cyber-Dawn), Additive harmonics (Solar Ascent)
 *
 * MOBILE APP STORE COMPLIANCE:
 * - Proper AudioContext lifecycle management
 * - Memory leak prevention with defensive cleanup
 * - Error recovery for audio session interruptions
 * - Background audio handled via native plugins (iOS AVAudioSession, Android foreground service)
 */

let audioContext: AudioContext | null = null;
let activeNodes: { stop: () => void } | null = null;
let masterGain: GainNode | null = null;

// Track voice stream timers for Cyber-Dawn alarm cleanup
let cyberDawnTimers: ReturnType<typeof setTimeout>[] = [];

// Track timers for Solar Ascent alarm cleanup
let solarAlarmTimers: ReturnType<typeof setTimeout>[] = [];

// Cleanup state tracking to prevent double-cleanup race conditions
let isCleaningUp = false;

// Track all created audio nodes for emergency cleanup
let allCreatedNodes: AudioNode[] = [];

/** Timeout for AudioContext resume operations (ms) - reserved for async context init */
// const CONTEXT_RESUME_TIMEOUT_MS = 3000;

/**
 * Initialize or get audio context with proper error handling.
 * Handles closed context recovery (can happen on iOS after interruption).
 */
function getContext(): AudioContext {
    // Handle closed context (occurs after device sleep/wake or audio session loss)
    if (audioContext && audioContext.state === 'closed') {
        console.warn('[PsychoacousticService] AudioContext was closed, recreating...');
        audioContext = null;
        masterGain = null;
        allCreatedNodes = [];
    }

    if (!audioContext) {
        try {
            audioContext = new AudioContext();
            console.log('[PsychoacousticService] AudioContext created, state:', audioContext.state);
        } catch (e) {
            console.error('[PsychoacousticService] Failed to create AudioContext:', e);
            throw new Error('Failed to initialize psychoacoustic audio system');
        }
    }

    // Resume if suspended (mobile browsers require user interaction first)
    // Note: We don't await here to maintain sync API, but callers should handle this
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch((e) => {
            console.warn('[PsychoacousticService] Failed to resume AudioContext:', e);
        });
    }
    return audioContext;
}

/**
 * Ensures audio context is ready for playback (async version with timeout).
 * Critical for alarm reliability - prevents indefinite hangs.
 * Reserved for future async context initialization when needed.
 */
// async function ensureContextReady(): Promise<AudioContext> { ... }

/**
 * Track a created audio node for emergency cleanup.
 * Prevents memory leaks if normal cleanup fails.
 * Reserved for enhanced node tracking in future.
 */
// function trackNode(node: AudioNode): void { ... }

// --- HELPER: NOISE BUFFER GENERATOR ---
function createNoiseBuffer(ctx: AudioContext, type: 'brown' | 'pink'): AudioBuffer {
    // Defensive check for valid sample rate (Android compatibility)
    const sampleRate = ctx.sampleRate || 44100;
    const bufferSize = Math.max(sampleRate * 2, 1024); // 2 seconds, minimum 1024 samples
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'brown') {
        // Leaky integrator brown noise
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            data[i] = lastOut * 2.0; // Gain compensation (reduced from 3.5 to prevent digital clipping)
        }
    } else {
        // Pink Noise (Paul Kellett algorithm)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
    }
    return buffer;
}

// --- 1. SOUNDSCAPE: ABYSSAL PRESSURE (Deep Brown + 40Hz Gamma) ---
export function playAbyssalPressure(volume: number = 0.5): { stop: () => void } {
    const ctx = getContext();
    const t = ctx.currentTime;

    // Master gain for volume control
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(volume, t + 2); // 2s fade in
    masterGain.connect(ctx.destination);

    // LAYER A: The Fluid (Brown Noise with underwater filter)
    const buffer = createNoiseBuffer(ctx, 'brown');
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter: Heavy low-pass for underwater effect
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;
    filter.Q.value = 1;

    // Modulation: Slow Pressure Swell (0.1Hz = 10 second cycle)
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 50; // Modulate filter by +/- 50Hz

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    // Noise gain
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.7;

    // LAYER B: The Gamma Pulse (40Hz Lucid Trigger)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = 40;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.15; // Subtle grounding

    // LAYER C: Ghost Harmonic (80Hz for phone speaker audibility)
    // Uses "Missing Fundamental" psychoacoustic effect: brain hears 80Hz and
    // "hallucinates" the 40Hz fundamental below it, making rumble perceivable on phone speakers
    const ghostOsc = ctx.createOscillator();
    ghostOsc.type = 'sine';
    ghostOsc.frequency.value = 80; // One octave above 40Hz
    const ghostGain = ctx.createGain();
    ghostGain.gain.value = 0.03; // 20% of subOsc gain (0.15 * 0.2 = 0.03) - very subtle

    // Connect noise chain
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);

    // Connect gamma pulse
    subOsc.connect(subGain);
    subGain.connect(masterGain);

    // Connect ghost harmonic
    ghostOsc.connect(ghostGain);
    ghostGain.connect(masterGain);

    // Start all
    noise.start(t);
    lfo.start(t);
    subOsc.start(t);
    ghostOsc.start(t);

    const stopFn = () => {
        const now = ctx.currentTime;
        if (masterGain) {
            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.linearRampToValueAtTime(0, now + 1);
        }
        setTimeout(() => {
            try {
                noise.stop();
                lfo.stop();
                subOsc.stop();
                ghostOsc.stop();
            } catch { /* already stopped */ }
        }, 1100);
    };

    activeNodes = { stop: stopFn };
    return { stop: stopFn };
}

// --- 2. SOUNDSCAPE: SILICON FOREST (Comb Filtered Wind) ---
export function playSiliconForest(volume: number = 0.5): { stop: () => void } {
    const ctx = getContext();
    const t = ctx.currentTime;

    // Master gain
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(volume, t + 2);
    masterGain.connect(ctx.destination);

    // Source: Pink Noise
    const buffer = createNoiseBuffer(ctx, 'pink');
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // THE COMB FILTER (The "Wind" Effect)
    const delay = ctx.createDelay();
    const feedback = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    feedback.gain.value = 0.85; // High resonance = Metallic/Icy
    lfo.frequency.value = 0.05; // Slow sweep (20s cycle)
    lfoGain.gain.value = 0.003; // Depth
    delay.delayTime.value = 0.01; // Base delay 10ms

    // Feedback Loop: Source -> Delay -> Feedback -> Delay
    noise.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);

    // LFO Modulates Delay Time (Changes pitch of wind)
    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);

    // Output Filter (Remove mud, keep the crystalline frequencies)
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 200;

    // Subtle reverb-like effect with second delay
    const ambientDelay = ctx.createDelay();
    ambientDelay.delayTime.value = 0.15;
    const ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.3;

    delay.connect(highpass);
    highpass.connect(masterGain);
    highpass.connect(ambientDelay);
    ambientDelay.connect(ambientGain);
    ambientGain.connect(masterGain);

    noise.start(t);
    lfo.start(t);

    const stopFn = () => {
        const now = ctx.currentTime;
        if (masterGain) {
            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.linearRampToValueAtTime(0, now + 1);
        }
        setTimeout(() => {
            try {
                noise.stop();
                lfo.stop();
            } catch { /* already stopped */ }
        }, 1100);
    };

    activeNodes = { stop: stopFn };
    return { stop: stopFn };
}

// --- 3. BREATHING: RESONANCE CHAMBER (Timbre Modulation @ 0.1Hz) ---
export interface ResonanceBreathingState {
    stop: () => void;
    getPhase: () => 'inhale' | 'exhale';
    getCycleProgress: () => number;
}

export function startResonanceBreathing(volume: number = 0.5): ResonanceBreathingState {
    const ctx = getContext();
    const t = ctx.currentTime;
    const CYCLE_DURATION = 11; // 5.5s In + 5.5s Out (0.1Hz resonance)

    // Master gain
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(volume, t + 2);
    masterGain.connect(ctx.destination);

    // The Drone (Bass Guide)
    const osc = ctx.createOscillator();
    osc.type = 'triangle'; // Softer than saw, fuller than sine
    osc.frequency.value = 110; // A2

    // Filter (The "Opening" Sensation)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2;
    filter.frequency.value = 200;

    // Envelope gain (volume swell)
    const envGain = ctx.createGain();
    envGain.gain.value = 0.1;

    // Track state for UI callbacks
    let currentPhase: 'inhale' | 'exhale' = 'inhale';
    let cycleStartTime = t;
    let isActive = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let phaseIntervalId: ReturnType<typeof setInterval> | null = null;

    // Schedule a single breath cycle
    function scheduleCycle(startTime: number) {
        if (!isActive) return;

        // INHALE (0 -> 5.5s): Open Filter, Increase Vol
        filter.frequency.setValueAtTime(200, startTime);
        filter.frequency.exponentialRampToValueAtTime(800, startTime + 5.5);
        envGain.gain.setValueAtTime(0.1, startTime);
        envGain.gain.linearRampToValueAtTime(0.6, startTime + 5.5);

        // EXHALE (5.5s -> 11s): Close Filter, Decrease Vol
        filter.frequency.setValueAtTime(800, startTime + 5.5);
        filter.frequency.exponentialRampToValueAtTime(200, startTime + 11);
        envGain.gain.setValueAtTime(0.6, startTime + 5.5);
        envGain.gain.linearRampToValueAtTime(0.1, startTime + 11);
    }

    // Connect audio graph
    osc.connect(filter);
    filter.connect(envGain);
    envGain.connect(masterGain);

    // Start oscillator
    osc.start(t);

    // Schedule first cycle
    scheduleCycle(t);

    // Continue scheduling
    let nextTime = t + CYCLE_DURATION;
    intervalId = setInterval(() => {
        if (!isActive) return;
        scheduleCycle(nextTime);
        cycleStartTime = nextTime;
        nextTime += CYCLE_DURATION;
    }, CYCLE_DURATION * 1000);

    // Phase tracking interval
    phaseIntervalId = setInterval(() => {
        if (!isActive) return;
        const elapsed = (ctx.currentTime - cycleStartTime) % CYCLE_DURATION;
        currentPhase = elapsed < 5.5 ? 'inhale' : 'exhale';
    }, 100);

    const stopFn = () => {
        isActive = false;
        if (intervalId) clearInterval(intervalId);
        if (phaseIntervalId) clearInterval(phaseIntervalId);

        const now = ctx.currentTime;
        if (masterGain) {
            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.linearRampToValueAtTime(0, now + 0.5);
        }
        filter.frequency.cancelScheduledValues(now);
        envGain.gain.cancelScheduledValues(now);

        setTimeout(() => {
            try { osc.stop(); } catch { /* already stopped */ }
        }, 600);
    };

    activeNodes = { stop: stopFn };

    return {
        stop: stopFn,
        getPhase: () => currentPhase,
        getCycleProgress: () => {
            const elapsed = (ctx.currentTime - cycleStartTime) % CYCLE_DURATION;
            return elapsed / CYCLE_DURATION;
        }
    };
}

// --- 4. ALARM: CYBER-DAWN (Full-Spectrum Synthetic Dawn Chorus) ---
// Dense, immersive dawn soundscape with multiple layers - designed to WAKE PEOPLE UP
export function playCyberDawnAlarm(volume: number = 1.0): { stop: () => void } {
    // Clear any previous Cyber-Dawn timers
    cyberDawnTimers.forEach(timerId => clearTimeout(timerId));
    cyberDawnTimers = [];

    const ctx = getContext();
    let isPlaying = true;
    const t = ctx.currentTime;

    if (ctx.state === 'suspended') {
        ctx.resume().catch((e) => {
            console.warn('[PsychoacousticService] Failed to resume AudioContext:', e);
        });
    }

    // Helper to track setTimeout calls for cleanup
    const trackedTimeout = (fn: () => void, delay: number): ReturnType<typeof setTimeout> => {
        const timerId = setTimeout(fn, delay);
        cyberDawnTimers.push(timerId);
        return timerId;
    };

    // Master gain - 5x louder start, reaches MAXIMUM in 60s (alarms need to wake people!)
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.4, t);                        // Start at 40% (audible immediately)
    masterGain.gain.linearRampToValueAtTime(volume * 0.5, t + 10);  // 50% at 10s
    masterGain.gain.linearRampToValueAtTime(volume * 0.8, t + 30);  // 80% at 30s
    masterGain.gain.linearRampToValueAtTime(volume, t + 60);        // MAXIMUM at 60s
    masterGain.connect(ctx.destination);

    // === LAYER 1: WARM AMBIENT BED (Low-mid frequencies - forest atmosphere) ===
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < noiseBuffer.length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        noiseData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.18;
        b6 = white * 0.115926;
    }
    const bedSource = ctx.createBufferSource();
    bedSource.buffer = noiseBuffer;
    bedSource.loop = true;

    const bedFilter = ctx.createBiquadFilter();
    bedFilter.type = 'lowpass';
    bedFilter.frequency.setValueAtTime(350, t);
    bedFilter.frequency.linearRampToValueAtTime(700, t + 25);
    bedFilter.Q.value = 0.5;

    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.3;

    bedSource.connect(bedFilter);
    bedFilter.connect(bedGain);
    bedGain.connect(masterGain);
    bedSource.start(t);

    // === LAYER 2: HIGH SHIMMER (Bright morning sparkle) ===
    const shimmerBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const shimmerData = shimmerBuffer.getChannelData(0);
    for (let i = 0; i < shimmerBuffer.length; i++) {
        shimmerData[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const shimmerSource = ctx.createBufferSource();
    shimmerSource.buffer = shimmerBuffer;
    shimmerSource.loop = true;

    const shimmerFilter = ctx.createBiquadFilter();
    shimmerFilter.type = 'highpass';
    shimmerFilter.frequency.value = 5000;
    shimmerFilter.Q.value = 0.8;

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.02, t);
    shimmerGain.gain.linearRampToValueAtTime(0.12, t + 20);

    shimmerSource.connect(shimmerFilter);
    shimmerFilter.connect(shimmerGain);
    shimmerGain.connect(masterGain);
    shimmerSource.start(t);

    // === LAYER 3: BIRD CHORUS (Multiple species, LOUD and DENSE) ===
    const species = [
        { freqRange: [2000, 3000], modRatio: 2.4, vol: 0.75 },  // Robin
        { freqRange: [1500, 2100], modRatio: 1.5, vol: 0.7 },   // Sparrow
        { freqRange: [2600, 3800], modRatio: 3.0, vol: 0.7 },   // Finch
        { freqRange: [1100, 1600], modRatio: 2.0, vol: 0.65 },  // Thrush
        { freqRange: [3200, 4500], modRatio: 2.8, vol: 0.6 },   // Warbler
    ];

    let birdCount = 2;

    function chirp(speciesIdx: number, isDouble: boolean = false) {
        if (!isPlaying || !masterGain) return;
        const now = ctx.currentTime;
        const bird = species[speciesIdx % species.length];
        if (!bird) return; // Safety check for TypeScript

        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        const env = ctx.createGain();

        const freqMin = bird.freqRange[0] ?? 2000;
        const freqMax = bird.freqRange[1] ?? 3000;
        const baseFreq = freqMin + Math.random() * (freqMax - freqMin);
        carrier.frequency.value = baseFreq;
        modulator.frequency.value = baseFreq * bird.modRatio;

        // Longer, more natural pitch contour (birds have a "windy" warble)
        const chirpDuration = 0.25 + Math.random() * 0.12; // 250-370ms total
        carrier.frequency.setValueAtTime(baseFreq * 0.9, now);
        carrier.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, now + chirpDuration * 0.2);  // Rise
        carrier.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, now + chirpDuration * 0.4); // Sustain high
        carrier.frequency.exponentialRampToValueAtTime(baseFreq * 1.0, now + chirpDuration * 0.65); // Gradual fall
        carrier.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, now + chirpDuration);       // Tail off

        // Modulation depth varies through chirp (more vibrato in middle)
        modGain.gain.setValueAtTime(200, now);
        modGain.gain.linearRampToValueAtTime(500 + Math.random() * 300, now + chirpDuration * 0.3);
        modGain.gain.linearRampToValueAtTime(250, now + chirpDuration);

        // Natural "breathy" envelope - gradual attack, sustained body, long tail
        const peakVol = bird.vol + Math.random() * 0.1;
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(peakVol * 0.7, now + 0.018);      // 18ms attack (not instant)
        env.gain.linearRampToValueAtTime(peakVol, now + 0.045);            // Peak at 45ms
        env.gain.setValueAtTime(peakVol * 0.9, now + chirpDuration * 0.35); // Hold near peak
        env.gain.linearRampToValueAtTime(peakVol * 0.5, now + chirpDuration * 0.6);  // Start fading
        env.gain.exponentialRampToValueAtTime(peakVol * 0.15, now + chirpDuration * 0.85); // Long breath out
        env.gain.exponentialRampToValueAtTime(0.001, now + chirpDuration + 0.05);   // Final whisper tail

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(env);

        const panner = ctx.createStereoPanner();
        panner.pan.value = (Math.random() * 1.4) - 0.7;
        env.connect(panner);
        panner.connect(masterGain);

        carrier.start(now);
        modulator.start(now);
        carrier.stop(now + chirpDuration + 0.1);
        modulator.stop(now + chirpDuration + 0.1);

        // Double/triple chirps (spaced for longer chirp duration)
        if (!isDouble && Math.random() > 0.4) {
            trackedTimeout(() => { if (isPlaying) chirp(speciesIdx, true); }, 180 + Math.random() * 80);
            if (Math.random() > 0.5) {
                trackedTimeout(() => { if (isPlaying) chirp(speciesIdx, true); }, 350 + Math.random() * 100);
            }
        }
    }

    // Voice stream generator - creates one "bird" that chirps periodically
    function createVoiceStream(streamId: number, startDelay: number, baseInterval: number) {
        let interval = baseInterval;
        const minInterval = 200 + streamId * 30; // Longer minimum intervals

        function tick() {
            if (!isPlaying) return;
            chirp(Math.floor(Math.random() * birdCount), false);
            // Slower acceleration (0.992 instead of 0.988)
            interval = Math.max(minInterval, interval * 0.992);
            trackedTimeout(tick, interval * (0.7 + Math.random() * 0.6));
        }

        trackedTimeout(tick, startDelay);
    }

    // GRADUAL DAWN CHORUS BUILDUP
    // Phase 1 (0-10s): Single distant bird, very sparse
    createVoiceStream(0, 3000, 2500); // First bird at 3s, very slow (2.5s intervals)

    // Phase 2 (10-20s): A second bird joins
    trackedTimeout(() => { if (isPlaying) createVoiceStream(1, 0, 2000); }, 10000);

    // Phase 3 (20-35s): More birds wake up
    trackedTimeout(() => { if (isPlaying) createVoiceStream(2, 0, 1500); }, 22000);
    trackedTimeout(() => { if (isPlaying) createVoiceStream(3, 0, 1400); }, 30000);

    // Phase 4 (35-50s): Dawn chorus intensifies
    trackedTimeout(() => { if (isPlaying) createVoiceStream(4, 0, 1000); }, 38000);
    trackedTimeout(() => { if (isPlaying) createVoiceStream(5, 0, 900); }, 45000);

    // Phase 5 (50s+): Full chorus
    trackedTimeout(() => { if (isPlaying) createVoiceStream(6, 0, 800); }, 52000);

    // Introduce more species gradually (every 12s instead of 8s)
    const speciesTimer = setInterval(() => {
        if (!isPlaying) return;
        if (birdCount < species.length) birdCount++;
    }, 12000);

    // === LAYER 4: SUBTLE LOW PULSE (Creates urgency) ===
    const pulseOsc = ctx.createOscillator();
    pulseOsc.type = 'sine';
    pulseOsc.frequency.value = 180;

    const pulseGain = ctx.createGain();
    pulseGain.gain.setValueAtTime(0, t);
    pulseGain.gain.setValueAtTime(0, t + 10);
    pulseGain.gain.linearRampToValueAtTime(0.1, t + 15);
    pulseGain.gain.linearRampToValueAtTime(0.18, t + 30);

    const pulseLfo = ctx.createOscillator();
    const pulseLfoGain = ctx.createGain();
    pulseLfo.frequency.value = 1.5;
    pulseLfoGain.gain.value = 0.15;
    pulseLfo.connect(pulseLfoGain);
    pulseLfoGain.connect(pulseGain.gain);

    pulseOsc.connect(pulseGain);
    pulseGain.connect(masterGain);
    pulseOsc.start(t);
    pulseLfo.start(t);

    const stopFn = () => {
        isPlaying = false;
        clearInterval(speciesTimer);

        // Clear all tracked voice stream timers
        cyberDawnTimers.forEach(timerId => clearTimeout(timerId));
        cyberDawnTimers = [];

        const now = ctx.currentTime;
        if (masterGain) {
            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.linearRampToValueAtTime(0, now + 0.5);
        }
        setTimeout(() => {
            try { bedSource.stop(); } catch { /* */ }
            try { shimmerSource.stop(); } catch { /* */ }
            try { pulseOsc.stop(); } catch { /* */ }
            try { pulseLfo.stop(); } catch { /* */ }
        }, 600);
    };

    activeNodes = { stop: stopFn };
    return { stop: stopFn };
}

// --- 5. ALARM: SOLAR ASCENT (Harmonic Sunrise with Rhythmic Chimes) ---
// A warm, building alarm with pulsing harmonics, rhythmic chimes, and progressive intensity
export function playSolarAlarm(volume: number = 1.0): { stop: () => void } {
    const ctx = getContext();
    const t = ctx.currentTime;
    let isPlaying = true;

    // Clear any previous solar alarm timers
    solarAlarmTimers.forEach(timerId => clearTimeout(timerId));
    solarAlarmTimers = [];

    if (ctx.state === 'suspended') {
        ctx.resume().catch((e) => {
            console.warn('[PsychoacousticService] Failed to resume AudioContext:', e);
        });
    }

    // Master gain - 5x louder start, reaches MAXIMUM in 60s (alarms need to wake people!)
    const master = ctx.createGain();
    masterGain = master; // Store in module variable for stop function
    master.gain.setValueAtTime(0.4, t);                        // Start at 40% (audible immediately)
    master.gain.linearRampToValueAtTime(volume * 0.5, t + 10);  // 50% at 10s
    master.gain.linearRampToValueAtTime(volume * 0.8, t + 30);  // 80% at 30s
    master.gain.linearRampToValueAtTime(volume, t + 60);        // MAXIMUM at 60s
    master.connect(ctx.destination);

    // === HARMONIC PAD with Tremolo ===
    const fundamental = 261.63; // C4
    const harmonics = [1, 2, 3, 4, 5, 6, 8]; // Extended series including octave
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    // Global tremolo LFO for movement
    const tremoloLfo = ctx.createOscillator();
    const tremoloGain = ctx.createGain();
    tremoloLfo.frequency.value = 4; // 4Hz shimmer
    tremoloGain.gain.value = 0.15; // Subtle tremolo

    tremoloLfo.connect(tremoloGain);
    tremoloLfo.start(t);

    harmonics.forEach((h, i) => {
        const osc = ctx.createOscillator();
        osc.type = i < 3 ? 'sine' : 'triangle'; // Lower harmonics pure, higher ones warmer

        osc.frequency.value = fundamental * h;

        const gain = ctx.createGain();
        const baseLevel = (0.35 / Math.sqrt(h)); // Louder base, sqrt rolloff

        // Fast staggered entry (1.5s each, not 8s)
        const startTime = t + (i * 1.5);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(baseLevel, startTime + 1);

        // Connect tremolo to this harmonic's gain for shimmer
        const tremoloMix = ctx.createGain();
        tremoloMix.gain.value = baseLevel * 0.3;
        tremoloGain.connect(tremoloMix);
        tremoloMix.connect(gain.gain);

        // Slight detune for richness
        osc.detune.value = (Math.random() - 0.5) * 8;

        osc.connect(gain);
        gain.connect(master);
        osc.start(t);

        oscillators.push(osc);
        gains.push(gain);
    });

    // === RHYTHMIC CHIME PATTERN ===
    let chimeInterval = 2500; // Start every 2.5 seconds
    const chimeNotes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 - major arpeggio

    function playChime() {
        if (!isPlaying || !masterGain) return;
        const now = ctx.currentTime;

        // Pick note from arpeggio
        const noteIndex = Math.floor(Math.random() * chimeNotes.length);
        const freq = chimeNotes[noteIndex] ?? 523.25; // Default to C5 if undefined

        // Main chime oscillator
        const chimeOsc = ctx.createOscillator();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.value = freq;

        // Second oscillator for bell-like quality (slight detune)
        const chimeOsc2 = ctx.createOscillator();
        chimeOsc2.type = 'triangle';
        chimeOsc2.frequency.value = freq * 2.01; // Slight inharmonic for bell character

        // Envelope - bell-like attack and decay
        const chimeEnv = ctx.createGain();
        chimeEnv.gain.setValueAtTime(0, now);
        chimeEnv.gain.linearRampToValueAtTime(0.5, now + 0.01); // Fast attack
        chimeEnv.gain.exponentialRampToValueAtTime(0.2, now + 0.1);
        chimeEnv.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

        // Second voice envelope (quieter)
        const chimeEnv2 = ctx.createGain();
        chimeEnv2.gain.setValueAtTime(0, now);
        chimeEnv2.gain.linearRampToValueAtTime(0.15, now + 0.01);
        chimeEnv2.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

        // High-pass filter for sparkle
        const chimeFilter = ctx.createBiquadFilter();
        chimeFilter.type = 'highpass';
        chimeFilter.frequency.value = 400;

        chimeOsc.connect(chimeEnv);
        chimeOsc2.connect(chimeEnv2);
        chimeEnv.connect(chimeFilter);
        chimeEnv2.connect(chimeFilter);
        chimeFilter.connect(masterGain);

        chimeOsc.start(now);
        chimeOsc2.start(now);
        chimeOsc.stop(now + 1.5);
        chimeOsc2.stop(now + 1.5);

        // Schedule next chime - progressively faster
        if (isPlaying) {
            chimeInterval = Math.max(600, chimeInterval * 0.95); // Speed up, min 600ms
            const nextChimeTimer = setTimeout(playChime, chimeInterval);
            solarAlarmTimers.push(nextChimeTimer);
        }
    }

    // Start chime pattern after 1 second
    const initialChimeTimer = setTimeout(playChime, 1000);
    solarAlarmTimers.push(initialChimeTimer);

    // === BRIGHTNESS SWEEP (Filter automation) ===
    const brightnessFilter = ctx.createBiquadFilter();
    brightnessFilter.type = 'lowpass';
    brightnessFilter.frequency.setValueAtTime(300, t);
    brightnessFilter.frequency.linearRampToValueAtTime(2000, t + 20);  // Open up over 20s
    brightnessFilter.frequency.linearRampToValueAtTime(4000, t + 40);  // Continue brightening
    brightnessFilter.Q.value = 0.5;

    // Reconnect oscillators through brightness filter
    gains.forEach(g => {
        g.disconnect();
        g.connect(brightnessFilter);
    });
    brightnessFilter.connect(master);

    // === PULSE/SWELL for urgency (starts after 20s) ===
    const pulseTimer = setTimeout(() => {
        if (!isPlaying || !masterGain) return;

        const pulseLfo = ctx.createOscillator();
        const pulseGain = ctx.createGain();
        pulseLfo.frequency.value = 0.8; // Gentle pulse
        pulseGain.gain.value = 0.2;
        pulseLfo.connect(pulseGain);
        pulseGain.connect(masterGain.gain);
        pulseLfo.start();

        // Speed up pulse over time
        pulseLfo.frequency.linearRampToValueAtTime(2.0, ctx.currentTime + 30);
    }, 20000);
    solarAlarmTimers.push(pulseTimer);

    const stopFn = () => {
        isPlaying = false;

        // Clear all tracked solar alarm timers to prevent leaks
        solarAlarmTimers.forEach(timerId => clearTimeout(timerId));
        solarAlarmTimers = [];

        const now = ctx.currentTime;
        if (masterGain) {
            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.linearRampToValueAtTime(0, now + 1);
        }
        gains.forEach(g => {
            g.gain.cancelScheduledValues(now);
            g.gain.linearRampToValueAtTime(0, now + 1);
        });
        setTimeout(() => {
            oscillators.forEach(o => {
                try { o.stop(); } catch { /* */ }
            });
            try { tremoloLfo.stop(); } catch { /* */ }
        }, 1100);
    };

    activeNodes = { stop: stopFn };
    return { stop: stopFn };
}

// --- VOLUME CONTROL ---
export function setPsychoacousticVolume(volume: number): void {
    if (masterGain && audioContext) {
        const now = audioContext.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)), now + 0.1);
    }
}

// --- STOP ALL ---
export function stopPsychoacoustic(): void {
    if (activeNodes) {
        activeNodes.stop();
        activeNodes = null;
    }
}

// --- CHECK IF PLAYING ---
export function isPsychoacousticPlaying(): boolean {
    return activeNodes !== null;
}

// --- CLEANUP ---
/**
 * Comprehensive cleanup of all psychoacoustic resources.
 * Critical for app store compliance - prevents memory leaks and orphaned audio.
 * Safe to call multiple times (idempotent).
 */
export function cleanupPsychoacoustic(): void {
    // Prevent double-cleanup race conditions
    if (isCleaningUp) {
        console.log('[PsychoacousticService] Cleanup already in progress, skipping');
        return;
    }
    isCleaningUp = true;

    console.log('[PsychoacousticService] Beginning comprehensive cleanup...');

    try {
        // Stop active playback first
        stopPsychoacoustic();

        // Clear all Cyber-Dawn timers
        cyberDawnTimers.forEach(timerId => {
            try { clearTimeout(timerId); } catch { /* ignore */ }
        });
        cyberDawnTimers = [];

        // Clear all Solar Alarm timers
        solarAlarmTimers.forEach(timerId => {
            try { clearTimeout(timerId); } catch { /* ignore */ }
        });
        solarAlarmTimers = [];

        // Emergency cleanup: disconnect all tracked nodes
        allCreatedNodes.forEach(node => {
            try { node.disconnect(); } catch { /* Already disconnected */ }
        });
        allCreatedNodes = [];

        // Disconnect master gain if still connected
        if (masterGain) {
            try { masterGain.disconnect(); } catch { /* ignore */ }
            masterGain = null;
        }

        // Close AudioContext to release system audio resources
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch((e) => {
                console.warn('[PsychoacousticService] Error closing AudioContext:', e);
            });
        }
        audioContext = null;

        console.log('[PsychoacousticService] Cleanup completed successfully');
    } catch (e) {
        console.error('[PsychoacousticService] Error during cleanup:', e);
    } finally {
        isCleaningUp = false;
    }
}

/**
 * Emergency stop for all psychoacoustic audio.
 * Use when audio needs to stop immediately (e.g., alarm dismissal).
 */
export function emergencyStopAll(): void {
    console.log('[PsychoacousticService] Emergency stop triggered');

    // Immediately mute master gain
    if (masterGain && audioContext && audioContext.state !== 'closed') {
        try {
            masterGain.gain.setValueAtTime(0, audioContext.currentTime);
        } catch { /* Context may be closed */ }
    }

    // Stop all active sounds
    stopPsychoacoustic();

    // Clear all timers immediately
    cyberDawnTimers.forEach(timerId => { try { clearTimeout(timerId); } catch { /* */ } });
    cyberDawnTimers = [];
    solarAlarmTimers.forEach(timerId => { try { clearTimeout(timerId); } catch { /* */ } });
    solarAlarmTimers = [];
}
