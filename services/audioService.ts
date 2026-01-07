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
    stopSleepSound();
    const context = getAudioContext();
    if (alarmOscillator) {
        stopAlarmSound();
    }

    if (context.state === 'suspended') {
        context.resume();
    }

    alarmOscillator = context.createOscillator();
    alarmGainNode = context.createGain();

    alarmOscillator.connect(alarmGainNode);
    alarmGainNode.connect(context.destination);

    const now = context.currentTime;
    alarmOscillator.type = 'sine';
    alarmOscillator.frequency.setValueAtTime(180, now);
    alarmGainNode.gain.setValueAtTime(0.015, now);

    // CRESCENDO: 60s gentle wake-up from quiet to full volume
    alarmGainNode.gain.exponentialRampToValueAtTime(1.0, now + 60);
    alarmOscillator.frequency.exponentialRampToValueAtTime(500, now + 60);

    // SUSTAIN: After 60s, oscillator continues at 500Hz and 1.0 volume indefinitely
    // No additional scheduling needed - Web Audio holds the final values

    alarmOscillator.start(now);
    console.log('[playSomniaAlarm] Started - 60s crescendo to full volume, then sustains');
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
 * Plays an alarm sound by its ID.
 * Dispatches to the correct alarm implementation based on user selection.
 * @param soundId - The alarm sound ID from alarm setup
 */
export const playAlarmBySound = (soundId: string = 'somnia') => {
    console.log('[playAlarmBySound] Requested soundId:', soundId);
    switch (soundId) {
        case 'somnia':
            console.log('[playAlarmBySound] Playing Somnia alarm');
            playSomniaAlarm();
            break;
        case 'progressive':
            console.log('[playAlarmBySound] Playing Progressive alarm');
            playProgressiveAlarm();
            break;
        case 'gentle':
            console.log('[playAlarmBySound] Playing Gentle Rise alarm');
            playGentleAlarm();
            break;
        case 'chimes':
            console.log('[playAlarmBySound] Playing Chimes alarm');
            playChimesAlarm();
            break;
        case 'nature':
            console.log('[playAlarmBySound] Playing Nature alarm');
            playNatureAlarm();
            break;
        case 'classic':
            console.log('[playAlarmBySound] Playing Classic alarm');
            playClassicAlarm();
            break;
        case 'prism':
            console.log('[playAlarmBySound] Playing Prism alarm');
            playPrismAlarm();
            break;
        case 'aether':
            console.log('[playAlarmBySound] Playing Aether alarm');
            playAetherAlarm();
            break;
        case 'bamboo':
            console.log('[playAlarmBySound] Playing Bamboo alarm');
            playBambooAlarm();
            break;
        default:
            console.log('[playAlarmBySound] Unknown soundId, defaulting to Somnia:', soundId);
            playSomniaAlarm();
    }
};

/**
 * Gentle Rise alarm - soft gradual wake-up with crescendo
 * Sine wave 220Hz with pulsing, crescendos over 60s then continues loud
 * Bulletproof: 30 minutes of patterns scheduled
 */
const playGentleAlarm = () => {
    stopSleepSound();
    const context = getAudioContext();
    if (alarmOscillator) stopAlarmSound();

    if (context.state === 'suspended') {
        context.resume();
    }

    alarmOscillator = context.createOscillator();
    alarmGainNode = context.createGain();

    alarmOscillator.connect(alarmGainNode);
    alarmGainNode.connect(context.destination);

    const now = context.currentTime;
    alarmOscillator.type = 'sine';
    alarmOscillator.frequency.setValueAtTime(220, now);

    // CRESCENDO PHASE (0-60s): Start quiet, pulse louder each cycle
    // Each pulse is 2 seconds, so 30 pulses in crescendo phase
    for (let i = 0; i < 30; i++) {
        const t = now + i * 2;
        const progress = i / 30; // 0 to 1
        const minVol = 0.05 + progress * 0.45; // 0.05 -> 0.50
        const maxVol = 0.15 + progress * 0.85; // 0.15 -> 1.0
        alarmGainNode.gain.linearRampToValueAtTime(maxVol, t + 1);
        alarmGainNode.gain.linearRampToValueAtTime(minVol, t + 2);
    }

    // SUSTAIN PHASE (60s+): Continue at full volume for 30 minutes
    // 900 more cycles (30 min = 1800s, minus 60s crescendo = 1740s / 2s = 870 cycles)
    for (let i = 0; i < 870; i++) {
        const t = now + 60 + i * 2;
        alarmGainNode.gain.linearRampToValueAtTime(1.0, t + 1);
        alarmGainNode.gain.linearRampToValueAtTime(0.5, t + 2);
    }

    alarmOscillator.start(now);
    console.log('[playGentleAlarm] Started - 60s crescendo, then 30min sustain');
};

