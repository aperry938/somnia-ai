import { Soundscape } from '../types';
import { logger } from './logger';
import { configureAudioSession, setAudioSessionActive, setupInterruptionHandling } from './audioSessionService';
import {
    playAbyssalPressure,
    playSiliconForest,
    setPsychoacousticVolume,
    stopPsychoacoustic,
    playCyberDawnAlarm,
    playSolarAlarm
} from './psychoacousticService';
import { isPremium } from './secureSubscriptionService';

// ============================================================
// TYPES
// ============================================================

/** Extended window type for webkit prefix support */
interface WebkitWindow extends Window {
    webkitAudioContext: typeof AudioContext;
}

/** Alarm configuration for the unified alarm system */
interface AlarmConfig {
    type: OscillatorType;
    startFreq: number;
    endFreq: number;
    startGain: number;
    endGain: number;
    rampDuration: number;
    pattern?: 'continuous' | 'pulse' | 'beep' | 'chime' | 'accelerate';
    pulseInterval?: number;
}

/** Binaural node with attached oscillators for cleanup */
interface BinauralMergerNode extends ChannelMergerNode {
    oscillators: OscillatorNode[];
    gains: GainNode[];
    rampDurationSeconds?: number;
}

/** Noise source with attached synthesis nodes */
interface SynthesisSourceNode extends AudioBufferSourceNode {
    lfo?: OscillatorNode;
    crackle?: AudioBufferSourceNode;
}

// ============================================================
// CONSTANTS
// ============================================================

/** Duration for crescendo phase in seconds */
const WAKE_DURATION = 60;

/** Duration for sustained alarm in seconds (30 minutes) */
const SUSTAIN_DURATION = 1800;

/** Noise buffer duration in seconds */
const NOISE_BUFFER_DURATION = 5;

/** C Major Pentatonic Scale frequencies (Hz) */
const PENTATONIC_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

/** Alarm sound configurations */
const ALARM_CONFIGS: Record<string, AlarmConfig> = {
    somnia: {
        type: 'sine',
        startFreq: 180,
        endFreq: 500,
        startGain: 0.015,
        endGain: 1.0,
        rampDuration: 60,
        pattern: 'continuous'
    },
    progressive: {
        type: 'sine',
        startFreq: 300,
        endFreq: 800,
        startGain: 0.001,
        endGain: 0.5,
        rampDuration: 30,
        pattern: 'continuous'
    },
    gentle: {
        type: 'sine',
        startFreq: 220,
        endFreq: 220,
        startGain: 0.05,
        endGain: 1.0,
        rampDuration: 60,
        pattern: 'pulse',
        pulseInterval: 2
    },
    chimes: {
        type: 'triangle',
        startFreq: 523,
        endFreq: 784,
        startGain: 0.0001,
        endGain: 0.25,
        rampDuration: 30,
        pattern: 'continuous'
    },
    nature: {
        type: 'sine',
        startFreq: 800,
        endFreq: 1200,
        startGain: 0.0001,
        endGain: 0.3,
        rampDuration: 30,
        pattern: 'continuous'
    },
    classic: {
        type: 'square',
        startFreq: 880,
        endFreq: 880,
        startGain: 0.05,
        endGain: 0.9,
        rampDuration: 60,
        pattern: 'beep',
        pulseInterval: 1
    }
};

// ============================================================
// MODULE STATE
// ============================================================

let audioContext: AudioContext | null = null;

// Alarm Sound Nodes
let alarmOscillator: OscillatorNode | null = null;
let alarmGainNode: GainNode | null = null;

// Sleep Sound Nodes
let sleepSourceNode: AudioNode | null = null;
let sleepGainNode: GainNode | null = null;
let sleepTimeout: number | null = null;
let sleepCompressor: DynamicsCompressorNode | null = null;

// Synthesis intervals
let sparkInterval: ReturnType<typeof setTimeout> | null = null;

// Cleanup mutex to prevent race conditions during audio shutdown
let isCleaningUp = false;

// Additional LFOs for enhanced synthesis
let additionalLFOs: OscillatorNode[] = [];

// Phone call interruption handling
let interruptionCleanup: (() => void) | null = null;
let currentSleepSound: { sound: Soundscape; durationMinutes: number; volume: number } | null = null;
let wasPlayingBeforeInterruption = false;

// Flag to indicate sound should persist across page navigation (for "Fall Asleep Now" flow)
// When true, stopSleepSound() will be ignored from page cleanup handlers
let persistAcrossNavigation = false;

// Track the last played sound for restart functionality
let lastPlayedSound: { sound: Soundscape; volume: number } | null = null;
// Track if sound ended naturally (timer expired) vs user stopped it
let soundEndedNaturally = false;

// NOTE: Intentionally NO visibilitychange handler here.
// Sleep sounds MUST continue playing when the screen locks or app backgrounds.
// iOS/Android background audio is handled via:
// - iOS: AVAudioSession configuration in AudioSessionPlugin.swift
// - Android: Foreground service in AlarmService.java
// Killing audio on visibility change would break the core sleep sound functionality.

// Cache for decoded audio files
const audioBufferCache: Record<string, AudioBuffer> = {};

// ============================================================
// AUDIO CONTEXT MANAGEMENT
// ============================================================

/**
 * Initializes the global AudioContext.
 * Must be called after a user interaction (click/touch) to resume from suspended state.
 */
