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

// --- 4. ALARM: CYBER-DAWN (FM Synthesis Procedural Dawn Chorus) ---
// A progressively building dawn chorus with warm bed, multiple bird species, and rhythmic pulse
export function playCyberDawnAlarm(volume: number = 0.7): { stop: () => void } {
    const ctx = getContext();
    let isPlaying = true;
    const t = ctx.currentTime;

    // Master gain with gentle progressive build
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(volume * 0.25, t + 3);  // Start at 25%
    masterGain.gain.linearRampToValueAtTime(volume * 0.5, t + 30);  // 50% at 30s
    masterGain.gain.linearRampToValueAtTime(volume * 0.75, t + 60); // 75% at 1 min
    masterGain.gain.linearRampToValueAtTime(volume, t + 90);        // Full at 1.5 min
    masterGain.connect(ctx.destination);

    // === WARM BED: Filtered pink noise with gentle pulse ===
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
        noiseData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const bedFilter = ctx.createBiquadFilter();
    bedFilter.type = 'lowpass';
    bedFilter.frequency.value = 400;
    bedFilter.Q.value = 0.7;

    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.12;

    // Gentle LFO pulse on the bed
    const bedLfo = ctx.createOscillator();
    const bedLfoGain = ctx.createGain();
    bedLfo.frequency.value = 0.3; // Slow breathing pulse
    bedLfoGain.gain.value = 0.03;
    bedLfo.connect(bedLfoGain);
    bedLfoGain.connect(bedGain.gain);

    noiseSource.connect(bedFilter);
    bedFilter.connect(bedGain);
    bedGain.connect(masterGain);
    noiseSource.start(t);
    bedLfo.start(t);

    // === BIRD SPECIES DEFINITIONS ===
    const species = [
        { freqRange: [2500, 3500], modRatio: 2.4, name: 'robin' },
        { freqRange: [1800, 2400], modRatio: 1.5, name: 'sparrow' },
        { freqRange: [3000, 4500], modRatio: 3.0, name: 'finch' },
        { freqRange: [1200, 1800], modRatio: 2.0, name: 'thrush' },
    ];

    let birdCount = 1;

    // Create independent voice with its own timing
    function createVoice(voiceId: number) {
        let voiceDelay = 2000 + voiceId * 500; // Each voice starts slower, staggers
        const minDelay = 400 + voiceId * 100;   // Each voice has different min speed

        function chirp(isFollowUp: boolean = false) {
            if (!isPlaying || !masterGain) return;
            const now = ctx.currentTime;

            const speciesIndex = Math.floor(Math.random() * birdCount);
            const bird = species[speciesIndex];

            const carrier = ctx.createOscillator();
            const modulator = ctx.createOscillator();
            const modGain = ctx.createGain();
            const env = ctx.createGain();

            const baseFreq = bird.freqRange[0] + Math.random() * (bird.freqRange[1] - bird.freqRange[0]);
            carrier.frequency.value = baseFreq;
            modulator.frequency.value = baseFreq * bird.modRatio;

            // Pitch sweep
            carrier.frequency.setValueAtTime(baseFreq, now);
            carrier.frequency.exponentialRampToValueAtTime(baseFreq * (1.1 + Math.random() * 0.2), now + 0.06);
            carrier.frequency.exponentialRampToValueAtTime(baseFreq * 0.95, now + 0.15);

            modGain.gain.value = 500 + Math.random() * 400;

            // Envelope - moderate volume
            env.gain.setValueAtTime(0, now);
            env.gain.linearRampToValueAtTime(0.35 + Math.random() * 0.15, now + 0.015);
            env.gain.setValueAtTime(0.35 + Math.random() * 0.15, now + 0.05);
            env.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + Math.random() * 0.08);

            modulator.connect(modGain);
            modGain.connect(carrier.frequency);
            carrier.connect(env);

            const panner = ctx.createStereoPanner();
            panner.pan.value = (Math.random() * 2) - 1;
            env.connect(panner);
            panner.connect(masterGain);

            carrier.start(now);
            modulator.start(now);
            carrier.stop(now + 0.3);
            modulator.stop(now + 0.3);

            // Double chirp - but DON'T let it schedule more chirps
            if (!isFollowUp && Math.random() > 0.7) {
                setTimeout(() => {
                    if (isPlaying) chirp(true); // Mark as follow-up
                }, 60 + Math.random() * 40);
            }

            // Schedule next main chirp (only if this wasn't a follow-up)
            if (!isFollowUp && isPlaying) {
                voiceDelay = Math.max(minDelay, voiceDelay * 0.992); // Slow decay
                const nextDelay = voiceDelay * (0.8 + Math.random() * 0.4);
                setTimeout(() => chirp(false), nextDelay);
            }
        }

        return chirp;
    }

    // Gradually introduce more bird species
    const speciesTimer = setInterval(() => {
        if (!isPlaying) return;
        if (birdCount < species.length) {
            birdCount++;
        }
    }, 15000); // New species every 15 seconds

    // Start voices staggered
    const voice1 = createVoice(0);
    setTimeout(() => voice1(false), 1000);

    // Second voice after 10 seconds
    setTimeout(() => {
        if (isPlaying) {
            const voice2 = createVoice(1);
            voice2(false);
        }
    }, 10000);

    // Third voice after 30 seconds
    setTimeout(() => {
        if (isPlaying) {
            const voice3 = createVoice(2);
            voice3(false);
        }
    }, 30000);

    const stopFn = () => {
        isPlaying = false;
        clearInterval(speciesTimer);
        const now = ctx.currentTime;
        if (masterGain) {
            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.linearRampToValueAtTime(0, now + 0.5);
        }
        setTimeout(() => {
            try { noiseSource.stop(); } catch { /* */ }
            try { bedLfo.stop(); } catch { /* */ }
        }, 600);
    };

    activeNodes = { stop: stopFn };
    return { stop: stopFn };
}

// --- 5. ALARM: SOLAR ASCENT (Harmonic Sunrise with Rhythmic Chimes) ---
// A warm, building alarm with pulsing harmonics, rhythmic chimes, and progressive intensity
export function playSolarAlarm(volume: number = 0.7): { stop: () => void } {
    const ctx = getContext();
    const t = ctx.currentTime;
    let isPlaying = true;

    // Master gain with progressive build
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(volume * 0.4, t + 2);   // Start at 40%
    masterGain.gain.linearRampToValueAtTime(volume * 0.7, t + 15);  // Build to 70%
    masterGain.gain.linearRampToValueAtTime(volume, t + 30);        // Full by 30s
    masterGain.connect(ctx.destination);

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
        gain.connect(masterGain);
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
        const freq = chimeNotes[noteIndex];

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
            setTimeout(playChime, chimeInterval);
        }
    }

    // Start chime pattern after 1 second
    setTimeout(playChime, 1000);

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
    brightnessFilter.connect(masterGain);

    // === PULSE/SWELL for urgency (starts after 20s) ===
    let pulseActive = false;
    setTimeout(() => {
        if (!isPlaying) return;
        pulseActive = true;

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

    const stopFn = () => {
        isPlaying = false;
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
export function cleanupPsychoacoustic(): void {
    stopPsychoacoustic();
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }
    audioContext = null;
    masterGain = null;
}
