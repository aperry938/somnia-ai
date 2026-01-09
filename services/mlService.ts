/**
 * Machine Learning Service for Somnia.ai
 *
 * Provides on-device ML capabilities:
 * 1. Audio Classification - Detects sleep talk, snoring, and ambient sounds using TensorFlow.js
 * 2. Circadian Model (Borbély Two-Process) - Predicts optimal sleep/wake times
 *
 * All ML runs client-side for privacy - no audio data leaves the device.
 */

import * as tf from '@tensorflow/tfjs';

// ============================================================================
// Types
// ============================================================================

export interface AudioClassification {
    label: string;
    confidence: number;
}

export interface SleepAudioEvent {
    timestamp: number;
    type: 'speech' | 'snoring' | 'movement' | 'silence' | 'ambient';
    confidence: number;
    duration: number; // milliseconds
}

export interface CircadianPrediction {
    optimalSleepTime: string; // HH:MM format
    optimalWakeTime: string;  // HH:MM format
    currentSleepPressure: number; // 0-100
    currentAlertness: number; // 0-100
    sleepDebt: number; // hours
    recommendation: string;
}

export interface BorbélyParams {
    lastSleepEnd: Date;    // When user last woke up
    lastSleepDuration: number; // Hours of last sleep
    chronotype: 'early' | 'normal' | 'late'; // User's natural sleep preference
    targetSleepHours: number; // Desired sleep duration
}

// ============================================================================
// Audio Classification Service
// ============================================================================

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let mediaStream: MediaStream | null = null;
let isRecording = false;
let classificationInterval: number | null = null;

// Simple audio feature extraction (MFCC-like)
const extractAudioFeatures = (analyser: AnalyserNode): Float32Array => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatFrequencyData(dataArray);

    // Normalize to 0-1 range
    const minDb = -100;
    const maxDb = -10;
    const normalized = dataArray.map(val =>
        Math.max(0, Math.min(1, (val - minDb) / (maxDb - minDb)))
    );

    return new Float32Array(normalized);
};

// Simple heuristic-based audio classification
// In production, this would use a proper TensorFlow.js model
const classifyAudioFeatures = (features: Float32Array): AudioClassification[] => {
    // Calculate energy in different frequency bands
    const lowBand = features.slice(0, 50).reduce((a, b) => a + b, 0) / 50;
    const midBand = features.slice(50, 150).reduce((a, b) => a + b, 0) / 100;
    const highBand = features.slice(150, 256).reduce((a, b) => a + b, 0) / 106;
    const totalEnergy = (lowBand + midBand + highBand) / 3;

    const results: AudioClassification[] = [];

    // Silence detection
    if (totalEnergy < 0.05) {
        results.push({ label: 'silence', confidence: 0.9 - totalEnergy * 10 });
    }

    // Speech detection (higher mid-frequencies, variable energy)
    if (midBand > 0.15 && highBand > 0.1 && totalEnergy > 0.1) {
        const speechConfidence = Math.min(0.85, (midBand + highBand) / 2);
        results.push({ label: 'speech', confidence: speechConfidence });
    }

    // Snoring detection (low frequency dominant, rhythmic)
    if (lowBand > 0.2 && lowBand > midBand * 1.5 && lowBand > highBand * 2) {
        const snoreConfidence = Math.min(0.8, lowBand * 2);
        results.push({ label: 'snoring', confidence: snoreConfidence });
    }

    // Movement/rustling (high frequency bursts)
    if (highBand > 0.15 && highBand > midBand) {
        results.push({ label: 'movement', confidence: Math.min(0.7, highBand * 2) });
    }

    // Ambient noise (even distribution)
    const variance = Math.abs(lowBand - midBand) + Math.abs(midBand - highBand);
    if (variance < 0.1 && totalEnergy > 0.05 && totalEnergy < 0.3) {
        results.push({ label: 'ambient', confidence: 0.6 });
    }

    // Sort by confidence
    return results.sort((a, b) => b.confidence - a.confidence);
};