export const initAudioContext = () => {
    if (!audioContext) {
        const AudioContextClass = window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;
        audioContext = new AudioContextClass();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
};

const getAudioContext = (): AudioContext => {
    if (!audioContext) {
        initAudioContext();
    }
    return audioContext!;
};

/**
 * Ensures audio context is ready for playback
 */
const ensureContextReady = (context: AudioContext): void => {
    if (context.state === 'suspended') {
        context.resume();
    }
};

// ============================================================
// ALARM HELPERS
// ============================================================

/**
 * Prepares the audio context and nodes for alarm playback
 */
const prepareAlarmNodes = (): { context: AudioContext; now: number } => {
    stopSleepSound();
    const context = getAudioContext();
    if (alarmOscillator) {
        stopAlarmSound();
    }
    ensureContextReady(context);

    alarmOscillator = context.createOscillator();
    alarmGainNode = context.createGain();
    alarmOscillator.connect(alarmGainNode);
    alarmGainNode.connect(context.destination);

    return { context, now: context.currentTime };
};

/**
 * Creates a simple continuous alarm with exponential ramp
 */
const createContinuousAlarm = (config: AlarmConfig): void => {
    const { context: _context, now } = prepareAlarmNodes();

    alarmOscillator!.type = config.type;
    alarmOscillator!.frequency.setValueAtTime(config.startFreq, now);
    alarmGainNode!.gain.setValueAtTime(config.startGain, now);

    alarmGainNode!.gain.exponentialRampToValueAtTime(config.endGain, now + config.rampDuration);
    alarmOscillator!.frequency.exponentialRampToValueAtTime(config.endFreq, now + config.rampDuration);

    alarmOscillator!.start(now);
};

/**
 * Creates a pulsing alarm with crescendo then sustained pulses
 */
const createPulsingAlarm = (config: AlarmConfig): void => {
    const { now } = prepareAlarmNodes();
    const interval = config.pulseInterval || 2;
    const crescendoPulses = Math.floor(config.rampDuration / interval);
    const sustainPulses = Math.floor((SUSTAIN_DURATION - config.rampDuration) / interval);

    alarmOscillator!.type = config.type;
    alarmOscillator!.frequency.setValueAtTime(config.startFreq, now);

    // Crescendo phase - pulses get progressively louder
    for (let i = 0; i < crescendoPulses; i++) {
        const t = now + i * interval;
        const progress = i / crescendoPulses;
        const minVol = config.startGain + progress * (config.endGain * 0.5 - config.startGain);
        const maxVol = config.startGain * 3 + progress * (config.endGain - config.startGain * 3);
        alarmGainNode!.gain.linearRampToValueAtTime(maxVol, t + interval * 0.5);
        alarmGainNode!.gain.linearRampToValueAtTime(minVol, t + interval);
    }

    // Sustain phase - full volume pulses
    for (let i = 0; i < sustainPulses; i++) {
        const t = now + config.rampDuration + i * interval;
        alarmGainNode!.gain.linearRampToValueAtTime(config.endGain, t + interval * 0.5);
        alarmGainNode!.gain.linearRampToValueAtTime(config.endGain * 0.5, t + interval);
    }

    alarmOscillator!.start(now);
};

/**
 * Creates a beeping alarm with crescendo then sustained beeps
 */
const createBeepingAlarm = (config: AlarmConfig): void => {
    const { now } = prepareAlarmNodes();
    const interval = config.pulseInterval || 1;
    const crescendoBeeps = config.rampDuration;
    const sustainBeeps = SUSTAIN_DURATION - config.rampDuration;

    alarmOscillator!.type = config.type;
    alarmOscillator!.frequency.setValueAtTime(config.startFreq, now);

    // Crescendo phase
    for (let i = 0; i < crescendoBeeps; i++) {
        const t = now + i * interval;
        const progress = i / crescendoBeeps;
        const volume = config.startGain + progress * (config.endGain - config.startGain);
        alarmGainNode!.gain.setValueAtTime(volume, t);
        alarmGainNode!.gain.setValueAtTime(0, t + 0.5);
    }

    // Sustain phase
    for (let i = 0; i < sustainBeeps; i++) {
        const t = now + config.rampDuration + i * interval;
        alarmGainNode!.gain.setValueAtTime(config.endGain, t);
        alarmGainNode!.gain.setValueAtTime(0, t + 0.5);
    }

    alarmOscillator!.start(now);
};

// ============================================================
// ALARM FUNCTIONS
// ============================================================

/**
 * Plays the Somnia alarm - our signature very slow growing alarm.
 * Starts almost inaudible and very slowly builds over 60 seconds.
 */
export const playSomniaAlarm = () => {
    const config = ALARM_CONFIGS.somnia;
    if (config) {
        createContinuousAlarm(config);
    }
    logger.log('[playSomniaAlarm] Started - 60s crescendo to full volume, then sustains');
};

/**
 * Plays the progressive smart alarm.
 * Starts with low volume and frequency, ramping up over 30 seconds.
 */
export const playProgressiveAlarm = () => {
    const config = ALARM_CONFIGS.progressive;
    if (config) {
        createContinuousAlarm(config);
    }
};

/**
 * Plays an alarm sound by its ID.
 * Dispatches to the correct alarm implementation based on user selection.
 * @param soundId - The alarm sound ID from alarm setup
 */
export const playAlarmBySound = (soundId: string = 'somnia') => {
    logger.log('[playAlarmBySound] Requested soundId:', soundId);
    switch (soundId) {
        case 'somnia':
            logger.log('[playAlarmBySound] Playing Somnia alarm');
            playSomniaAlarm();
            break;
        case 'progressive':
            logger.log('[playAlarmBySound] Playing Progressive alarm');
            playProgressiveAlarm();
            break;
        case 'chimes':
            logger.log('[playAlarmBySound] Playing Chimes alarm');
            playChimesAlarm();
            break;
        case 'nature':
            logger.log('[playAlarmBySound] Playing Nature alarm');
            playNatureAlarm();
            break;
        case 'classic':
            logger.log('[playAlarmBySound] Playing Classic alarm');
            playClassicAlarm();
            break;
        case 'prism':
            logger.log('[playAlarmBySound] Playing Prism alarm');
            playPrismAlarm();
            break;
        case 'aether':
            logger.log('[playAlarmBySound] Playing Aether alarm');
            playAetherAlarm();
            break;
        case 'cyber-dawn':
            if (!isPremium()) {
                logger.warn('[playAlarmBySound] Cyber-Dawn requires premium, falling back to Somnia');
                playSomniaAlarm();
            } else {
                logger.log('[playAlarmBySound] Playing Cyber-Dawn alarm');
                playCyberDawnAlarmWrapper();
            }
            break;
        case 'solar-ascent':
            if (!isPremium()) {
                logger.warn('[playAlarmBySound] Solar Ascent requires premium, falling back to Somnia');
                playSomniaAlarm();
            } else {
                logger.log('[playAlarmBySound] Playing Solar Ascent alarm');
                playSolarAlarmWrapper();
            }
            break;
        default:
            logger.log('[playAlarmBySound] Unknown soundId, defaulting to Somnia:', soundId);
            playSomniaAlarm();
    }
};

/**
 * Gentle Rise alarm - soft gradual wake-up with crescendo
 */
const playGentleAlarm = () => {
    const config = ALARM_CONFIGS.gentle;
    if (config) {
        createPulsingAlarm(config);
    }
    logger.log('[playGentleAlarm] Started - 60s crescendo, then 30min sustain');
};

/**
 * Wind Chimes alarm - peaceful chime melody
 */
const playChimesAlarm = () => {
    const config = ALARM_CONFIGS.chimes;
    if (config) {
        createContinuousAlarm(config);
    }
};

/**
 * Nature Dawn alarm - birds and morning sounds
 */
const playNatureAlarm = () => {
    const config = ALARM_CONFIGS.nature;
    if (config) {
        createContinuousAlarm(config);
    }
};

/**
 * Classic Alarm - traditional alarm tone with crescendo
 */
const playClassicAlarm = () => {
    const config = ALARM_CONFIGS.classic;
    if (config) {
        createBeepingAlarm(config);
    }
    logger.log('[playClassicAlarm] Started - 60s crescendo, then 30min sustain');
};

// ============================================================
// PROCEDURAL ALARM SYSTEM ("SOMNIA WAKE ENGINE")
// Uses spectral ramping to wake users without cortisol spikes
// ============================================================

// Track procedural alarm state for cleanup
let proceduralAlarmStop: (() => void) | null = null;
let proceduralGainNode: GainNode | null = null;

/**
 * PRISM Alarm - Ethereal glass chimes with crescendo
 * Pentatonic chimes that crescendo over 60s then continue loud
 * Bulletproof: 30 minutes of chimes scheduled
 */
const playPrismAlarm = () => {
    logger.log('[playPrismAlarm] Starting Prism alarm');
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
        const note = prismNotes[i % prismNotes.length] ?? 261.63;
        const t = now + i * 2.5;
        baseOsc.frequency.setValueAtTime(note, t);
        // Chime envelope: LOUD attack, decay to moderate (not silent)
        baseGain.gain.setValueAtTime(1.0, t);
        baseGain.gain.exponentialRampToValueAtTime(0.35, t + 1.5);
    }

    baseOsc.start(now);
    logger.log('[playPrismAlarm] Started - 60s crescendo, 720 chimes over 30min');

    proceduralAlarmStop = () => {
        logger.log('[playPrismAlarm] Stopping');
        try { baseOsc.stop(); } catch { /* oscillator already stopped */ }
    };
};

