
// Basic Voice Command Service using Web Speech API

type CommandCallback = () => void;

interface VoiceCommand {
    phrase: string;
    callback: CommandCallback;
}

class VoiceCommandService {
    private recognition: any | null = null;
    private isListening: boolean = false;
    private listeners: VoiceCommand[] = [];

    constructor() {
        if ('webkitSpeechRecognition' in window) {
            // @ts-ignore
            this.recognition = new window.webkitSpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event: any) => {
                const lastResultIndex = event.results.length - 1;
                const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
                console.log("Voice recognized:", transcript);
                this.processCommand(transcript);
            };

            this.recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
            };

            this.recognition.onend = () => {
                if (this.isListening) {
                    this.recognition.start(); // Auto-restart if it stops unexpectedly while supposed to be listening
                }
            };
        }
    }

    public start() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
                this.isListening = true;
                console.log("Voice Command Service Started");
            } catch (e) {
                console.error("Failed to start speech recognition", e);
            }
        }
    }

    public stop() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
            console.log("Voice Command Service Stopped");
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
                console.log(`Executing command: ${listener.phrase}`);
                listener.callback();
            }
        });
    }
}

export const voiceService = new VoiceCommandService();
