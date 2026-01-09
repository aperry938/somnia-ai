/**
 * React hook for audio classification during sleep monitoring
 *
 * Uses TensorFlow.js to classify ambient audio and detect:
 * - Sleep talk / speech
 * - Snoring
 * - Movement sounds
 * - Ambient noise levels
 *
 * All processing happens on-device for privacy.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    AudioClassification,
    SleepAudioEvent,
    startAudioClassification,
    stopAudioClassification,
    isAudioClassificationRunning,
    initML
} from '../services/mlService';

interface AudioClassificationState {
    isRecording: boolean;
    isInitialized: boolean;
    currentClassification: AudioClassification | null;
    events: SleepAudioEvent[];
    error: string | null;
    permissionDenied: boolean;
}

interface UseAudioClassificationReturn extends AudioClassificationState {
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    clearEvents: () => void;
}

const STORAGE_KEY = 'somnia_sleep_audio_events';

export const useAudioClassification = (): UseAudioClassificationReturn => {
    const [state, setState] = useState<AudioClassificationState>({
        isRecording: false,
        isInitialized: false,
        currentClassification: null,
        events: [],
        error: null,
        permissionDenied: false
    });

    const lastEventRef = useRef<{ type: string; timestamp: number } | null>(null);
    const eventStartRef = useRef<number>(0);

    // Initialize ML on mount
    useEffect(() => {
        const init = async () => {
            try {
                await initML();
                setState(prev => ({ ...prev, isInitialized: true }));
            } catch (error) {
                console.error('[useAudioClassification] Init failed:', error);
                setState(prev => ({
                    ...prev,
                    error: 'Failed to initialize ML engine'
                }));
            }
        };
        init();

        // Load saved events
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const events = JSON.parse(saved) as SleepAudioEvent[];
                setState(prev => ({ ...prev, events }));
            }
        } catch {
            // Ignore parse errors
        }

        return () => {
            if (isAudioClassificationRunning()) {
                stopAudioClassification();
            }
        };
    }, []);

    // Save events to localStorage when they change
    useEffect(() => {
        if (state.events.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events.slice(-100))); // Keep last 100
        }
    }, [state.events]);

    const handleClassification = useCallback((classifications: AudioClassification[]) => {
        if (classifications.length === 0) return;

        const top = classifications[0];

        // Update current classification
        setState(prev => ({ ...prev, currentClassification: top }));

        // Track significant events (not silence, confidence > 0.5)
        if (top.label !== 'silence' && top.confidence > 0.5) {
            const now = Date.now();

            // If same type as last event and recent, extend duration
            if (lastEventRef.current?.type === top.label && now - lastEventRef.current.timestamp < 3000) {
                lastEventRef.current.timestamp = now;
                return;
            }

            // If we had a previous event, finalize it
            if (lastEventRef.current && eventStartRef.current > 0) {
                const duration = lastEventRef.current.timestamp - eventStartRef.current;
                if (duration > 500) { // Only log events > 500ms
                    const event: SleepAudioEvent = {
                        timestamp: eventStartRef.current,
                        type: lastEventRef.current.type as SleepAudioEvent['type'],
                        confidence: top.confidence,
                        duration
                    };

                    setState(prev => ({
                        ...prev,
                        events: [...prev.events, event]
                    }));
                }
            }

            // Start new event
            lastEventRef.current = { type: top.label, timestamp: now };
            eventStartRef.current = now;
        }
    }, []);

    const startRecording = useCallback(async () => {
        if (state.isRecording || !state.isInitialized) return;

        try {
            setState(prev => ({ ...prev, error: null }));
            await startAudioClassification(handleClassification, 500);
            setState(prev => ({ ...prev, isRecording: true }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
                setState(prev => ({
                    ...prev,
                    permissionDenied: true,
                    error: 'Microphone permission denied. Enable in browser settings.'
                }));
            } else {
                setState(prev => ({
                    ...prev,
                    error: `Failed to start: ${errorMessage}`
                }));
            }
        }
    }, [state.isRecording, state.isInitialized, handleClassification]);

    const stopRecording = useCallback(() => {
        // Finalize any pending event
        if (lastEventRef.current && eventStartRef.current > 0) {
            const duration = lastEventRef.current.timestamp - eventStartRef.current;
            if (duration > 500) {
                const event: SleepAudioEvent = {
                    timestamp: eventStartRef.current,
                    type: lastEventRef.current.type as SleepAudioEvent['type'],
                    confidence: 0.7,
                    duration
                };
                setState(prev => ({
                    ...prev,
                    events: [...prev.events, event]
                }));
            }
        }

        stopAudioClassification();
        lastEventRef.current = null;
        eventStartRef.current = 0;
        setState(prev => ({
            ...prev,
            isRecording: false,
            currentClassification: null
        }));
    }, []);

    const clearEvents = useCallback(() => {
        setState(prev => ({ ...prev, events: [] }));
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return {
        ...state,
        startRecording,
        stopRecording,
        clearEvents
    };
};