/**
 * AETHER Alarm - Cinematic drone with filter sweep and crescendo
 * Sawtooth at 110Hz->220Hz, crescendos then continues loud
 * Bulletproof: Continuous drone plays indefinitely
 */
const playAetherAlarm = () => {
    logger.log('[playAetherAlarm] Starting Aether alarm');
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
    logger.log('[playAetherAlarm] Started - 60s crescendo to 0.5 volume, then sustains');

    proceduralAlarmStop = () => {
        logger.log('[playAetherAlarm] Stopping');
        try { osc.stop(); } catch { /* oscillator already stopped */ }
    };
};

/**
 * BAMBOO Alarm - Hollow wooden pulse that accelerates with crescendo
 * Accelerating pulse pattern, crescendos over 60s then continues loud
 * Bulletproof: 30 minutes of pulses scheduled
 */
const playBambooAlarm = () => {
    logger.log('[playBambooAlarm] Starting Bamboo alarm');
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
    logger.log('[playBambooAlarm] Started - 60s crescendo,', pulseCount, 'pulses over 30min');

    proceduralAlarmStop = () => {
        logger.log('[playBambooAlarm] Stopping');
        try { osc.stop(); } catch { /* oscillator already stopped */ }
    };
};

// Track psychoacoustic alarm state for cleanup
let psychoacousticAlarmStop: (() => void) | null = null;

