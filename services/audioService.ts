import { Soundscape } from '../types';

let audioContext: AudioContext | null = null;

// Alarm Sound Nodes
let alarmOscillator: OscillatorNode | null = null;
let alarmGainNode: GainNode | null = null;

// Sleep Sound Nodes
let sleepSourceNode: AudioNode | null = null;
let sleepGainNode: GainNode | null = null;
let sleepTimeout: number | null = null;

// Cache for decoded audio files to prevent re-fetching
const audioBufferCache: { [src: string]: AudioBuffer } = {};

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


// --- SLEEP SOUND FUNCTIONS ---

const createNoiseNode = (context: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBufferSourceNode => {
    const bufferSize = context.sampleRate * 2;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = buffer.getChannelData(0);

    if (type === 'white') {
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    } else if (type === 'pink') {
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
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            output[i] = lastOut * 3.5;
        }
    }

    const noiseNode = context.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;
    return noiseNode;
}

const createBinauralNode = (context: AudioContext, baseFreq: number, diff: number): ChannelMergerNode => {
    const oscLeft = context.createOscillator();
    const oscRight = context.createOscillator();
    const merger = context.createChannelMerger(2);

    oscLeft.frequency.value = baseFreq - diff / 2;
    oscRight.frequency.value = baseFreq + diff / 2;

    oscLeft.connect(merger, 0, 0);
    oscRight.connect(merger, 0, 1);
    
    oscLeft.start();
    oscRight.start();

    // Attach oscillators to the merger node to stop them later
    (merger as any).oscillators = [oscLeft, oscRight];

    return merger;
}

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

export const playSleepSound = async (sound: Soundscape, durationMinutes: number) => {
    stopAlarmSound(); // Ensure alarm is stopped
    const context = getAudioContext();
    
    if (context.state === 'suspended') {
        await context.resume();
    }
    
    stopSleepSound(); // Stop any currently playing sleep sound

    sleepGainNode = context.createGain();
    sleepGainNode.gain.setValueAtTime(0, context.currentTime);
    sleepGainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 2); // Fade in
    sleepGainNode.connect(context.destination);
    
    if (sound.type === 'noise') {
        sleepSourceNode = createNoiseNode(context, sound.params.type);
        sleepSourceNode.connect(sleepGainNode);
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
            console.error("Failed to load or play audio file:", e);
            if (sleepGainNode) {
                sleepGainNode.disconnect();
                sleepGainNode = null;
            }
            return;
        }
    }
    
    if (durationMinutes > 0) {
        sleepTimeout = window.setTimeout(stopSleepSound, durationMinutes * 60 * 1000);
    }
};

export const stopSleepSound = () => {
    if (sleepTimeout) {
        clearTimeout(sleepTimeout);
        sleepTimeout = null;
    }
    const context = audioContext;
    if (sleepGainNode && context) {
        sleepGainNode.gain.cancelScheduledValues(context.currentTime);
        sleepGainNode.gain.linearRampToValueAtTime(0, context.currentTime + 2); // Fade out
        // Disconnect after fade-out is complete
        setTimeout(() => {
            if (sleepGainNode) {
                sleepGainNode.disconnect();
                sleepGainNode = null;
            }
        }, 2100);
    }
    if (sleepSourceNode && context) {
        const stopTime = context.currentTime + 2;
        if (sleepSourceNode instanceof AudioBufferSourceNode) {
            try { sleepSourceNode.stop(stopTime); } catch (e) { /* ignore */ }
        }
        // For binaural beats, stop the attached oscillators
        if ((sleepSourceNode as any).oscillators) {
            (sleepSourceNode as any).oscillators.forEach((osc: OscillatorNode) => {
                 try { osc.stop(stopTime); } catch (e) { /* ignore */ }
            });
        }
        setTimeout(() => {
            if (sleepSourceNode) {
                sleepSourceNode.disconnect();
                sleepSourceNode = null;
            }
        }, 2100);
    }
};


// --- BREATHING CUE FUNCTIONS ---

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