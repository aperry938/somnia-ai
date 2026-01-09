// Basic Voice Command Service using Web Speech API

import { logger } from './logger';

// Minimal interface for the Web Speech API recognition object
// Using this approach to avoid conflicts with browser-specific global types
interface WebSpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

type CommandCallback = () => void;

interface VoiceCommand {
    phrase: string;
    callback: CommandCallback;
}

class VoiceCommandService {
    private recognition: WebSpeechRecognition | null = null;
    private isListening: boolean = false;
    private listeners: VoiceCommand[] = [];

    constructor() {
        if ('webkitSpeechRecognition' in window) {
            // Cast through unknown to safely access vendor-prefixed API
            const SpeechRecognitionCtor = (window as unknown as { webkitSpeechRecognition: new () => WebSpeechRecognition }).webkitSpeechRecognition;
            this.recognition = new SpeechRecognitionCtor();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const lastResultIndex = event.results.length - 1;
                const transcript = event.results[lastResultIndex]?.[0]?.transcript.trim().toLowerCase();
                if (transcript) {
                    this.processCommand(transcript);
                }
            };

            this.recognition.onerror = (event) => {
                logger.error("Speech recognition error", event.error);
            };

            this.recognition.onend = () => {
                if (this.isListening) {
                    this.recognition?.start();
                }
            };
        }
    }

    public start() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
                this.isListening = true;
            } catch (e) {
                logger.error("Failed to start speech recognition", e);
            }
        }
    }

    public stop() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
        }
    }

    public registerCommand(phrase: string, callback: CommandCallback) {
        this.listeners.push({ phrase: phrase.toLowerCase(), callback });
    }

    public unregisterCommand(phrase: string) {
        this.listeners = this.listeners.filter(l => l.phrase !== phrase.toLowerCase());
    }

    private processCommand(transcript: string) {
        this.listeners.forEach(listener => {
            if (transcript.includes(listener.phrase)) {
                listener.callback();
            }
        });
    }
}

export const voiceService = new VoiceCommandService();
