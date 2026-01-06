import { Soundscape } from '../types';

let audioContext: AudioContext | null = null;

// Alarm Sound Nodes
let alarmOscillator: OscillatorNode | null = null;
let alarmGainNode: GainNode | null = null;

// Sleep Sound Nodes
let sleepSourceNode: AudioNode | null = null;
let sleepGainNode: GainNode | null = null;
let sleepTimeout: number | null = null;
let sleepCompressor: DynamicsCompressorNode | null = null;

// Granular synthesis interval for rain droplets
let granularInterval: ReturnType<typeof setTimeout> | null = null;
// Spark interval for fireplace
let sparkInterval: ReturnType<typeof setTimeout> | null = null;
// Additional LFOs for enhanced synthesis
let additionalLFOs: OscillatorNode[] = [];

// Cache for decoded audio files to prevent re-fetching
const audioBufferCache: { [src: string]: AudioBuffer } = {};

/**
 * Initializes the global AudioContext.
 * Must be called after a user interaction (click/touch) to resume from suspended state.
 */
export const initAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // It's safe to call resume multiple times.
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
};

const getAudioContext = (): AudioContext => {
    if (!audioContext) {
        // Fallback for safety, though init should be called first.
        initAudioContext();
    }
    return audioContext!;
};

// --- ALARM FUNCTIONS ---

/**
 * Plays the Somnia alarm - our signature very slow growing alarm.
 * Starts almost inaudible and very slowly builds over 60 seconds.
 * Automatically stops any playing sleep sounds.
 */
export const playSomniaAlarm = () => {
    stopSleepSound(); // Ensure sleep sounds are stopped
    const context = getAudioContext();
    if (alarmOscillator) {
        stopAlarmSound();
    }

    alarmOscillator = context.createOscillator();
    alarmGainNode = context.createGain();

    alarmOscillator.connect(alarmGainNode);
    alarmGainNode.connect(context.destination);

    const now = context.currentTime;
    alarmOscillator.type = 'sine';
    alarmOscillator.frequency.setValueAtTime(180, now); // Very low starting frequency
    alarmGainNode.gain.setValueAtTime(0.0001, now); // Almost inaudible start

    // Very slow ramp up over 60 seconds - the gentlest wake-up
    alarmGainNode.gain.exponentialRampToValueAtTime(0.4, now + 60);
    alarmOscillator.frequency.exponentialRampToValueAtTime(500, now + 60);

    alarmOscillator.start(now);
};

/**
 * Plays the progressive smart alarm.
 * Starts with low volume and frequency, ramping up over 30 seconds.
 * Automatically stops any playing sleep sounds.
 */
export const playProgressiveAlarm = () => {
    stopSleepSound(); // Ensure sleep sounds are stopped
    const context = getAudioContext();
    if (alarmOscillator) {
        stopAlarmSound();
    }

    alarmOscillator = context.createOscillator();
    alarmGainNode = context.createGain();

    alarmOscillator.connect(alarmGainNode);
    alarmGainNode.connect(context.destination);

    const now = context.currentTime;
    alarmOscillator.type = 'sine';
    alarmOscillator.frequency.setValueAtTime(300, now);
    alarmGainNode.gain.setValueAtTime(0.001, now);

    // Ramp up volume and frequency over 30 seconds
    alarmGainNode.gain.exponentialRampToValueAtTime(0.5, now + 30);
    alarmOscillator.frequency.exponentialRampToValueAtTime(800, now + 30);

    alarmOscillator.start(now);
};

/**
 * Stops the alarm sound immediately.
 * Fades out volume over 0.5s to prevent clicking artifacts.
 */
export const stopAlarmSound = () => {
    if (alarmGainNode && alarmOscillator && audioContext) {
        const now = audioContext.currentTime;
        alarmGainNode.gain.cancelScheduledValues(now);
        alarmGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        try {
            alarmOscillator.stop(now + 0.5);
        } catch (e) {
            console.warn("Error stopping alarm oscillator, it might have already been stopped.", e);
        }
    }
    alarmOscillator = null;
    alarmGainNode = null;
};

// Preview alarm state
let previewOscillator: OscillatorNode | null = null;
let previewGainNode: GainNode | null = null;
let previewTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Plays a 10-second preview of an alarm sound style.
 * @param soundId - The alarm sound to preview ('somnia', 'progressive', 'gentle', 'chimes', 'nature', 'classic')
 */
