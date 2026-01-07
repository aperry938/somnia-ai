
// Basic Voice Command Service using Web Speech API

// Web Speech API types (not always available in TypeScript)
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
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
    private recognition: SpeechRecognitionInstance | null = null;
    private isListening: boolean = false;
    private listeners: VoiceCommand[] = [];

    constructor() {
        if ('webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as Window & { webkitSpeechRecognition: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event: SpeechRecognitionEvent) => {
                const lastResultIndex = event.results.length - 1;
                const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
                this.processCommand(transcript);
            };

            this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error("Speech recognition error", event.error);
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
                console.error("Failed to start speech recognition", e);
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