/**
 * Wind Chimes alarm - peaceful chime melody
 */
const playChimesAlarm = () => {
    stopSleepSound();
    const context = getAudioContext();
    if (alarmOscillator) stopAlarmSound();

    alarmOscillator = context.createOscillator();
    alarmGainNode = context.createGain();

    alarmOscillator.connect(alarmGainNode);
    alarmGainNode.connect(context.destination);

    const now = context.currentTime;
    alarmOscillator.type = 'triangle'; // Softer timbre like chimes
    alarmOscillator.frequency.setValueAtTime(523, now); // C5 - chime-like
    alarmGainNode.gain.setValueAtTime(0.0001, now);

    // Ramp with gentle oscillation feel
    alarmGainNode.gain.exponentialRampToValueAtTime(0.25, now + 30);
    alarmOscillator.frequency.exponentialRampToValueAtTime(784, now + 30); // G5

    alarmOscillator.start(now);
};

/**
 * Nature Dawn alarm - birds and morning sounds (using filtered noise)
 */
const playNatureAlarm = () => {
    stopSleepSound();
    const context = getAudioContext();
    if (alarmOscillator) stopAlarmSound();

    // Use high-passed noise for bird-like chirping
    alarmOscillator = context.createOscillator();
    alarmGainNode = context.createGain();

    alarmOscillator.connect(alarmGainNode);
    alarmGainNode.connect(context.destination);

    const now = context.currentTime;
    alarmOscillator.type = 'sine';
    alarmOscillator.frequency.setValueAtTime(800, now); // Higher, bird-like
    alarmGainNode.gain.setValueAtTime(0.0001, now);

    alarmGainNode.gain.exponentialRampToValueAtTime(0.3, now + 30);
    alarmOscillator.frequency.exponentialRampToValueAtTime(1200, now + 30);

    alarmOscillator.start(now);
};

/**
 * Classic Alarm - traditional alarm tone with crescendo
 * Square wave at 880Hz with beeping, crescendos over 60s then continues loud
 * Bulletproof: 30 minutes of beeping scheduled
 */
const playClassicAlarm = () => {
    stopSleepSound();
    const context = getAudioContext();
    if (alarmOscillator) stopAlarmSound();

    if (context.state === 'suspended') {
        context.resume();
    }

    alarmOscillator = context.createOscillator();
    alarmGainNode = context.createGain();

    alarmOscillator.connect(alarmGainNode);
    alarmGainNode.connect(context.destination);

    const now = context.currentTime;
    alarmOscillator.type = 'square';
    alarmOscillator.frequency.setValueAtTime(880, now);

    // CRESCENDO PHASE (0-60s): Start quiet, beep louder each second
    for (let i = 0; i < 60; i++) {
        const t = now + i;
        const progress = i / 60; // 0 to 1
        const volume = 0.05 + progress * 0.85; // 0.05 -> 0.90
        alarmGainNode.gain.setValueAtTime(volume, t);
        alarmGainNode.gain.setValueAtTime(0, t + 0.5);
    }

    // SUSTAIN PHASE (60s+): Continue at full volume for 30 minutes
    // 1740 more beeps (30 min = 1800s, minus 60s crescendo)
    for (let i = 0; i < 1740; i++) {
        const t = now + 60 + i;
        alarmGainNode.gain.setValueAtTime(0.9, t);
        alarmGainNode.gain.setValueAtTime(0, t + 0.5);
    }

    alarmOscillator.start(now);
    console.log('[playClassicAlarm] Started - 60s crescendo, then 30min sustain');
};

// === PROCEDURAL ALARM SYSTEM ("SOMNIA WAKE ENGINE") ===
// These alarms use spectral ramping to wake users without cortisol spikes
// 60-second linear fade-in preserves dream recall

const WAKE_DURATION = 60; // Seconds to full volume
// C Major Pentatonic Scale (Harmonious, no dissonance)
const PENTATONIC_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

