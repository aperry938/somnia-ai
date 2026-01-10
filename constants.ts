import React from 'react';
import { Soundscape, GuidedRelaxation } from './types';

// Standard props for consistent icon styling
const iconProps = {
    xmlns: "http://www.w3.org/2000/svg",
    className: "h-8 w-8",
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: "1.5"
};

export const SOUNDSCAPES: Soundscape[] = [
    // NOISE-BASED SOUNDSCAPES - Enhanced with Somnia-Grey psychoacoustic EQ
    // EQ curve: +3dB@60Hz (warmth), -3dB@400Hz (removes mud), -6dB@3500Hz (silky smooth)
    { id: 'white_noise', name: 'White Noise', type: 'noise', params: { type: 'white' }, isPremium: false, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" })), description: "Full-spectrum masking with Somnia-Grey EQ shaping. Warm bass, zero harshness. Ideal for blocking noise and maintaining deep rest." },
    { id: 'pink_noise', name: 'Pink Noise', type: 'noise', params: { type: 'pink' }, isPremium: false, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 8h16M4 16h16" }), React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M8 4l4 4 4-4" }), React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M8 12l4 4 4-4" })), description: "Silky smooth pink noise with engineered warmth. Research-backed for stabilizing sleep cycles and enhancing memory consolidation." },
    { id: 'brown_noise', name: 'Brown Noise', type: 'noise', params: { type: 'brown' }, isPremium: false, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 7v10h18V7M5 7L12 13L19 7" })), description: "Deep, enveloping rumble like a distant waterfall. Somnia-Grey tuned to feel like a warm blanket of sound for ultimate calm." },
    // NATURE SOUNDSCAPES - Somnia Audio Engine DSP Synthesis (PRO)
    { id: 'ocean_waves', name: 'Nebula Ocean', type: 'synthetic', params: { type: 'ocean' }, isPremium: true, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 8h16M4 16h16" })), description: "Desynchronized dual-LFO waves that never loop. A futuristic breathing drone that prevents the brain from recognizing patterns." },
    { id: 'fireplace', name: 'Plasma Fire', type: 'synthetic', params: { type: 'fireplace' }, isPremium: true, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.657 7.343A8 8 0 0117.657 18.657z" })), description: "Filter-pinged warm magnetic pops over deep brown rumble. Each spark 'rings' through a resonant filter like a soft bell." },
    // BINAURAL BEATS - Scientifically optimized with 110 Hz carrier (Low A2)
    // 110 Hz resonates in the chest/body (somatic entrainment), below the ear's hypersensitive range
    // Ordered by sleep progression: Ramp (Alpha→Delta journey) → Theta (dreaming) → Delta (deep sleep)
    { id: 'sleep_ramp', name: 'Sleep Ramp', type: 'ramp', params: { base: 110 }, isPremium: true, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" })), description: "Intelligent Alpha→Theta→Delta descent. Dynamically adjusts to your sleep duration, guiding you from relaxation (12Hz) through hypnagogia (8→4Hz) to deep restorative delta (1.5Hz)." },
    { id: 'theta_waves', name: 'Theta Waves', type: 'binaural', params: { base: 110, diff: 6.0 }, isPremium: true, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M17 14v6m-5-12v12m-5-6v6" })), description: "6Hz 'Twilight' frequency - the bridge between subconscious dreaming and conscious visualization. Optimal for lucid dreaming, creativity, and REM enhancement." },
    { id: 'delta_waves', name: 'Delta Waves', type: 'binaural', params: { base: 110, diff: 2.5 }, isPremium: true, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" })), description: "2.5Hz deep delta for maximum restorative sleep. Promotes tissue regeneration, immune function, and memory consolidation through slow-wave entrainment." },
    // PSYCHOACOUSTIC ENVIRONMENTS - Advanced DSP Synthesis (PRO)
    // Leveraging specific physiological triggers: Deep Pressure Therapy, Comb Filtering, HRV Resonance
    { id: 'abyssal_pressure', name: 'Abyssal Pressure', type: 'psychoacoustic', params: { type: 'abyssal_pressure' }, isPremium: true, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" })), description: "Deep Pressure Therapy in audio form. Heavy brown noise + 40Hz gamma pulse creates the sensation of sleeping in a hyperbaric chamber. Grounds the nervous system for profound delta sleep." },
    { id: 'silicon_forest', name: 'Silicon Forest', type: 'psychoacoustic', params: { type: 'silicon_forest' }, isPremium: true, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" })), description: "Wind through fiber-optic cables. Comb-filtered pink noise creates metallic 'green noise' resonances that clear mental chatter. Engineered anxiety dissolution." },
];

export const GUIDED_RELAXATIONS: GuidedRelaxation[] = [
    { id: '478_breathing', name: '4-7-8 Breathing', icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 10V3L4 14h7v7l9-11h-7z" })), description: "A powerful technique to calm the nervous system. Inhale for 4s, hold for 7s, exhale for 8s." },
    { id: 'box_breathing', name: 'Box Breathing', icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" })), description: "Used by elite performers to manage stress. Inhale, hold, exhale, and hold, each for 4 seconds." },
    { id: 'resonance_chamber', name: 'Resonance Chamber', icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" })), description: "HRV-optimized 5.5s in/out breathing with audio-guided timbre modulation. The 0.1Hz resonance frequency maximizes heart rate variability for deep relaxation.", isPremium: true }
];

export const SLEEP_CHECKLIST_ITEMS = [
    { key: 'dim_lights', text: 'Dimmed lights 1 hour before bed' },
    { key: 'no_screens', text: 'No screens 30 minutes before bed' },
    { key: 'blue_light', text: 'Enabled blue light filter/Night Shift on devices' },
    { key: 'cool_room', text: 'Room is cool and comfortable' },
    { key: 'quiet_room', text: 'Room is quiet and dark' },
    { key: 'no_caffeine', text: 'No caffeine in last 8 hours' },
    { key: 'no_late_meals', text: 'Avoided late meals (2-3 hrs before bed)' }
];