export const playAlarmPreview = (soundId: string) => {
    // Stop any current preview first
    stopAlarmPreview();

    const ctx = getAudioContext();
    if (!ctx) return;

    previewGainNode = ctx.createGain();
    previewGainNode.connect(ctx.destination);
    previewGainNode.gain.setValueAtTime(0.3, ctx.currentTime);

    previewOscillator = ctx.createOscillator();
    previewOscillator.connect(previewGainNode);

    // Different sound characteristics for each alarm type
    switch (soundId) {
        case 'somnia':
            // Very slow and growing - our signature alarm
            // Starts almost inaudible, grows to VERY LOUD over 60 seconds
            previewOscillator.type = 'sine';
            previewOscillator.frequency.setValueAtTime(180, ctx.currentTime); // Start very low
            previewGainNode.gain.setValueAtTime(0.01, ctx.currentTime);
            // Grows to maximum volume over 60 seconds
            previewOscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 60);
            previewGainNode.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + 60);
            break;
        case 'progressive':
            // Progressive Dream - grows to very loud over 45 seconds
            previewOscillator.type = 'sine';
            previewOscillator.frequency.setValueAtTime(300, ctx.currentTime);
            previewGainNode.gain.setValueAtTime(0.05, ctx.currentTime);
            previewOscillator.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 45);
            previewGainNode.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + 45);
            break;
        case 'gentle':
            // Soft, low frequency sine wave with slow pulse - 30 second cycle
            previewOscillator.type = 'sine';
            previewOscillator.frequency.setValueAtTime(220, ctx.currentTime);
            previewGainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            // Create gentle pulsing over 30 seconds
            for (let i = 0; i < 15; i++) {
                previewGainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 2 + 1);
                previewGainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 2 + 2);
            }
            break;
        case 'chimes':
            // Higher frequency with more harmonic content - 30 second cycle
            previewOscillator.type = 'triangle';
            previewOscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
            // Add shimmer effect over 30 seconds
            for (let i = 0; i < 10; i++) {
                previewOscillator.frequency.setValueAtTime(523, ctx.currentTime + i * 3);
                previewOscillator.frequency.linearRampToValueAtTime(659, ctx.currentTime + i * 3 + 0.75);
                previewOscillator.frequency.linearRampToValueAtTime(784, ctx.currentTime + i * 3 + 1.5);
                previewOscillator.frequency.linearRampToValueAtTime(523, ctx.currentTime + i * 3 + 2.25);
            }
            break;
        case 'nature':
            // Soft binaural-like with nature feel - 30 second cycle
            previewOscillator.type = 'sine';
            previewOscillator.frequency.setValueAtTime(174, ctx.currentTime); // Deep earth tone
            previewGainNode.gain.setValueAtTime(0.15, ctx.currentTime);
            // Gentle frequency modulation over 30 seconds
            for (let i = 0; i < 10; i++) {
                previewOscillator.frequency.linearRampToValueAtTime(196, ctx.currentTime + i * 3 + 1.5);
                previewOscillator.frequency.linearRampToValueAtTime(174, ctx.currentTime + i * 3 + 3);
            }
            break;
        case 'classic':
        default:
            // Traditional beeping alarm pattern - 30 second cycle
            previewOscillator.type = 'square';
            previewOscillator.frequency.setValueAtTime(880, ctx.currentTime);
            previewGainNode.gain.setValueAtTime(0.2, ctx.currentTime);
            // Classic beep pattern over 30 seconds
            for (let i = 0; i < 30; i++) {
                previewGainNode.gain.setValueAtTime(0.2, ctx.currentTime + i);
                previewGainNode.gain.setValueAtTime(0, ctx.currentTime + i + 0.5);
            }
            break;
    }

    previewOscillator.start(ctx.currentTime);

    // No auto-stop - user clicks again to stop
};

/**
 * Check if a preview is currently playing
 */
export const isPreviewPlaying = (): boolean => {
    return previewOscillator !== null;
};

/**
 * Toggle alarm preview - starts if stopped, stops if playing
 */
export const toggleAlarmPreview = (soundId: string): boolean => {
    if (isPreviewPlaying()) {
        stopAlarmPreview();
        return false; // now stopped
    } else {
        playAlarmPreview(soundId);
        return true; // now playing
    }
};