// Track procedural alarm state for cleanup
let proceduralAlarmStop: (() => void) | null = null;
let proceduralGainNode: GainNode | null = null;

/**
 * PRISM Alarm - Ethereal glass chimes with crescendo
 * Pentatonic chimes that crescendo over 60s then continue loud
 * Bulletproof: 30 minutes of chimes scheduled
 */
const playPrismAlarm = () => {
    console.log('[playPrismAlarm] Starting Prism alarm');
    stopSleepSound();
    const context = getAudioContext();
    if (alarmOscillator) stopAlarmSound();
    cleanupProceduralAlarm();

    if (context.state === 'suspended') {
        context.resume();
    }

    proceduralGainNode = context.createGain();
    proceduralGainNode.connect(context.destination);

    const now = context.currentTime;

    // Master volume crescendo over 60s to full volume, then sustain
    proceduralGainNode.gain.setValueAtTime(0.2, now);
    proceduralGainNode.gain.linearRampToValueAtTime(1.0, now + WAKE_DURATION);

    const baseOsc = context.createOscillator();
    const baseGain = context.createGain();
    baseOsc.type = 'sine';
    baseGain.gain.setValueAtTime(0.4, now);
    baseOsc.connect(baseGain);
    baseGain.connect(proceduralGainNode);

    // Schedule 30 minutes of chimes (720 chimes at 2.5s each)
    const prismNotes = PENTATONIC_SCALE;
    for (let i = 0; i < 720; i++) {
        const note = prismNotes[i % prismNotes.length];
        const t = now + i * 2.5;
        baseOsc.frequency.setValueAtTime(note, t);
        // Chime envelope: LOUD attack, decay to moderate (not silent)
        baseGain.gain.setValueAtTime(1.0, t);
        baseGain.gain.exponentialRampToValueAtTime(0.35, t + 1.5);
    }

    baseOsc.start(now);
    console.log('[playPrismAlarm] Started - 60s crescendo, 720 chimes over 30min');

    proceduralAlarmStop = () => {
        console.log('[playPrismAlarm] Stopping');
        try { baseOsc.stop(); } catch { }
    };
};

/**
 * AETHER Alarm - Cinematic drone with filter sweep and crescendo
 * Sawtooth at 110Hz->220Hz, crescendos then continues loud
 * Bulletproof: Continuous drone plays indefinitely
 */
const playAetherAlarm = () => {
    console.log('[playAetherAlarm] Starting Aether alarm');
    stopSleepSound();
    const context = getAudioContext();
    if (alarmOscillator) stopAlarmSound();
    cleanupProceduralAlarm();

    if (context.state === 'suspended') {
        context.resume();
    }

    proceduralGainNode = context.createGain();
    proceduralGainNode.connect(context.destination);

    const now = context.currentTime;

    const osc = context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);

    // CRESCENDO: Sweep frequency 110->220Hz and volume 0.05->0.9 over 60s
    osc.frequency.exponentialRampToValueAtTime(220, now + WAKE_DURATION);
    proceduralGainNode.gain.setValueAtTime(0.05, now);
    proceduralGainNode.gain.linearRampToValueAtTime(0.9, now + WAKE_DURATION);

    // SUSTAIN: After crescendo, continue at 220Hz and 0.9 volume indefinitely
    // The oscillator keeps playing - no need to schedule more

    osc.connect(proceduralGainNode);
    osc.start(now);
    console.log('[playAetherAlarm] Started - 60s crescendo to 0.5 volume, then sustains');

    proceduralAlarmStop = () => {
        console.log('[playAetherAlarm] Stopping');
        try { osc.stop(); } catch { }
    };
};

/**
 * BAMBOO Alarm - Hollow wooden pulse that accelerates with crescendo
 * Accelerating pulse pattern, crescendos over 60s then continues loud
 * Bulletproof: 30 minutes of pulses scheduled
 */
