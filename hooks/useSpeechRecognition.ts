import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition as CapacitorSpeechRecognition } from '@capacitor-community/speech-recognition';
import { logger } from '../services/logger';

// Check if running in native environment
const isNative = Capacitor.isNativePlatform();

// Add types for Web Speech API
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly [index: number]: SpeechRecognitionAlternative;
    readonly length: number;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface SpeechRecognitionStatic {
    new(): SpeechRecognition;
}

interface SpeechGrammarList {
    readonly length: number;
    item(index: number): SpeechGrammar;
    addFromString(string: string, weight?: number): void;
    addFromURI(src: string, weight?: number): void;
    [index: number]: SpeechGrammar;
}

interface SpeechGrammar {
    src: string;
    weight: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    grammars: SpeechGrammarList;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onaudioend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    serviceURI: string;
    abort(): void;
    start(): void;
    stop(): void;
}

declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionStatic;
        webkitSpeechRecognition: SpeechRecognitionStatic;
    }
}

/**
 * Speech Recognition Hook
 *
 * Uses native Capacitor plugin on mobile (iOS/Android) for reliable speech recognition.
 * Falls back to Web Speech API in browsers where supported.
 *
 * @param onFinalTranscript - Callback fired when speech is recognized
 */
export const useSpeechRecognition = (onFinalTranscript: (transcript: string) => void) => {
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const onFinalTranscriptRef = useRef(onFinalTranscript);

    // Keep callback ref updated
    useEffect(() => {
        onFinalTranscriptRef.current = onFinalTranscript;
    }, [onFinalTranscript]);

    // Check support on mount
    useEffect(() => {
        const checkSupport = async () => {
            if (isNative) {
                try {
                    const result = await CapacitorSpeechRecognition.available();
                    setIsSupported(result.available);
                    logger.log('[SpeechRecognition] Native support:', result.available);
                } catch (error) {
                    logger.error('[SpeechRecognition] Native check failed:', error);
                    setIsSupported(false);
                }
            } else {
                const hasWebSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
                setIsSupported(hasWebSpeech);
                logger.log('[SpeechRecognition] Web Speech API support:', hasWebSpeech);
            }
        };
        checkSupport();
    }, []);

    // Initialize Web Speech API (browser only)
    useEffect(() => {
        if (isNative) return;

        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            logger.error('[SpeechRecognition] Web Speech API not supported');
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterimTranscript('');
        };

        recognition.onerror = (event) => {
            logger.error('[SpeechRecognition] Error:', event.error);
            if (event.error === 'not-allowed') {
                setIsSupported(false);
            }
        };

        recognition.onresult = (event) => {
            let final = '';
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            if (final) {
                onFinalTranscriptRef.current(final);
            }
            setInterimTranscript(interim);
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
        };
    }, []);

    // Native start/stop functions
    const startNative = useCallback(async () => {
        try {
            // Request permissions first
            const permResult = await CapacitorSpeechRecognition.requestPermissions();
            if (permResult.speechRecognition !== 'granted') {
                logger.error('[SpeechRecognition] Permission denied');
                setIsSupported(false);
                return;
            }

            // Set up listener for partial results
            await CapacitorSpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
                if (data.matches && data.matches.length > 0) {
                    setInterimTranscript(data.matches[0]);
                }
            });

            // Start recognition
            await CapacitorSpeechRecognition.start({
                language: 'en-US',
                maxResults: 5,
                partialResults: true,
                popup: false
            });

            setIsListening(true);
            logger.log('[SpeechRecognition] Native recognition started');
        } catch (error) {
            logger.error('[SpeechRecognition] Native start failed:', error);
        }
    }, []);

    const stopNative = useCallback(async () => {
        try {
            await CapacitorSpeechRecognition.stop();
            await CapacitorSpeechRecognition.removeAllListeners();

            setIsListening(false);

            // Use accumulated transcript from partial results listener
            const finalTranscript = interimTranscript;
            setInterimTranscript('');

            if (finalTranscript) {
                onFinalTranscriptRef.current(finalTranscript);
            }

            logger.log('[SpeechRecognition] Native recognition stopped');
        } catch (error) {
            logger.error('[SpeechRecognition] Native stop failed:', error);
            setIsListening(false);
        }
    }, [interimTranscript]);

    // Web Speech start/stop functions
    const startWeb = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (error) {
                logger.error('[SpeechRecognition] Web start failed:', error);
            }
        }
    }, [isListening]);

    const stopWeb = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    // Public interface
    const startListening = useCallback(() => {
        if (isNative) {
            startNative();
        } else {
            startWeb();
        }
    }, [startNative, startWeb]);

    const stopListening = useCallback(() => {
        if (isNative) {
            stopNative();
        } else {
            stopWeb();
        }
    }, [stopNative, stopWeb]);

    return {
        isListening,
        interimTranscript,
        startListening,
        stopListening,
        isSupported
    };
};