/**
 * Stops the alarm preview sound.
 */
export const stopAlarmPreview = () => {
    if (previewTimeout) {
        clearTimeout(previewTimeout);
        previewTimeout = null;
    }
    if (previewGainNode && previewOscillator && audioContext) {
        const now = audioContext.currentTime;
        previewGainNode.gain.cancelScheduledValues(now);
        previewGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        try {
            previewOscillator.stop(now + 0.2);
        } catch (e) {
            // Already stopped
        }
    }
    previewOscillator = null;
    previewGainNode = null;
};


// --- SLEEP SOUND FUNCTIONS ---

/**
 * PRODUCTION-GRADE NOISE GENERATION
 * 
 * Using "Dual-Mono Decorrelation" for stereo width:
 * - Each channel gets unique buffer with different random seed
 * - Creates "3D Space" surrounding the head vs flat skull sound
 * 
 * Buffer duration: 5 seconds to prevent repetition fatigue
 */

const NOISE_BUFFER_DURATION = 5; // seconds

/**
 * Gaussian White Noise - "Soft Air"
 * Uses Box-Muller Transform for creamy Gaussian distribution
 * (Standard uniform random is too harsh/spiky)
 */
const createGaussianWhiteBuffer = (context: AudioContext): AudioBuffer => {
    const bufferSize = context.sampleRate * NOISE_BUFFER_DURATION;
    // STEREO buffer for decorrelation
    const buffer = context.createBuffer(2, bufferSize, context.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < bufferSize; i++) {
            // Box-Muller Transform: Converts uniform random to Gaussian
            const u1 = Math.random();
            const u2 = Math.random();
            // Avoid log(0) by ensuring u1 > 0
            const safeU1 = Math.max(u1, 0.0001);
            const z0 = Math.sqrt(-2.0 * Math.log(safeU1)) * Math.cos(2.0 * Math.PI * u2);
            data[i] = z0 * 0.15; // Scale for comfortable volume
        }
    }
    return buffer;
};

/**
 * Paul Kellett's Pink Noise - "Bio Base"
 * Industry standard for smooth 1/f slope with ±0.05dB accuracy
 */
const createPinkBuffer = (context: AudioContext): AudioBuffer => {
    const bufferSize = context.sampleRate * NOISE_BUFFER_DURATION;
    // STEREO buffer for decorrelation
    const buffer = context.createBuffer(2, bufferSize, context.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
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
};

/**
 * Leaky Brown Noise - "Deep Magma"
 * Uses Leaky Integrator to prevent DC offset drift
 * Formula: output = (lastOutput * 0.98) + (white * 0.02)
 * The "leak" (division by 1.02) forces wave to center itself
 */
const createBrownBuffer = (context: AudioContext): AudioBuffer => {
    const bufferSize = context.sampleRate * NOISE_BUFFER_DURATION;
    // STEREO buffer for decorrelation
    const buffer = context.createBuffer(2, bufferSize, context.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Leaky Integrator: 0.02 is slew rate, 1.02 is the leak
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            data[i] = lastOut * 3.5; // Gain compensation for warm presence
        }
    }
    return buffer;
};

/**
 * Creates a raw noise buffer (for backwards compatibility with mono synthesis chains)
 */
const createRawNoiseBuffer = (context: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBuffer => {
    const bufferSize = context.sampleRate * 2;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = buffer.getChannelData(0);

    if (type === 'white') {
        // Gaussian white noise for synthesis chains
        for (let i = 0; i < bufferSize; i++) {
            const u1 = Math.max(Math.random(), 0.0001);
            const u2 = Math.random();
            const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            output[i] = z0 * 0.15;
        }
    } else if (type === 'pink') {
        // Paul Kellet's refined pink noise algorithm
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
    } else if (type === 'brown') {
        // Leaky integrator brown noise
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            output[i] = lastOut * 3.5;
        }
    }

    return buffer;
};

/**
 * Creates a basic noise source node without EQ (for use in synthesis chains)
 */