const playBambooAlarm = () => {
    console.log('[playBambooAlarm] Starting Bamboo alarm');
    stopSleepSound();
    const context = getAudioContext();
    if (alarmOscillator) stopAlarmSound();
    cleanupProceduralAlarm();

    if (context.state === 'suspended') {
        context.resume();
    }

    proceduralGainNode = context.createGain();
    proceduralGainNode.connect(context.destination);

    const now = context.currentTime;

    // Master volume crescendo over 60s to full volume - start louder
    proceduralGainNode.gain.setValueAtTime(0.25, now);
    proceduralGainNode.gain.linearRampToValueAtTime(1.0, now + WAKE_DURATION);

    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);

    const pulseGain = context.createGain();
    pulseGain.gain.setValueAtTime(0, now);

    osc.connect(pulseGain);
    pulseGain.connect(proceduralGainNode);

    // Schedule 30 minutes of pulses (1800 seconds)
    let baseBeat = 0;
    let interval = 1.0;
    let pulseCount = 0;

    while (baseBeat < 1800) { // 30 minutes
        // Soft attack: start low, ramp UP over 20ms to avoid click/pop
        pulseGain.gain.setValueAtTime(0.05, now + baseBeat);
        pulseGain.gain.linearRampToValueAtTime(1.0, now + baseBeat + 0.02); // LOUD pulse
        osc.frequency.setValueAtTime(300, now + baseBeat);

        // Decay: ramp down but not to silence - keep some sustain
        pulseGain.gain.exponentialRampToValueAtTime(0.15, now + baseBeat + 0.2);
        osc.frequency.exponentialRampToValueAtTime(150, now + baseBeat + 0.2);

        baseBeat += interval;
        interval = Math.max(0.4, interval * 0.92);

        // Reset acceleration every ~20 pulses to create waves
        if (interval <= 0.4) interval = 1.0;
        pulseCount++;
    }

    osc.start(now);
    console.log('[playBambooAlarm] Started - 60s crescendo,', pulseCount, 'pulses over 30min');

    proceduralAlarmStop = () => {
        console.log('[playBambooAlarm] Stopping');
        try { osc.stop(); } catch { }
    };
};

/**
 * Cleanup procedural alarm resources
 */
const cleanupProceduralAlarm = () => {
    console.log('[cleanupProceduralAlarm] Called, proceduralAlarmStop exists:', !!proceduralAlarmStop);

    if (proceduralAlarmStop) {
        proceduralAlarmStop();
        proceduralAlarmStop = null;
    }

    // Capture the node to clean up and clear the global immediately
    // to prevent the timeout from cleaning up a NEWLY created node
    if (proceduralGainNode && audioContext) {
        const nodeToCleanup = proceduralGainNode;
        proceduralGainNode = null;

        const now = audioContext.currentTime;
        try {
            nodeToCleanup.gain.cancelScheduledValues(now);
            nodeToCleanup.gain.linearRampToValueAtTime(0, now + 0.1);

            setTimeout(() => {
                try {
                    nodeToCleanup.disconnect();
                } catch (e) {
                    // Ignore errors if already disconnected
                }
            }, 200);
        } catch (e) {
            console.warn('Error cleaning up procedural alarm:', e);
        }
    }
}

/**
 * Stops the alarm sound immediately.
 * Fades out volume over 0.5s to prevent clicking artifacts.
 */
export const stopAlarmSound = () => {
    console.log('[stopAlarmSound] Called at', new Date().toISOString());

    // Stop regular oscillator-based alarms
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

    // Stop procedural alarms (Prism, Aether, Bamboo)
    cleanupProceduralAlarm();
};

// Preview alarm state
let previewOscillator: OscillatorNode | null = null;
let previewGainNode: GainNode | null = null;
let previewTimeout: ReturnType<typeof setTimeout> | null = null;
let currentPreviewId: string | null = null; // Track which sound is previewing

/**
 * Plays the alarm sound as a preview, starting at 25% intensity.
 * This gives users a better idea of what the alarm sounds like without
 * waiting through the quiet beginning.
 * User taps again to stop.
 * @param soundId - The alarm sound to preview
 */
