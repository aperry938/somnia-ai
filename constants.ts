import React from 'react';
import { Soundscape, GuidedRelaxation } from './types';

// Standard props for consistent icon styling
const iconProps = {
    xmlns: "http://www.w3.org/2000/svg",
    className: "h-6 w-6",
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: "1.5"
};

export const SOUNDSCAPES: Soundscape[] = [
    { id: 'white_noise', name: 'White Noise', type: 'noise', params: { type: 'white' }, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" })), description: "Masks sudden sounds, highly effective for light sleepers or noisy environments." },
    { id: 'pink_noise', name: 'Pink Noise', type: 'noise', params: { type: 'pink' }, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 8h16M4 16h16" }), React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M8 4l4 4 4-4" }), React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M8 12l4 4 4-4" })), description: "Deeper than white noise, resembling steady rain, can increase deep sleep time." },
    { id: 'brown_noise', name: 'Brown Noise', type: 'noise', params: { type: 'brown' }, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 7v10h18V7M5 7L12 13L19 7" })), description: "Lowest frequencies, like a strong waterfall, excellent for deep relaxation." },
    { id: 'gentle_rain', name: 'Gentle Rain', type: 'file', params: { src: 'https://storage.googleapis.com/web-dev-assets/rain-sound.mp3' }, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" })), description: "A steady, calming rainfall to wash away stress and help you drift off." },
    { id: 'ocean_waves', name: 'Ocean Waves', type: 'file', params: { src: 'https://storage.googleapis.com/web-dev-assets/ocean-waves.mp3' }, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 8h16M4 16h16" })), description: "The rhythmic ebb and flow of ocean waves crashing on a distant shore." },
    { id: 'fireplace', name: 'Fireplace', type: 'file', params: { src: 'https://storage.googleapis.com/web-dev-assets/fireplace.mp3' }, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.657 7.343A8 8 0 0117.657 18.657z" })), description: "The warm, comforting crackle of a wood fire, perfect for a cozy night." },
    { id: 'delta_waves', name: 'Delta Waves', type: 'binaural', params: { base: 100, diff: 3 }, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.055 11H5a2 2 0 012 2v1a2 2 0 01-2 2H3.055a1 1 0 01-.707-1.707l1.414-1.414a1 1 0 010-1.414l-1.414-1.414A1 1 0 013.055 11z" }), React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M20.945 11H19a2 2 0 00-2 2v1a2 2 0 002 2h1.945a1 1 0 00.707-1.707l-1.414-1.414a1 1 0 000-1.414l1.414-1.414a1 1 0 00-.707-1.707z" })), description: "Binaural beats (1-4 Hz) associated with the deepest stages of sleep." },
    { id: 'theta_waves', name: 'Theta Waves', type: 'binaural', params: { base: 150, diff: 6 }, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M17 14v6m-5-12v12m-5-6v6" })), description: "Binaural beats (4-8 Hz) linked to REM sleep, meditation, and creativity." },
    { id: 'alpha_waves', name: 'Alpha Waves', type: 'binaural', params: { base: 200, diff: 10 }, icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" })), description: "Binaural beats (8-12 Hz) for quiet, wakeful relaxation and stress reduction." },
];

export const GUIDED_RELAXATIONS: GuidedRelaxation[] = [
    { id: '478_breathing', name: '4-7-8 Breathing', icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 10V3L4 14h7v7l9-11h-7z" })), description: "A powerful technique to calm the nervous system. Inhale for 4s, hold for 7s, exhale for 8s." },
    { id: 'box_breathing', name: 'Box Breathing', icon: React.createElement('svg', iconProps, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" })), description: "Used by elite performers to manage stress. Inhale, hold, exhale, and hold, each for 4 seconds." }
];

export const SLEEP_CHECKLIST_ITEMS = [
    { key: 'dim_lights', text: 'Dimmed lights 1 hour before bed' },
    { key: 'no_screens', text: 'No screens 30 minutes before bed' },
    { key: 'cool_room', text: 'Room is cool and comfortable' },
    { key: 'quiet_room', text: 'Room is quiet and dark' },
    { key: 'no_caffeine', text: 'No caffeine in last 8 hours' },
    { key: 'no_late_meals', text: 'Avoided late meals (2-3 hrs before bed)' }
];