const createNoiseNode = (context: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBufferSourceNode => {
    const buffer = createRawNoiseBuffer(context, type);
    const noiseNode = context.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;
    return noiseNode;
};

// Track EQ filter nodes for cleanup
let somniaEqFilters: BiquadFilterNode[] = [];

/**
 * Creates "Somnia-Polish" EQ-shaped noise for premium sleep audio
 *
 * Type-specific psychoacoustic optimization:
 * - WHITE: LPF @ 10kHz (removes digital harshness, "soft-air")
 * - PINK: Notch @ 3500Hz (ear canal resonance - makes it feel surrounding vs inside skull)
 * - BROWN: HPF @ 40Hz (protects speakers from DC/sub-bass) + aggressive LPF @ 250Hz (deep rumble)
 *
 * Plus universal warmth boost at 60Hz
 */
const createSomniaGreyNoise = (
    context: AudioContext,
    type: 'white' | 'pink' | 'brown',
    outputNode: AudioNode
): AudioBufferSourceNode => {
    // Use stereo buffer for premium spatial feel
    let buffer: AudioBuffer;
    if (type === 'white') {
        buffer = createGaussianWhiteBuffer(context);
    } else if (type === 'pink') {
        buffer = createPinkBuffer(context);
    } else {
        buffer = createBrownBuffer(context);
    }

    const noiseNode = context.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;

    // Universal: 60 Hz Low Shelf Boost (+4dB) - Adds warmth/weight
    const warmthBoost = context.createBiquadFilter();
    warmthBoost.type = 'lowshelf';
    warmthBoost.frequency.setValueAtTime(60, context.currentTime);
    warmthBoost.gain.setValueAtTime(4, context.currentTime);

    // Type-specific "Polish" filters
    const polishFilter = context.createBiquadFilter();

    if (type === 'white') {
        // SOFT-AIR: Cut harsh digital bite above 10kHz
        polishFilter.type = 'lowpass';
        polishFilter.frequency.setValueAtTime(10000, context.currentTime);
        polishFilter.Q.setValueAtTime(0.7, context.currentTime);

        noiseNode.connect(warmthBoost);
        warmthBoost.connect(polishFilter);
        polishFilter.connect(outputNode);

        somniaEqFilters = [warmthBoost, polishFilter];

    } else if (type === 'pink') {
        // EAR CANAL RESONANCE: Notch at 3500Hz makes it feel surrounding vs skull
        polishFilter.type = 'notch';
        polishFilter.frequency.setValueAtTime(3500, context.currentTime);
        polishFilter.Q.setValueAtTime(1.0, context.currentTime);

        noiseNode.connect(warmthBoost);
        warmthBoost.connect(polishFilter);
        polishFilter.connect(outputNode);

        somniaEqFilters = [warmthBoost, polishFilter];

    } else {
        // BROWN: HPF @ 40Hz (protect speakers) + aggressive LPF @ 250Hz (deep rumble only)

        // HPF @ 40Hz: Cut inaudible 1-30Hz sub-bass that rattles phone speakers
        polishFilter.type = 'highpass';
        polishFilter.frequency.setValueAtTime(40, context.currentTime);
        polishFilter.Q.setValueAtTime(0.7, context.currentTime);

        // LPF @ 250Hz: Aggressive cut for pure low-end rumble
        const brownLPF = context.createBiquadFilter();
        brownLPF.type = 'lowpass';
        brownLPF.frequency.setValueAtTime(250, context.currentTime);
        brownLPF.Q.setValueAtTime(0.707, context.currentTime);

        noiseNode.connect(warmthBoost);
        warmthBoost.connect(polishFilter);
        polishFilter.connect(brownLPF);
        brownLPF.connect(outputNode);

        somniaEqFilters = [warmthBoost, polishFilter, brownLPF];
    }

    return noiseNode;
};


/**
 * Creates optimized binaural beats using the scientifically superior 110 Hz carrier
 *
 * Why 110 Hz (Low A2):
 * - Resonates in the chest/body (somatic entrainment)
 * - Below the ear's hypersensitive 2-5 kHz range (Fletcher-Munson curve)
 * - Feels "warm" and "grounding" like a sonic blanket
 *
 * Beat frequencies:
 * - Deep Sleep (Delta): 2.5 Hz - Golden Mean for Slow Wave Sleep
 * - REM/Creative (Theta): 6.0 Hz - Twilight frequency for lucid states
 */
const createBinauralNode = (context: AudioContext, baseFreq: number, diff: number): ChannelMergerNode => {
    const oscLeft = context.createOscillator();
    const oscRight = context.createOscillator();
    const merger = context.createChannelMerger(2);

    // Use pure sine waves for clean binaural beats
    oscLeft.type = 'sine';
    oscRight.type = 'sine';

    // Left ear: base frequency - half difference
    // Right ear: base frequency + half difference
    // This creates the binaural beat at the "diff" frequency in the brain
    oscLeft.frequency.value = baseFreq - diff / 2;
    oscRight.frequency.value = baseFreq + diff / 2;

    // Binaural beats should be subtle (~-25dB ≈ 0.056 linear gain)
    // Slightly louder than pure -25dB for the low 110 Hz carrier
    const gainLeft = context.createGain();
    const gainRight = context.createGain();
    gainLeft.gain.value = 0.08;  // Subtle but perceptible binaural mix
    gainRight.gain.value = 0.08;

    oscLeft.connect(gainLeft);
    oscRight.connect(gainRight);
    gainLeft.connect(merger, 0, 0);
    gainRight.connect(merger, 0, 1);

    oscLeft.start();
    oscRight.start();

    // Attach oscillators and gains to the merger node for cleanup and live updates
    (merger as any).oscillators = [oscLeft, oscRight];
    (merger as any).gains = [gainLeft, gainRight];

    return merger;
};

const getAudioBuffer = async (context: AudioContext, src: string): Promise<AudioBuffer> => {
    if (audioBufferCache[src]) {
        return audioBufferCache[src];
    }
    const response = await fetch(src);
    if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    audioBufferCache[src] = audioBuffer;
    return audioBuffer;
};

/**
 * Plays a sleep soundscape (white noise, binaural beats, or audio file).
 * 
 * @param sound - The Soundscape configuration object
 * @param durationMinutes - Duration to play in minutes (0 for infinite)
 */
export const playSleepSound = async (sound: Soundscape, durationMinutes: number, volume: number = 0.5) => {
    stopAlarmSound(); // Ensure alarm is stopped
    const context = getAudioContext();

    if (context.state === 'suspended') {
        await context.resume();
    }

    stopSleepSound(); // Stop any currently playing sleep sound

    // Master Bus: Dynamics Compressor for professional sound
    sleepCompressor = context.createDynamicsCompressor();
    sleepCompressor.threshold.setValueAtTime(-20, context.currentTime);
    sleepCompressor.knee.setValueAtTime(10, context.currentTime);
    sleepCompressor.ratio.setValueAtTime(4, context.currentTime);
    sleepCompressor.attack.setValueAtTime(0.003, context.currentTime);
    sleepCompressor.release.setValueAtTime(0.25, context.currentTime);
    sleepCompressor.connect(context.destination);

    sleepGainNode = context.createGain();
    sleepGainNode.gain.setValueAtTime(0, context.currentTime);
    // Soft limiter: never exceed 0.9
    const targetVolume = Math.min(volume, 0.9);
    sleepGainNode.gain.linearRampToValueAtTime(targetVolume, context.currentTime + 2); // Fade in to target volume
    sleepGainNode.connect(sleepCompressor);

    if (sound.type === 'noise') {
        // Use Somnia-Grey EQ shaping for premium sleep audio quality
        // This applies psychoacoustic optimization: +3dB@60Hz, -3dB@400Hz, -6dB@3500Hz
        sleepSourceNode = createSomniaGreyNoise(context, sound.params.type, sleepGainNode);
        (sleepSourceNode as AudioBufferSourceNode).start();
    } else if (sound.type === 'binaural') {
        sleepSourceNode = createBinauralNode(context, sound.params.base, sound.params.diff);
        sleepSourceNode.connect(sleepGainNode);
    } else if (sound.type === 'file') {
        try {
            const audioBuffer = await getAudioBuffer(context, sound.params.src);
            const sourceNode = context.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.loop = true;
            sleepSourceNode = sourceNode;
            sleepSourceNode.connect(sleepGainNode);
            (sleepSourceNode as AudioBufferSourceNode).start();
        } catch (e) {
            console.error("Failed to load or play audio file, fallback to synthesis:", e);
            if (sleepGainNode) {
                sleepGainNode.disconnect();
                sleepGainNode = null;
            }
            return;
        }
    } else if (sound.type === 'synthetic') {
        // Advanced DSP synthesis for nature sounds (Somnia Audio Engine)
        const type = sound.params.type;

        if (type === 'rain') {
            // === GLASS RAIN RECIPE ===
            // Layer A: Atmospheric pink noise background
            const atmosphereNoise = createNoiseNode(context, 'pink');
            const atmosphereFilter = context.createBiquadFilter();
            atmosphereFilter.type = 'bandpass';
            atmosphereFilter.frequency.setValueAtTime(400, context.currentTime);
            atmosphereFilter.Q.setValueAtTime(0.5, context.currentTime);
            const atmosphereGain = context.createGain();
            atmosphereGain.gain.setValueAtTime(0.15, context.currentTime); // Low background

            atmosphereNoise.connect(atmosphereFilter);
            atmosphereFilter.connect(atmosphereGain);
            atmosphereGain.connect(sleepGainNode);
            atmosphereNoise.start();

            // Layer B: Granular Droplets
            // Create 3 bandpass filters for different droplet tones
            const dropletFilters = [
                { freq: 400, name: 'body' },    // Body
                { freq: 1100, name: 'glass' },  // Glass
                { freq: 2200, name: 'air' }     // Air
            ].map(({ freq }) => {
                const filter = context.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(freq, context.currentTime);
                filter.Q.setValueAtTime(2, context.currentTime);
                filter.connect(sleepGainNode);
                return filter;
            });

            // Granular droplet generator
            const createDroplet = () => {
                if (!sleepGainNode || !audioContext) return;

                // Random interval for next droplet (40-150ms)
                const nextInterval = 40 + Math.random() * 110;

                // Create short noise burst (droplet)
                const dropletBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.06, audioContext.sampleRate);
                const data = dropletBuffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    data[i] = (Math.random() * 2 - 1);
                }

                const droplet = audioContext.createBufferSource();
                droplet.buffer = dropletBuffer;

                // Envelope: Attack 0.005s, Decay 0.05s
                const envelope = audioContext.createGain();
                const now = audioContext.currentTime;
                envelope.gain.setValueAtTime(0, now);
                envelope.gain.linearRampToValueAtTime(0.3 + Math.random() * 0.2, now + 0.005);
                envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

                // Random filter selection
                const filterIndex = Math.floor(Math.random() * 3);
                const selectedFilter = dropletFilters[filterIndex];

                // Slight random panning (-0.3 to 0.3)
                const panner = audioContext.createStereoPanner();
                panner.pan.setValueAtTime((Math.random() - 0.5) * 0.6, now);

                droplet.connect(envelope);
                envelope.connect(panner);
                panner.connect(selectedFilter);

                droplet.start(now);
                droplet.stop(now + 0.06);

                // Schedule next droplet
                granularInterval = setTimeout(createDroplet, nextInterval);
            };

            // Start droplet generation
            granularInterval = setTimeout(createDroplet, 100);

            sleepSourceNode = atmosphereNoise;
            (atmosphereNoise as any).dropletFilters = dropletFilters;

        } else if (type === 'ocean') {
            // === NEBULA OCEAN RECIPE ===
            // Pink noise base with dual LFO modulation
            const noise = createNoiseNode(context, 'pink');
            const filter = context.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, context.currentTime);
            filter.Q.setValueAtTime(1, context.currentTime);

            // Gain for volume modulation
            const waveGain = context.createGain();
            waveGain.gain.setValueAtTime(0.4, context.currentTime);

            // LFO A (Gain): 0.1 Hz sine, modulates volume 0.1 to 0.7
            const lfoA = context.createOscillator();
            lfoA.type = 'sine';
            lfoA.frequency.setValueAtTime(0.1, context.currentTime);
            const lfoAGain = context.createGain();
            lfoAGain.gain.setValueAtTime(0.3, context.currentTime); // +/- 0.3 around 0.4 = 0.1 to 0.7
            lfoA.connect(lfoAGain);
            lfoAGain.connect(waveGain.gain);
            lfoA.start();

            // LFO B (Timbre): 0.08 Hz sine, modulates filter 200-800Hz
            const lfoB = context.createOscillator();
            lfoB.type = 'sine';
            lfoB.frequency.setValueAtTime(0.08, context.currentTime); // Different rate prevents loop fatigue
            const lfoBGain = context.createGain();
            lfoBGain.gain.setValueAtTime(300, context.currentTime); // +/- 300Hz around 500 = 200-800Hz
            lfoB.connect(lfoBGain);
            lfoBGain.connect(filter.frequency);
            lfoB.start();

            noise.connect(filter);
            filter.connect(waveGain);
            waveGain.connect(sleepGainNode);
            noise.start();

            // Track LFOs for cleanup
            (noise as any).lfo = lfoA;
            additionalLFOs = [lfoA, lfoB];
            sleepSourceNode = noise;

        } else if (type === 'fireplace') {
            // === PLASMA FIRE RECIPE ===
            // Layer A: Brown noise rumble through lowpass
            const rumble = createNoiseNode(context, 'brown');
            const rumbleFilter = context.createBiquadFilter();
            rumbleFilter.type = 'lowpass';
            rumbleFilter.frequency.setValueAtTime(140, context.currentTime); // Deep rumble only
            const rumbleGain = context.createGain();
            rumbleGain.gain.setValueAtTime(0.5, context.currentTime);

            rumble.connect(rumbleFilter);
            rumbleFilter.connect(rumbleGain);
            rumbleGain.connect(sleepGainNode);
            rumble.start();

            // Layer B: Spark/crackle generator with filter pinging
            const createSpark = () => {
                if (!sleepGainNode || !audioContext) return;

                // Random check (roughly 3% chance every 50ms)
                if (Math.random() > 0.97) {
                    // Create impulse (1ms of noise)
                    const impulseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.001, audioContext.sampleRate);
                    const data = impulseBuffer.getChannelData(0);
                    for (let i = 0; i < data.length; i++) {
                        data[i] = (Math.random() * 2 - 1);
                    }

                    const impulse = audioContext.createBufferSource();
                    impulse.buffer = impulseBuffer;

                    // High-Q bandpass filter (Q: 20) for resonant "ping"
                    const pingFilter = audioContext.createBiquadFilter();
                    pingFilter.type = 'bandpass';
                    pingFilter.frequency.setValueAtTime(400 + Math.random() * 200, audioContext.currentTime); // 400-600Hz
                    pingFilter.Q.setValueAtTime(20, audioContext.currentTime); // High Q for resonance

                    // Envelope for the ping
                    const pingGain = audioContext.createGain();
                    const now = audioContext.currentTime;
                    pingGain.gain.setValueAtTime(0.4 + Math.random() * 0.3, now);
                    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                    impulse.connect(pingFilter);
                    pingFilter.connect(pingGain);
                    pingGain.connect(sleepGainNode);

                    impulse.start(now);
                    impulse.stop(now + 0.001);
                }

                // Schedule next check
                sparkInterval = setTimeout(createSpark, 50);
            };

            // Start spark generation
            sparkInterval = setTimeout(createSpark, 100);

            sleepSourceNode = rumble;
        }
    }

    if (durationMinutes > 0) {
        // Use a gentle 30-second fade out when the timer expires naturally
        sleepTimeout = window.setTimeout(() => stopSleepSound(30), durationMinutes * 60 * 1000);
    }
};