/**
 * CYBER-DAWN Alarm - FM Synthesis procedural birds
 * Wrapper that integrates with the audio service cleanup system
 */
const playCyberDawnAlarmWrapper = () => {
    logger.log('[playCyberDawnAlarm] Starting Cyber-Dawn alarm');
    stopSleepSound();
    if (alarmOscillator) stopAlarmSound();
    cleanupProceduralAlarm();
    cleanupPsychoacousticAlarm();

    const handle = playCyberDawnAlarm(0.7);
    psychoacousticAlarmStop = handle.stop;
    logger.log('[playCyberDawnAlarm] Started - FM synthesis birds awakening');
};

/**
 * SOLAR ASCENT Alarm - Additive synthesis harmonic blooming
 * Wrapper that integrates with the audio service cleanup system
 */
const playSolarAlarmWrapper = () => {
    logger.log('[playSolarAlarm] Starting Solar Ascent alarm');
    stopSleepSound();
    if (alarmOscillator) stopAlarmSound();
    cleanupProceduralAlarm();
    cleanupPsychoacousticAlarm();

    const handle = playSolarAlarm(0.7);
    psychoacousticAlarmStop = handle.stop;
    logger.log('[playSolarAlarm] Started - Harmonic blooming sunrise');
};

/**
 * Cleanup psychoacoustic alarm resources
 */
const cleanupPsychoacousticAlarm = () => {
    if (psychoacousticAlarmStop) {
        psychoacousticAlarmStop();
        psychoacousticAlarmStop = null;
    }
};

/**
 * Cleanup procedural alarm resources
 */
const cleanupProceduralAlarm = () => {
    logger.log('[cleanupProceduralAlarm] Called, proceduralAlarmStop exists:', !!proceduralAlarmStop);

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
                } catch (_e) {
                    // Ignore errors if already disconnected
                }
            }, 200);
        } catch (e) {
            logger.warn('Error cleaning up procedural alarm:', e);
        }
    }
}

/**
 * Stops the alarm sound immediately.
 * Fades out volume over 0.5s to prevent clicking artifacts.
 */
export const stopAlarmSound = () => {
    logger.log('[stopAlarmSound] Called at', new Date().toISOString());

    // Stop regular oscillator-based alarms
    if (alarmGainNode && alarmOscillator && audioContext) {
        const now = audioContext.currentTime;
        alarmGainNode.gain.cancelScheduledValues(now);
        alarmGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        try {
            alarmOscillator.stop(now + 0.5);
        } catch (e) {
            logger.warn("Error stopping alarm oscillator, it might have already been stopped.", e);
        }
    }
    alarmOscillator = null;
    alarmGainNode = null;

    // Stop procedural alarms (Prism, Aether, Bamboo)
    cleanupProceduralAlarm();

    // Stop psychoacoustic alarms (Cyber-Dawn, Solar Ascent)
    cleanupPsychoacousticAlarm();
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

        case 'prism': {
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
                const note = prismNotes[(i + 6) % prismNotes.length] ?? 261.63;
                const t = now + i * 2.5;
                previewOscillator.frequency.setValueAtTime(note, t);
                previewGainNode.gain.setValueAtTime(1.0, t);
                previewGainNode.gain.exponentialRampToValueAtTime(0.35, t + 1.5);
            }
            break;
        }

        case 'aether':
            // Start at 25%: ~138Hz, ~0.26 volume, crescendo to 220Hz/0.9 over 45s
            previewOscillator.type = 'sawtooth';
            previewOscillator.frequency.setValueAtTime(138, now);
            previewGainNode.gain.setValueAtTime(0.26, now);
            previewOscillator.frequency.exponentialRampToValueAtTime(220, now + 45);
            previewGainNode.gain.linearRampToValueAtTime(0.9, now + 45);
            break;

        case 'cyber-dawn': {
            // Use actual Cyber-Dawn alarm for preview (authentic sound)
            // Don't use the simple oscillator - start the real alarm
            previewOscillator.disconnect();
            previewGainNode.disconnect();
            previewOscillator = null as unknown as OscillatorNode;
            previewGainNode = null as unknown as GainNode;

            // Start the actual Cyber-Dawn alarm at preview volume
            const cyberHandle = playCyberDawnAlarm(0.5);
            psychoacousticAlarmStop = cyberHandle.stop;
            currentPreviewId = soundId;
            return; // Don't call start() on null oscillator
        }

        case 'solar-ascent': {
            // Use actual Solar Ascent alarm for preview (authentic sound)
            // Don't use the simple oscillator - start the real alarm
            previewOscillator.disconnect();
            previewGainNode.disconnect();
            previewOscillator = null as unknown as OscillatorNode;
            previewGainNode = null as unknown as GainNode;

            // Start the actual Solar Ascent alarm at preview volume
            const solarHandle = playSolarAlarm(0.5);
            psychoacousticAlarmStop = solarHandle.stop;
            currentPreviewId = soundId;
            return; // Don't call start() on null oscillator
        }

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

    // Stop regular oscillator-based previews
    if (previewGainNode && previewOscillator && audioContext) {
        const now = audioContext.currentTime;
        previewGainNode.gain.cancelScheduledValues(now);
        previewGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        try {
            previewOscillator.stop(now + 0.2);
        } catch (_e) {
            // Already stopped
        }
    }

    // Stop psychoacoustic previews (Cyber-Dawn, Solar Ascent)
    cleanupPsychoacousticAlarm();

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