export const playAlarmPreview = (soundId: string) => {
    // Stop any current preview first
    stopAlarmPreview();

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    // Track which sound is playing
    currentPreviewId = soundId;

    previewGainNode = ctx.createGain();
    previewGainNode.connect(ctx.destination);

    previewOscillator = ctx.createOscillator();
    previewOscillator.connect(previewGainNode);

    const now = ctx.currentTime;

    // Previews start at 25% of crescendo (15s in) so user can hear it immediately
    // Then continue crescendo for remaining 45s to full volume
    switch (soundId) {
        case 'somnia':
            // Start at 25%: ~0.08 volume, ~260Hz, crescendo to 1.0/500Hz over 45s
            previewOscillator.type = 'sine';
            previewOscillator.frequency.setValueAtTime(260, now);
            previewGainNode.gain.setValueAtTime(0.08, now);
            previewGainNode.gain.exponentialRampToValueAtTime(1.0, now + 45);
            previewOscillator.frequency.exponentialRampToValueAtTime(500, now + 45);
            break;

        case 'gentle':
            // Start at pulse 8 (25% of 30 pulses), continue for remaining 22 pulses
            previewOscillator.type = 'sine';
            previewOscillator.frequency.setValueAtTime(220, now);
            for (let i = 0; i < 22; i++) {
                const t = now + i * 2;
                const progress = (i + 8) / 30; // Start from pulse 8
                const minVol = 0.05 + progress * 0.45;
                const maxVol = 0.15 + progress * 0.85;
                previewGainNode.gain.linearRampToValueAtTime(maxVol, t + 1);
                previewGainNode.gain.linearRampToValueAtTime(minVol, t + 2);
            }
            break;

        case 'classic':
            // Start at beep 15 (25% of 60), continue for remaining 45 beeps
            previewOscillator.type = 'square';
            previewOscillator.frequency.setValueAtTime(880, now);
            for (let i = 0; i < 45; i++) {
                const t = now + i;
                const progress = (i + 15) / 60; // Start from beep 15
                const volume = 0.05 + progress * 0.85;
                previewGainNode.gain.setValueAtTime(volume, t);
                previewGainNode.gain.setValueAtTime(0, t + 0.5);
            }
            break;

        case 'prism':
            // Start master at 0.4 (25% of 0.2→1.0), crescendo to 1.0 over 45s - LOUDER
            previewOscillator.type = 'sine';
            const prismMasterGain = ctx.createGain();
            prismMasterGain.gain.setValueAtTime(0.4, now);
            prismMasterGain.gain.linearRampToValueAtTime(1.0, now + 45);
            previewOscillator.disconnect();
            previewOscillator.connect(previewGainNode);
            previewGainNode.disconnect();
            previewGainNode.connect(prismMasterGain);
            prismMasterGain.connect(ctx.destination);
            // Schedule 18 chimes (skip first 6) - LOUD chimes
            const prismNotes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
            for (let i = 0; i < 18; i++) {
                const note = prismNotes[(i + 6) % prismNotes.length];
                const t = now + i * 2.5;
                previewOscillator.frequency.setValueAtTime(note, t);
                previewGainNode.gain.setValueAtTime(1.0, t);
                previewGainNode.gain.exponentialRampToValueAtTime(0.35, t + 1.5);
            }
            break;

        case 'aether':
            // Start at 25%: ~138Hz, ~0.26 volume, crescendo to 220Hz/0.9 over 45s
            previewOscillator.type = 'sawtooth';
            previewOscillator.frequency.setValueAtTime(138, now);
            previewGainNode.gain.setValueAtTime(0.26, now);
            previewOscillator.frequency.exponentialRampToValueAtTime(220, now + 45);
            previewGainNode.gain.linearRampToValueAtTime(0.9, now + 45);
            break;

        case 'bamboo':
            // Start master at 0.44 (25% of 0.25→1.0), crescendo to 1.0 over 45s - LOUDER
            previewOscillator.type = 'sine';
            previewOscillator.frequency.setValueAtTime(150, now);
            const bambooMasterGain = ctx.createGain();
            bambooMasterGain.gain.setValueAtTime(0.44, now);
            bambooMasterGain.gain.linearRampToValueAtTime(1.0, now + 45);
            previewOscillator.disconnect();
            previewOscillator.connect(previewGainNode);
            previewGainNode.disconnect();
            previewGainNode.connect(bambooMasterGain);
            bambooMasterGain.connect(ctx.destination);
            // Schedule accelerating pulses for 45s - LOUD pulses
            let baseBeat = 0;
            let interval = 0.7; // Start faster (as if 15s in)
            while (baseBeat < 45) {
                previewGainNode.gain.setValueAtTime(0.05, now + baseBeat);
                previewGainNode.gain.linearRampToValueAtTime(1.0, now + baseBeat + 0.02);
                previewOscillator.frequency.setValueAtTime(300, now + baseBeat);
                previewGainNode.gain.exponentialRampToValueAtTime(0.15, now + baseBeat + 0.2);
                previewOscillator.frequency.exponentialRampToValueAtTime(150, now + baseBeat + 0.2);
                baseBeat += interval;
                interval = Math.max(0.4, interval * 0.92);
                if (interval <= 0.4) interval = 0.7; // Reset wave
            }
            break;

        default:
            // Fallback to classic at 25%
            previewOscillator.type = 'square';
            previewOscillator.frequency.setValueAtTime(880, now);
            for (let i = 0; i < 45; i++) {
                const t = now + i;
                const progress = (i + 15) / 60;
                const volume = 0.05 + progress * 0.85;
                previewGainNode.gain.setValueAtTime(volume, t);
                previewGainNode.gain.setValueAtTime(0, t + 0.5);
            }
            break;
    }

    previewOscillator.start(now);

    // No auto-stop - user clicks again to stop
};