/**
 * Stops the currently playing sleep sound.
 * Fades out volume over specified duration (default 2s).
 * Cleans up audio nodes and oscillators.
 */
export const stopSleepSound = (fadeDuration: number = 2) => {
    // Clear all intervals first
    if (sleepTimeout) {
        clearTimeout(sleepTimeout);
        sleepTimeout = null;
    }
    if (granularInterval) {
        clearTimeout(granularInterval);
        granularInterval = null;
    }
    if (sparkInterval) {
        clearTimeout(sparkInterval);
        sparkInterval = null;
    }

    const context = audioContext;
    if (sleepGainNode && context) {
        const now = context.currentTime;
        sleepGainNode.gain.cancelScheduledValues(now);
        // Ramp down to near-zero first to avoid popping, then disconnect
        sleepGainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);

        // Disconnect after fade-out is complete
        setTimeout(() => {
            if (sleepGainNode) {
                sleepGainNode.disconnect();
                sleepGainNode = null;
            }
            // Cleanup compressor
            if (sleepCompressor) {
                sleepCompressor.disconnect();
                sleepCompressor = null;
            }
            // Cleanup Somnia-Grey EQ filters
            if (somniaEqFilters.length > 0) {
                somniaEqFilters.forEach(filter => {
                    try { filter.disconnect(); } catch (e) { /* ignore */ }
                });
                somniaEqFilters = [];
            }
        }, (fadeDuration * 1000) + 100);
    }

    // Cleanup additional LFOs
    if (additionalLFOs.length > 0 && context) {
        const stopTime = context.currentTime + fadeDuration;
        additionalLFOs.forEach(lfo => {
            try { lfo.stop(stopTime); } catch (e) { /* ignore */ }
        });
        setTimeout(() => {
            additionalLFOs.forEach(lfo => {
                try { lfo.disconnect(); } catch (e) { /* ignore */ }
            });
            additionalLFOs = [];
        }, (fadeDuration * 1000) + 100);
    }

    if (sleepSourceNode && context) {
        const stopTime = context.currentTime + fadeDuration;
        const currentNode = sleepSourceNode; // Capture for closure

        if (currentNode instanceof AudioBufferSourceNode || currentNode instanceof OscillatorNode) {
            try { (currentNode as any).stop(stopTime); } catch (e) { /* ignore */ }
        }

        // For binaural beats
        if ((currentNode as any).oscillators) {
            (currentNode as any).oscillators.forEach((osc: OscillatorNode) => {
                try { osc.stop(stopTime); } catch (e) { /* ignore */ }
            });
        }

        // Cleanup synthetic extras (LFO, Crackle, dropletFilters)
        if ((currentNode as any).lfo) {
            try { (currentNode as any).lfo.stop(stopTime); } catch (e) { }
        }
        if ((currentNode as any).crackle) {
            try { (currentNode as any).crackle.stop(stopTime); } catch (e) { }
        }

        setTimeout(() => {
            if (currentNode) {
                // Disconnect main
                currentNode.disconnect();

                // Disconnect extras
                if ((currentNode as any).lfo) (currentNode as any).lfo.disconnect();
                if ((currentNode as any).crackle) (currentNode as any).crackle.disconnect();
                if ((currentNode as any).dropletFilters) {
                    (currentNode as any).dropletFilters.forEach((f: BiquadFilterNode) => {
                        try { f.disconnect(); } catch (e) { /* ignore */ }
                    });
                }
            }
        }, (fadeDuration * 1000) + 100);

        sleepSourceNode = null;
    }
};