/**
 * Gaussian White Noise - "Soft Air"
 * Uses Box-Muller Transform for creamy Gaussian distribution
 * (Standard uniform random is too harsh/spiky)
 */
const createGaussianWhiteBuffer = (context: AudioContext): AudioBuffer => {
    // Defensive check for valid sample rate (Android compatibility)
    const sampleRate = context.sampleRate || 44100;
    const bufferSize = Math.max(sampleRate * NOISE_BUFFER_DURATION, 1024);
    // STEREO buffer for decorrelation
    const buffer = context.createBuffer(2, bufferSize, sampleRate);

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
    // Defensive check for valid sample rate (Android compatibility)
    const sampleRate = context.sampleRate || 44100;
    const bufferSize = Math.max(sampleRate * NOISE_BUFFER_DURATION, 1024);
    // STEREO buffer for decorrelation
    const buffer = context.createBuffer(2, bufferSize, sampleRate);

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
 *
 * Anti-crackling measures:
 * - Soft saturation (tanh) prevents harsh digital clipping
 * - Crossfade at buffer boundaries for seamless looping
 * - Headroom-aware gain staging
 */
const createBrownBuffer = (context: AudioContext): AudioBuffer => {
    // Defensive check for valid sample rate (Android compatibility)
    const sampleRate = context.sampleRate || 44100;
    const bufferSize = Math.max(sampleRate * NOISE_BUFFER_DURATION, 1024);
    // STEREO buffer for decorrelation
    const buffer = context.createBuffer(2, bufferSize, sampleRate);

    // Crossfade length for seamless looping (50ms)
    const crossfadeLength = Math.floor(sampleRate * 0.05);

    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Leaky Integrator: 0.02 is slew rate, 1.02 is the leak
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            // Soft saturation using tanh to prevent harsh clipping while preserving warmth
            // Gain of 3.0 (slightly reduced) fed through tanh for gentle saturation
            data[i] = Math.tanh(lastOut * 3.0);
        }

        // Crossfade the end into the beginning for seamless looping
        // This prevents clicks/pops at the loop boundary
        if (crossfadeLength > 0 && bufferSize > crossfadeLength * 2) {
            for (let i = 0; i < crossfadeLength; i++) {
                const fadeOut = 1 - (i / crossfadeLength); // 1 -> 0
                const fadeIn = i / crossfadeLength;        // 0 -> 1
                const endIdx = bufferSize - crossfadeLength + i;
                // Blend the end samples with the beginning samples
                data[endIdx] = data[endIdx] * fadeOut + data[i] * fadeIn;
            }
        }
    }
    return buffer;
};

/**
 * Creates a raw noise buffer (for backwards compatibility with mono synthesis chains)
 */