/**
 * Check if a preview is currently playing
 */
export const isPreviewPlaying = (): boolean => {
    return previewOscillator !== null;
};

/**
 * Get the currently playing preview sound ID
 */
export const getCurrentPreviewId = (): string | null => {
    return currentPreviewId;
};

/**
 * Toggle alarm preview - starts if stopped, stops if same sound playing, switches if different
 */
export const toggleAlarmPreview = (soundId: string): boolean => {
    if (isPreviewPlaying()) {
        if (currentPreviewId === soundId) {
            // Same sound - stop it
            stopAlarmPreview();
            return false;
        } else {
            // Different sound - stop old, start new
            stopAlarmPreview();
            playAlarmPreview(soundId);
            return true;
        }
    } else {
        // Nothing playing - start this one
        playAlarmPreview(soundId);
        return true;
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
    currentPreviewId = null; // Clear tracking
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

/**
 * Creates a Sleep Ramp binaural beat system with multi-stage frequency descent.
 * 
 * The ramp guides the brain from wakefulness to deep sleep:
 * - Phase 1 (Alpha, 0-20%): 12Hz → 8Hz - Decompression, settling in
 * - Phase 2 (Theta, 20-50%): 8Hz → 4Hz - Hypnagogic bridge, losing linear thought
 * - Phase 3 (Delta, 50-100%): 4Hz → 1.5Hz - Deep sleep anchor
 * 
 * After the ramp completes, the frequency holds at 1.5Hz indefinitely.
 * 
 * @param context - AudioContext
 * @param baseFreq - Carrier frequency (typically 110Hz for chest resonance)
 * @param durationMinutes - Total duration of the ramp in minutes (0 = 30 min default)
 * @returns ChannelMergerNode with attached oscillators for cleanup
 */
const createSleepRampNode = (
    context: AudioContext,
    baseFreq: number,
    durationMinutes: number
): ChannelMergerNode => {
    const oscLeft = context.createOscillator();
    const oscRight = context.createOscillator();
    const merger = context.createChannelMerger(2);

    oscLeft.type = 'sine';
    oscRight.type = 'sine';

    // Ramp duration: use provided duration or default to 30 minutes
    // For very long sessions (8+ hours), cap ramp at 45 minutes
    const rampMinutes = durationMinutes === 0 ? 30 : Math.min(durationMinutes, 45);
    const rampSeconds = rampMinutes * 60;
    const now = context.currentTime;

    // === FREQUENCY RAMP SCHEDULE ===
    // Binaural beat = difference between left and right oscillator frequencies
    // Left ear: baseFreq - (beatFreq / 2)
    // Right ear: baseFreq + (beatFreq / 2)

    // Phase boundaries (percentage-based)
    const phase1End = rampSeconds * 0.20;  // 20% - Alpha phase ends
    const phase2End = rampSeconds * 0.50;  // 50% - Theta phase ends
    const phase3End = rampSeconds;          // 100% - Delta phase ends

    // Beat frequencies at each transition point
    const alphaStart = 12;   // Starting frequency (relaxed alertness)
    const alphaEnd = 8;      // End of alpha (transition)
    const thetaEnd = 4;      // End of theta (hypnagogic)
    const deltaEnd = 1.5;    // Final deep delta (hold here)

    // Helper to set frequency pair for binaural beat
    const setFrequencyPair = (time: number, beatFreq: number, method: 'set' | 'ramp') => {
        const leftFreq = baseFreq - beatFreq / 2;
        const rightFreq = baseFreq + beatFreq / 2;

        if (method === 'set') {
            oscLeft.frequency.setValueAtTime(leftFreq, time);
            oscRight.frequency.setValueAtTime(rightFreq, time);
        } else {
            oscLeft.frequency.linearRampToValueAtTime(leftFreq, time);
            oscRight.frequency.linearRampToValueAtTime(rightFreq, time);
        }
    };

    // === SCHEDULE THE RAMP ===

    // Start at Alpha (12Hz)
    setFrequencyPair(now, alphaStart, 'set');

    // Phase 1: Alpha 12Hz → 8Hz (0% to 20%)
    setFrequencyPair(now + phase1End, alphaEnd, 'ramp');

    // Phase 2: Theta 8Hz → 4Hz (20% to 50%)
    setFrequencyPair(now + phase2End, thetaEnd, 'ramp');

    // Phase 3: Delta 4Hz → 1.5Hz (50% to 100%)
    setFrequencyPair(now + phase3End, deltaEnd, 'ramp');

    // After ramp: Hold at 1.5Hz indefinitely (no further changes needed - audio API holds last value)

    // Subtle binaural gain (same as regular binaural beats)
    const gainLeft = context.createGain();
    const gainRight = context.createGain();
    gainLeft.gain.setValueAtTime(0.08, now);
    gainRight.gain.setValueAtTime(0.08, now);

    oscLeft.connect(gainLeft);
    oscRight.connect(gainRight);
    gainLeft.connect(merger, 0, 0);
    gainRight.connect(merger, 0, 1);

    oscLeft.start(now);
    oscRight.start(now);

    // Attach oscillators for cleanup
    (merger as any).oscillators = [oscLeft, oscRight];
    (merger as any).gains = [gainLeft, gainRight];
    (merger as any).rampDurationSeconds = rampSeconds;

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
    } else if (sound.type === 'ramp') {
        // Sleep Ramp: Multi-stage binaural descent (Alpha→Theta→Delta)
        // Duration scales the ramp phases proportionally
        sleepSourceNode = createSleepRampNode(context, sound.params.base, durationMinutes);
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

// --- ALERTNESS BOOST FUNCTIONS (Wake-Up Flow) ---

// Active alertness nodes
let alertnessNodes: { oscLeft: OscillatorNode; oscRight: OscillatorNode; gainNode: GainNode } | null = null;

/**
 * Plays 12Hz Beta binaural beats for alertness during wake-up
 * 
 * 12Hz Beta is optimal for:
 * - Gentle alertness without stress
 * - Cognitive readiness
 * - Smooth transition from sleep to wakefulness
 * 
 * Uses same 110Hz carrier as sleep sounds for consistency
 */
export const playAlertnessBoost = () => {
    const context = getAudioContext();
    if (!context || alertnessNodes) return; // Already playing

    const baseFreq = 110; // Same comfortable carrier
    const betaDiff = 12;  // 12Hz for gentle alertness

    const oscLeft = context.createOscillator();
    const oscRight = context.createOscillator();
    const merger = context.createChannelMerger(2);
    const gainNode = context.createGain();

    oscLeft.type = 'sine';
    oscRight.type = 'sine';
    oscLeft.frequency.value = baseFreq - betaDiff / 2;
    oscRight.frequency.value = baseFreq + betaDiff / 2;

    const now = context.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 2); // Gentle fade in

    oscLeft.connect(merger, 0, 0);
    oscRight.connect(merger, 0, 1);
    merger.connect(gainNode);
    gainNode.connect(context.destination);

    oscLeft.start();
    oscRight.start();

    alertnessNodes = { oscLeft, oscRight, gainNode };
};

/**
 * Stops alertness boost with gentle fade out
 */
export const stopAlertnessBoost = () => {
    if (!alertnessNodes || !audioContext) return;

    const { oscLeft, oscRight, gainNode } = alertnessNodes;
    const now = audioContext.currentTime;

    gainNode.gain.linearRampToValueAtTime(0, now + 1);

    setTimeout(() => {
        try {
            oscLeft.stop();
            oscRight.stop();
            oscLeft.disconnect();
            oscRight.disconnect();
            gainNode.disconnect();
        } catch (e) {
            // Already stopped
        }
        alertnessNodes = null;
    }, 1100);
};

/**
 * Check if alertness boost is playing
 */
export const isAlertnessBoostPlaying = (): boolean => {
    return alertnessNodes !== null;
};