/**
 * Adjusts the volume of the currently playing sleep sound in real-time.
 *
 * @param volume - Target volume level (0-1)
 */
export const setLiveVolume = (volume: number) => {
    if (sleepGainNode && audioContext) {
        // Smooth transition to new volume
        sleepGainNode.gain.setTargetAtTime(volume, audioContext.currentTime, 0.1);
    }
};

/**
 * Updates the binaural beat frequency in real-time.
 * Only works if a binaural beat is currently playing.
 *
 * @param baseFreq - Base frequency in Hz
 * @param diff - Beat frequency difference in Hz
 */
export const setLiveBeatFrequency = (baseFreq: number, diff: number) => {
    if (sleepSourceNode && audioContext && (sleepSourceNode as any).oscillators) {
        const oscillators = (sleepSourceNode as any).oscillators as OscillatorNode[];
        if (oscillators.length === 2) {
            const now = audioContext.currentTime;
            // Smooth transition to new frequencies
            oscillators[0].frequency.setTargetAtTime(baseFreq - diff / 2, now, 0.1);
            oscillators[1].frequency.setTargetAtTime(baseFreq + diff / 2, now, 0.1);
        }
    }
};

/**
 * Check if a sleep sound is currently playing
 */
export const isSleepSoundPlaying = (): boolean => {
    return sleepSourceNode !== null && sleepGainNode !== null;
};

// --- BREATHING CUE FUNCTIONS ---

/**
 * Plays a subtle breath cue sound (band-passed white noise).
 * 
 * @param direction - 'in' (higher pitch) or 'out' (lower pitch)
 * @param duration - Length of the breath in seconds
 */
export const playBreathSound = (direction: 'in' | 'out', duration: number) => {
    const context = getAudioContext();
    if (!context) return;

    const gain = context.createGain();
    gain.connect(context.destination);

    const bufferSize = context.sampleRate * duration;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    const whiteNoise = context.createBufferSource();
    whiteNoise.buffer = buffer;

    const bandpass = context.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = direction === 'in' ? 1500 : 800;
    bandpass.Q.value = 1.5;

    whiteNoise.connect(bandpass).connect(gain);

    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.5); // Fade in cue
    gain.gain.linearRampToValueAtTime(0, now + duration); // Fade out over duration

    whiteNoise.start(now);
    whiteNoise.stop(now + duration);
}