const createRawNoiseBuffer = (context: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBuffer => {
    // Defensive check for valid sample rate (Android compatibility)
    const sampleRate = context.sampleRate || 44100;
    const bufferSize = Math.max(sampleRate * 2, 1024); // Minimum 1024 samples
    const buffer = context.createBuffer(1, bufferSize, sampleRate);
    const output = buffer.getChannelData(0);

    // Crossfade length for seamless looping (50ms)
    const crossfadeLength = Math.floor(sampleRate * 0.05);

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
        // Leaky integrator brown noise with soft saturation to prevent crackling
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            // Soft saturation using tanh to prevent harsh clipping
            output[i] = Math.tanh(lastOut * 3.0);
        }
    }

    // Apply crossfade to ALL noise types for seamless looping (Android compatibility)
    if (crossfadeLength > 0 && bufferSize > crossfadeLength * 2) {
        for (let i = 0; i < crossfadeLength; i++) {
            const fadeOut = 1 - (i / crossfadeLength);
            const fadeIn = i / crossfadeLength;
            const endIdx = bufferSize - crossfadeLength + i;
            output[endIdx] = output[endIdx] * fadeOut + output[i] * fadeIn;
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

    // Binaural beats volume - audible but not overwhelming
    // (0.35 provides clear presence while master gain controls overall level)
    const gainLeft = context.createGain();
    const gainRight = context.createGain();
    gainLeft.gain.value = 0.35;
    gainRight.gain.value = 0.35;

    oscLeft.connect(gainLeft);
    oscRight.connect(gainRight);
    gainLeft.connect(merger, 0, 0);
    gainRight.connect(merger, 0, 1);

    oscLeft.start();
    oscRight.start();

    // Attach oscillators and gains to the merger node for cleanup and live updates
    const binauralMerger = merger as BinauralMergerNode;
    binauralMerger.oscillators = [oscLeft, oscRight];
    binauralMerger.gains = [gainLeft, gainRight];

    return binauralMerger;
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

    // Audible binaural gain (matches regular binaural beats)
    const gainLeft = context.createGain();
    const gainRight = context.createGain();
    gainLeft.gain.setValueAtTime(0.35, now);
    gainRight.gain.setValueAtTime(0.35, now);

    oscLeft.connect(gainLeft);
    oscRight.connect(gainRight);
    gainLeft.connect(merger, 0, 0);
    gainRight.connect(merger, 0, 1);

    oscLeft.start(now);
    oscRight.start(now);

    // Attach oscillators for cleanup
    const binauralMerger = merger as BinauralMergerNode;
    binauralMerger.oscillators = [oscLeft, oscRight];
    binauralMerger.gains = [gainLeft, gainRight];
    binauralMerger.rampDurationSeconds = rampSeconds;

    return binauralMerger;
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

    // Track current sound for resuming after phone call interruption
    currentSleepSound = { sound, durationMinutes, volume };

    // Store for restart functionality (persists even after sound stops)
    lastPlayedSound = { sound, volume };
    soundEndedNaturally = false; // Reset - sound is now playing

    // Configure iOS audio session for background playback BEFORE starting audio
    // This ensures sleep sounds continue playing when screen locks
    await configureAudioSession({ mixWithOthers: true, duckOthers: true });

    // Set up interruption handling (phone calls, Siri, etc.)
    if (interruptionCleanup) {
        interruptionCleanup();
    }
    interruptionCleanup = await setupInterruptionHandling(
        // On interruption began (phone call started)
        () => {
            logger.log('[AudioService] Audio interrupted (phone call)');
            wasPlayingBeforeInterruption = sleepSourceNode !== null;
            // Audio will be paused by iOS automatically
        },
        // On interruption ended (phone call ended)
        async (shouldResume: boolean) => {
            logger.log('[AudioService] Interruption ended, shouldResume:', shouldResume);
            if (shouldResume && wasPlayingBeforeInterruption && currentSleepSound) {
                // Resume the sleep sound after phone call
                logger.log('[AudioService] Resuming sleep sound after interruption');
                await playSleepSound(
                    currentSleepSound.sound,
                    currentSleepSound.durationMinutes,
                    currentSleepSound.volume
                );
            }
            wasPlayingBeforeInterruption = false;
        }
    );

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
            logger.error("Failed to load or play audio file, fallback to synthesis:", e);
            if (sleepGainNode) {
                sleepGainNode.disconnect();
                sleepGainNode = null;
            }
            return;
        }
    } else if (sound.type === 'synthetic') {
        // Advanced DSP synthesis for nature sounds (Somnia Audio Engine)
        const type = sound.params.type;

        if (type === 'ocean') {
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
            (noise as SynthesisSourceNode).lfo = lfoA;
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
                if (isCleaningUp || !sleepGainNode || !audioContext) return;

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
    } else if (sound.type === 'psychoacoustic') {
        // Psychoacoustic Environments - Advanced DSP Synthesis from psychoacousticService
        const psychoType = sound.params.type;

        // Stop any regular audio setup - psychoacoustic uses its own audio context management
        if (sleepGainNode) {
            sleepGainNode.disconnect();
            sleepGainNode = null;
        }
        if (sleepCompressor) {
            sleepCompressor.disconnect();
            sleepCompressor = null;
        }

        if (psychoType === 'abyssal_pressure') {
            // Deep Sleep: Brown noise + 40Hz gamma pulse
            const handle = playAbyssalPressure(volume);
            // Store cleanup function for later
            (window as unknown as { _psychoacousticStop?: () => void })._psychoacousticStop = handle.stop;
            logger.log('[playSleepSound] Started Abyssal Pressure psychoacoustic environment');
        } else if (psychoType === 'silicon_forest') {
            // Anxiety Clearing: Comb-filtered metallic wind
            const handle = playSiliconForest(volume);
            (window as unknown as { _psychoacousticStop?: () => void })._psychoacousticStop = handle.stop;
            logger.log('[playSleepSound] Started Silicon Forest psychoacoustic environment');
        }
    }

    if (durationMinutes > 0) {
        // Use a gentle 30-second fade out when the timer expires naturally
        sleepTimeout = window.setTimeout(() => {
            soundEndedNaturally = true; // Mark as natural end (timer expired)
            stopSleepSound(30);
        }, durationMinutes * 60 * 1000);
    }
};

/**
 * Stops the currently playing sleep sound.
 * Fades out volume over specified duration (default 2s).
 * Cleans up audio nodes and oscillators.
 */