/**
 * Initialize TensorFlow.js backend
 */
export const initML = async (): Promise<void> => {
    await tf.ready();
    // Prefer WebGL for performance, fall back to WASM or CPU
    try {
        await tf.setBackend('webgl');
    } catch {
        try {
            await tf.setBackend('wasm');
        } catch {
            await tf.setBackend('cpu');
        }
    }
    console.log(`[ML] TensorFlow.js initialized with backend: ${tf.getBackend()}`);
};

/**
 * Start recording and classifying audio
 * @param onClassification Callback for each classification result
 * @param intervalMs How often to classify (default 1000ms)
 */
export const startAudioClassification = async (
    onClassification: (events: AudioClassification[]) => void,
    intervalMs: number = 1000
): Promise<void> => {
    if (isRecording) {
        console.warn('[ML] Audio classification already running');
        return;
    }

    try {
        // Request microphone access
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        audioContext = new AudioContext({ sampleRate: 16000 });
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;

        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        isRecording = true;

        // Start classification loop
        classificationInterval = window.setInterval(() => {
            if (analyser && isRecording) {
                const features = extractAudioFeatures(analyser);
                const classifications = classifyAudioFeatures(features);
                onClassification(classifications);
            }
        }, intervalMs);

        console.log('[ML] Audio classification started');
    } catch (error) {
        console.error('[ML] Failed to start audio classification:', error);
        throw error;
    }
};

/**
 * Stop audio classification and release resources
 */
