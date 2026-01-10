/**
 * SOMNIA EXPANSION PACK v2.0: Psychoacoustic Environments
 *
 * Advanced DSP synthesis using Web Audio API for:
 * - Deep Sleep (Abyssal Pressure): Brown Noise + 40Hz Gamma Pulse
 * - Anxiety Clearing (Silicon Forest): Comb-filtered metallic wind
 * - Coherence Breathing (Resonance Chamber): Timbre-modulated 5.5s cycles
 * - Synthetic Alarms: FM birds (Cyber-Dawn), Additive harmonics (Solar Ascent)
 */

let audioContext: AudioContext | null = null;
let activeNodes: { stop: () => void } | null = null;
let masterGain: GainNode | null = null;

// Initialize or get audio context
function getContext(): AudioContext {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContext();
    }
    return audioContext;
}

// --- HELPER: NOISE BUFFER GENERATOR ---
function createNoiseBuffer(ctx: AudioContext, type: 'brown' | 'pink'): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'brown') {
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            data[i] = lastOut * 3.5; // Gain compensation
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

    // Connect noise chain
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);

    // Connect gamma pulse
    subOsc.connect(subGain);
    subGain.connect(masterGain);

    // Start all
    noise.start(t);
    lfo.start(t);
    subOsc.start(t);

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
    const phaseInterval = setInterval(() => {
        if (!isActive) return;
        const elapsed = (ctx.currentTime - cycleStartTime) % CYCLE_DURATION;
        currentPhase = elapsed < 5.5 ? 'inhale' : 'exhale';
    }, 100);

    const stopFn = () => {
        isActive = false;
        if (intervalId) clearInterval(intervalId);
        clearInterval(phaseInterval);

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

// --- 4. ALARM: CYBER-DAWN (FM Synthesis Procedural Birds) ---
export function playCyberDawnAlarm(volume: number = 0.5): { stop: () => void } {
    const ctx = getContext();
    let isPlaying = true;

    // Master gain with fade-in
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3);
    masterGain.connect(ctx.destination);

    function chirp() {
        if (!isPlaying || !masterGain) return;
        const t = ctx.currentTime;

        // FM Synthesis Pair
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        const env = ctx.createGain();

        // Randomized Pitch (2kHz - 4kHz range - bird frequency)
        const baseFreq = 2000 + Math.random() * 2000;
        carrier.frequency.value = baseFreq;
        modulator.frequency.value = baseFreq * 2.4; // Metallic ratio

        modGain.gain.value = 800 + Math.random() * 400; // FM Depth variation

        // Short envelope (Bird-like chirp)
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.25, t + 0.03 + Math.random() * 0.03);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.2 + Math.random() * 0.15);

        // FM routing
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(env);

        // Spatial Pan (Stereo forest effect)
        const panner = ctx.createStereoPanner();
        panner.pan.value = (Math.random() * 2) - 1;
        env.connect(panner);
        panner.connect(masterGain);

        carrier.start(t);
        modulator.start(t);
        carrier.stop(t + 0.5);
        modulator.stop(t + 0.5);

        // Next bird: Random 0.8s to 3s (getting more frequent over time)
        if (isPlaying) {
            const baseDelay = 800 + Math.random() * 2200;
            setTimeout(chirp, baseDelay);
        }
    }

    // Start first chirp after brief silence
    setTimeout(chirp, 500);

    const stopFn = () => {
        isPlaying = false;
        const now = ctx.currentTime;
        if (masterGain) {
            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.linearRampToValueAtTime(0, now + 0.5);
        }
    };

    activeNodes = { stop: stopFn };
    return { stop: stopFn };
}

// --- 5. ALARM: SOLAR ASCENT (Additive Synthesis Harmonic Blooming) ---
export function playSolarAlarm(volume: number = 0.5): { stop: () => void } {
    const ctx = getContext();
    const t = ctx.currentTime;
    const fundamental = 261.63; // C4
    const harmonics = [1, 2, 3, 4, 5, 6]; // Extended harmonic series
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    // Master gain
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(volume, t + 2);
    masterGain.connect(ctx.destination);

    harmonics.forEach((h, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = fundamental * h;

        const gain = ctx.createGain();
        gain.gain.value = 0;

        // Staggered Entry: Add a harmonic every 8 seconds
        const startTime = t + (i * 8);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime((0.12 / h) * volume, startTime + 4);

        // Slight detune for warmth
        osc.detune.value = (Math.random() - 0.5) * 5;

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);

        oscillators.push(osc);
        gains.push(gain);
    });

    const stopFn = () => {
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
                try { o.stop(); } catch { /* already stopped */ }
            });
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
export function cleanupPsychoacoustic(): void {
    stopPsychoacoustic();
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }
    audioContext = null;
    masterGain = null;
}