export const stopSleepSound = (fadeDuration: number = 2) => {
    // Set cleanup mutex to prevent race conditions with spark generation
    isCleaningUp = true;

    // Clear all intervals first
    if (sleepTimeout) {
        clearTimeout(sleepTimeout);
        sleepTimeout = null;
    }
    if (sparkInterval) {
        clearTimeout(sparkInterval);
        sparkInterval = null;
    }

    // Stop psychoacoustic sounds
    stopPsychoacoustic();
    const psychoStop = (window as unknown as { _psychoacousticStop?: () => void })._psychoacousticStop;
    if (psychoStop) {
        psychoStop();
        (window as unknown as { _psychoacousticStop?: () => void })._psychoacousticStop = undefined;
    }

    const context = audioContext;
    if (sleepGainNode && context) {
        // Capture references locally to avoid race condition with newly started sounds
        const gainNodeToCleanup = sleepGainNode;
        const compressorToCleanup = sleepCompressor;
        const eqFiltersToCleanup = [...somniaEqFilters];

        const now = context.currentTime;
        gainNodeToCleanup.gain.cancelScheduledValues(now);
        // Ramp down to near-zero first to avoid popping, then disconnect
        gainNodeToCleanup.gain.linearRampToValueAtTime(0, now + fadeDuration);

        // Disconnect after fade-out is complete
        setTimeout(() => {
            // Disconnect the captured nodes (not globals, which may have been reassigned)
            try { gainNodeToCleanup.disconnect(); } catch (_e) { /* ignore */ }
            if (compressorToCleanup) {
                try { compressorToCleanup.disconnect(); } catch (_e) { /* ignore */ }
            }
            // Cleanup Somnia-Grey EQ filters
            eqFiltersToCleanup.forEach(filter => {
                try { filter.disconnect(); } catch (_e) { /* ignore */ }
            });

            // Only clear globals if they still reference the same nodes we cleaned up
            // This prevents clearing state for a newly started sound
            if (sleepGainNode === gainNodeToCleanup) {
                sleepGainNode = null;
            }
            if (sleepCompressor === compressorToCleanup) {
                sleepCompressor = null;
            }
            if (somniaEqFilters.length > 0 && somniaEqFilters[0] === eqFiltersToCleanup[0]) {
                somniaEqFilters = [];
            }
        }, (fadeDuration * 1000) + 100);
    }

    // Cleanup additional LFOs
    if (additionalLFOs.length > 0 && context) {
        // Capture LFOs locally to avoid race condition with newly started sounds
        const lfosToCleanup = [...additionalLFOs];
        const stopTime = context.currentTime + fadeDuration;
        lfosToCleanup.forEach(lfo => {
            try { lfo.stop(stopTime); } catch (_e) { /* ignore */ }
        });
        setTimeout(() => {
            lfosToCleanup.forEach(lfo => {
                try { lfo.disconnect(); } catch (_e) { /* ignore */ }
            });
            // Only clear global if it still references the same LFOs
            if (additionalLFOs.length > 0 && additionalLFOs[0] === lfosToCleanup[0]) {
                additionalLFOs = [];
            }
        }, (fadeDuration * 1000) + 100);
    }

    if (sleepSourceNode && context) {
        const stopTime = context.currentTime + fadeDuration;
        const currentNode = sleepSourceNode; // Capture for closure

        // Stop buffer/oscillator source nodes
        if (currentNode instanceof AudioBufferSourceNode || currentNode instanceof OscillatorNode) {
            try { currentNode.stop(stopTime); } catch { /* ignore */ }
        }

        // Stop binaural beat oscillators
        const binauralNode = currentNode as Partial<BinauralMergerNode>;
        if (binauralNode.oscillators) {
            binauralNode.oscillators.forEach((osc: OscillatorNode) => {
                try { osc.stop(stopTime); } catch { /* ignore */ }
            });
        }

        // Stop synthesis extras (LFO, Crackle)
        const synthNode = currentNode as Partial<SynthesisSourceNode>;
        if (synthNode.lfo) {
            try { synthNode.lfo.stop(stopTime); } catch { /* ignore */ }
        }
        if (synthNode.crackle) {
            try { synthNode.crackle.stop(stopTime); } catch { /* ignore */ }
        }

        // Disconnect after fade completes
        setTimeout(() => {
            if (currentNode) {
                currentNode.disconnect();

                // Disconnect binaural oscillators
                if (binauralNode.oscillators) {
                    binauralNode.oscillators.forEach(osc => {
                        try { osc.disconnect(); } catch { /* ignore */ }
                    });
                }

                // Disconnect synthesis extras
                if (synthNode.lfo) synthNode.lfo.disconnect();
                if (synthNode.crackle) synthNode.crackle.disconnect();
            }
        }, (fadeDuration * 1000) + 100);

        sleepSourceNode = null;
    }

    // Reset cleanup mutex after all operations complete
    setTimeout(() => {
        isCleaningUp = false;

        // Only clear state if no new sound has started in the meantime
        // This prevents delayed cleanup from killing newly started sounds
        if (!isSleepSoundPlaying()) {
            // Clear interruption handling
            if (interruptionCleanup) {
                interruptionCleanup();
                interruptionCleanup = null;
            }
            currentSleepSound = null;
            wasPlayingBeforeInterruption = false;
            // Only clear persistence if user explicitly stopped (not natural timer end)
            // This allows the "ended" indicator to show restart options
            if (!soundEndedNaturally) {
                persistAcrossNavigation = false;
            }
            // Deactivate iOS audio session after audio stops (be a good citizen)
            setAudioSessionActive(false);
        }
    }, (fadeDuration * 1000) + 200);
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
    // Also update psychoacoustic volume if active
    setPsychoacousticVolume(volume);
};

/**
 * Updates the binaural beat frequency in real-time.
 * Only works if a binaural beat is currently playing.
 *
 * @param baseFreq - Base frequency in Hz
 * @param diff - Beat frequency difference in Hz
 */
export const setLiveBeatFrequency = (baseFreq: number, diff: number) => {
    const binauralNode = sleepSourceNode as Partial<BinauralMergerNode> | null;
    if (binauralNode && audioContext && binauralNode.oscillators) {
        const oscillators = binauralNode.oscillators;
        if (oscillators?.length === 2) {
            const now = audioContext.currentTime;
            // Smooth transition to new frequencies
            oscillators[0]?.frequency.setTargetAtTime(baseFreq - diff / 2, now, 0.1);
            oscillators[1]?.frequency.setTargetAtTime(baseFreq + diff / 2, now, 0.1);
        }
    }
};