export const stopAudioClassification = (): void => {
    isRecording = false;

    if (classificationInterval) {
        clearInterval(classificationInterval);
        classificationInterval = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    analyser = null;
    console.log('[ML] Audio classification stopped');
};

/**
 * Check if audio classification is currently running
 */
export const isAudioClassificationRunning = (): boolean => isRecording;

// ============================================================================
// Borbély Two-Process Circadian Model
// ============================================================================

/**
 * Calculate Process S (Sleep Homeostasis / Sleep Pressure)
 * Builds up exponentially during wakefulness, decays during sleep
 *
 * Formula: S(t) = S_max - (S_max - S_0) * e^(-t/τ_w)
 * Where:
 *   - S_max: Maximum sleep pressure (asymptote)
 *   - S_0: Sleep pressure at wake time
 *   - τ_w: Time constant for wake (~18.2 hours)
 */
const calculateProcessS = (hoursAwake: number, lastSleepDuration: number): number => {
    const S_max = 100;
    // S_0 depends on sleep duration (more sleep = lower starting pressure)
    const S_0 = Math.max(0, 30 - lastSleepDuration * 3);
    const tau_w = 18.2; // hours

    // Exponential buildup during wakefulness
    const S = S_max - (S_max - S_0) * Math.exp(-hoursAwake / tau_w);

    return Math.min(100, Math.max(0, S));
};

/**
 * Calculate Process C (Circadian Rhythm)
 * 24-hour sinusoidal oscillation peaking in late evening
 *
 * Formula: C(t) = A * sin(2π(t - φ)/24)
 * Where:
 *   - A: Amplitude of circadian oscillation
 *   - φ: Phase (timing of minimum alertness)
 */
const calculateProcessC = (currentHour: number, chronotype: 'early' | 'normal' | 'late'): number => {
    const A = 40; // Amplitude

    // Phase shift based on chronotype (when minimum alertness occurs)
    const phaseShift = {
        'early': 4,   // Min alertness at 4 AM
        'normal': 5,  // Min alertness at 5 AM
        'late': 6     // Min alertness at 6 AM
    }[chronotype];

    // Circadian alertness (inverted so high = alerting, low = sleep-promoting)
    const C = A * Math.sin(2 * Math.PI * (currentHour - phaseShift) / 24);

    // Normalize to 0-100 with 50 as baseline
    return 50 + C;
};

/**
 * Calculate optimal sleep window based on Borbély model
 * Sleep occurs when Process S crosses above Process C
 */
export const calculateCircadianPrediction = (params: BorbélyParams): CircadianPrediction => {
    const { lastSleepEnd, lastSleepDuration, chronotype, targetSleepHours } = params;

    const now = new Date();
    const hoursAwake = (now.getTime() - lastSleepEnd.getTime()) / (1000 * 60 * 60);
    const currentHour = now.getHours() + now.getMinutes() / 60;

    // Calculate current state
    const currentS = calculateProcessS(hoursAwake, lastSleepDuration);
    const currentC = calculateProcessC(currentHour, chronotype);

    // Alertness is the difference between circadian drive and sleep pressure
    const alertness = Math.max(0, Math.min(100, currentC - currentS / 2 + 50));

    // Find optimal sleep time (when S significantly exceeds C)
    let optimalSleepHour = currentHour;
    for (let h = 0; h < 24; h++) {
        const testHour = (currentHour + h) % 24;
        const testHoursAwake = hoursAwake + h;
        const testS = calculateProcessS(testHoursAwake, lastSleepDuration);
        const testC = calculateProcessC(testHour, chronotype);

        // Sleep is optimal when pressure exceeds circadian alerting
        if (testS > testC + 20 && testHour >= 20 || testHour <= 6) {
            optimalSleepHour = testHour;
            break;
        }
    }

    // Calculate optimal wake time
    const optimalWakeHour = (optimalSleepHour + targetSleepHours) % 24;

    // Calculate sleep debt
    const idealSleepDebt = Math.max(0, targetSleepHours - lastSleepDuration);
    const cumulativeDebt = Math.max(0, hoursAwake - 16); // Awake beyond 16 hours adds debt
    const sleepDebt = idealSleepDebt + cumulativeDebt * 0.5;

    // Format times
    const formatTime = (hour: number): string => {
        const h = Math.floor(hour);
        const m = Math.round((hour - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // Generate recommendation
    let recommendation: string;
    if (currentS > 80) {
        recommendation = "High sleep pressure detected. Consider going to bed soon for optimal recovery.";
    } else if (alertness < 30) {
        recommendation = "You're in a natural energy dip. A 20-minute nap could help, or push through for better nighttime sleep.";
    } else if (hoursAwake > 18) {
        recommendation = "You've been awake for an extended period. Sleep quality may be impacted if you stay up much longer.";
    } else if (sleepDebt > 2) {
        recommendation = `You have a sleep debt of ~${sleepDebt.toFixed(1)} hours. Aim for earlier bedtime tonight.`;
    } else {
        recommendation = "Your circadian rhythm is on track. Maintain consistent sleep and wake times.";
    }

    return {
        optimalSleepTime: formatTime(optimalSleepHour),
        optimalWakeTime: formatTime(optimalWakeHour),
        currentSleepPressure: Math.round(currentS),
        currentAlertness: Math.round(alertness),
        sleepDebt: Math.round(sleepDebt * 10) / 10,
        recommendation
    };
};

/**
 * Quick alertness check based on time of day and wake time
 */
export const getQuickAlertness = (wakeTime: Date): number => {
    const now = new Date();
    const hoursAwake = (now.getTime() - wakeTime.getTime()) / (1000 * 60 * 60);
    const currentHour = now.getHours() + now.getMinutes() / 60;

    // Simplified alertness calculation
    const S = calculateProcessS(hoursAwake, 7); // Assume 7 hours sleep
    const C = calculateProcessC(currentHour, 'normal');

    return Math.max(0, Math.min(100, C - S / 2 + 50));
};

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Cleanup all ML resources
 */
export const cleanupML = (): void => {
    stopAudioClassification();
    // TensorFlow.js doesn't require explicit cleanup for most operations
    console.log('[ML] Cleanup complete');
};