/**
 * Check if a sleep sound is currently playing
 */
export const isSleepSoundPlaying = (): boolean => {
    // Check for regular audio source nodes
    if (sleepSourceNode !== null && sleepGainNode !== null) {
        return true;
    }
    // Check for psychoacoustic sounds (Theta Waves, Abyssal Pressure, Silicon Forest)
    // These use window._psychoacousticStop instead of sleepSourceNode
    const psychoStop = (window as unknown as { _psychoacousticStop?: () => void })._psychoacousticStop;
    if (psychoStop !== undefined) {
        return true;
    }
    return false;
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
export const playAlertnessBoost = (volume: number = 0.25) => {
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
    gainNode.gain.linearRampToValueAtTime(volume, now + 2); // Gentle fade in

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
        } catch (_e) {
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

/**
 * Adjust alertness boost volume in real-time
 */
export const setAlertnessVolume = (volume: number) => {
    if (alertnessNodes && audioContext) {
        alertnessNodes.gainNode.gain.setTargetAtTime(volume, audioContext.currentTime, 0.1);
    }
};

// --- NAVIGATION PERSISTENCE FUNCTIONS ---

/**
 * Mark sleep sound to persist across page navigation.
 * Used by "Fall Asleep Now" flow to keep sound playing when user navigates away.
 * Sound will still stop when its timer expires.
 */
export const setSleepSoundPersist = (persist: boolean) => {
    persistAcrossNavigation = persist;
    logger.log('[AudioService] Sleep sound persistence:', persist);
};

/**
 * Check if sleep sound should persist across navigation
 */
export const shouldPersistSleepSound = (): boolean => {
    return persistAcrossNavigation;
};

/**
 * Stops sleep sound only if it's not marked for persistence.
 * Use this in page cleanup handlers to allow sound to continue
 * playing when user navigates away after clicking "Fall Asleep Now".
 *
 * @returns true if sound was stopped, false if sound was preserved
 */
export const stopSleepSoundIfNotPersisting = (fadeDuration: number = 2): boolean => {
    if (persistAcrossNavigation) {
        logger.log('[AudioService] Sleep sound preserved (user falling asleep)');
        return false;
    }
    stopSleepSound(fadeDuration);
    return true;
};

/**
 * Get information about the currently playing sleep sound (for Now Playing indicators)
 */
export const getCurrentSleepSoundName = (): string | null => {
    if (!currentSleepSound || !isSleepSoundPlaying()) {
        return null;
    }
    return currentSleepSound.sound.name;
};

/**
 * Get the current volume of the playing sleep sound
 */
export const getCurrentSleepSoundVolume = (): number => {
    return currentSleepSound?.volume ?? 0.5;
};

/**
 * Get the full soundscape object currently playing
 */
export const getCurrentSleepSoundscape = (): { sound: Soundscape; volume: number } | null => {
    if (!currentSleepSound || !isSleepSoundPlaying()) {
        return null;
    }
    return {
        sound: currentSleepSound.sound,
        volume: currentSleepSound.volume
    };
};

/**
 * Check if sound ended naturally (timer expired) vs user stopped it
 */
export const didSoundEndNaturally = (): boolean => {
    return soundEndedNaturally && !isSleepSoundPlaying();
};

/**
 * Get the last played sound (for restart functionality)
 * Available even after sound stops
 */
export const getLastPlayedSound = (): { sound: Soundscape; volume: number } | null => {
    return lastPlayedSound;
};

/**
 * Check if there's a recent sound session that can be restarted
 * Returns true if sound ended naturally and user hasn't started a new session
 */
export const canRestartSound = (): boolean => {
    return lastPlayedSound !== null && !isSleepSoundPlaying();
};

/**
 * Restart the last played sound with a new duration
 */
export const restartLastSound = async (durationMinutes: number): Promise<boolean> => {
    if (!lastPlayedSound) {
        logger.warn('[AudioService] No sound to restart');
        return false;
    }

    logger.log('[AudioService] Restarting sound:', lastPlayedSound.sound.name, 'for', durationMinutes, 'minutes');
    await playSleepSound(lastPlayedSound.sound, durationMinutes, lastPlayedSound.volume);
    return true;
};

/**
 * Extend the currently playing sound by adding more time
 * If sound has stopped, restarts it with the specified duration
 */
export const extendSleepSound = async (additionalMinutes: number): Promise<boolean> => {
    if (isSleepSoundPlaying() && currentSleepSound) {
        // Sound is still playing - clear old timeout and set new one
        if (sleepTimeout) {
            clearTimeout(sleepTimeout);
            sleepTimeout = null;
        }

        // Set new timeout with additional time
        sleepTimeout = window.setTimeout(() => {
            soundEndedNaturally = true;
            stopSleepSound(30);
        }, additionalMinutes * 60 * 1000);

        logger.log('[AudioService] Extended sound by', additionalMinutes, 'minutes');
        return true;
    } else if (lastPlayedSound) {
        // Sound stopped - restart it with the specified duration
        return restartLastSound(additionalMinutes);
    }

    return false;
};

/**
 * Clear the "ended naturally" state (call when user explicitly dismisses)
 */
export const clearSoundEndedState = () => {
    soundEndedNaturally = false;
    // Don't clear lastPlayedSound - user might still want to restart
};