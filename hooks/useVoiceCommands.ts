
import { useState, useEffect, useCallback, useRef } from 'react';
import { voiceService } from '../services/voiceCommandService';
import { parseVoiceIntent, VoiceIntent } from '../services/voiceIntentService';
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../components/shared/Toast';
import { isPremium } from '../services/secureSubscriptionService';
import { SOUNDSCAPES } from '../constants';
import { playSleepSound, stopSleepSound } from '../services/audioService';

export const useVoiceCommands = () => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSupported] = useState('webkitSpeechRecognition' in window);
    const [lastIntent, setLastIntent] = useState<VoiceIntent | null>(null);

    const { setIsScribeOpen, setActivePage, addAlarm } = useAppContext();
    const { showToast } = useToast();

    // Track active sound for stopping
    const activeSoundRef = useRef<string | null>(null);

    /**
     * Execute the parsed voice intent
     */
    const executeIntent = useCallback(async (intent: VoiceIntent) => {
        setLastIntent(intent);

        switch (intent.type) {
            case 'LOG_DREAM':
                showToast("Opening Dream Scribe...", "success");
                setIsScribeOpen(true);
                break;

            case 'SET_ALARM':
                if (intent.time) {
                    // Determine days array
                    let days: number[] = [];
                    if (intent.days && Array.isArray(intent.days)) {
                        const dayMap: Record<string, number> = {
                            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
                            'thursday': 4, 'friday': 5, 'saturday': 6
                        };
                        days = intent.days.map(d => dayMap[d.toLowerCase()]).filter(d => d !== undefined);
                    }

                    addAlarm(intent.time, false, days, 'progressive');
                    const dayText = days.length > 0 ? ` (${days.length === 7 ? 'daily' : days.length + ' days'})` : '';
                    showToast(`Alarm set for ${intent.time}${dayText}`, "success");

                    // Navigate to Sleep Gateway
                    setActivePage('sleep');
                } else {
                    // No time specified, open alarm page
                    showToast("Opening Alarms...", "info");
                    setActivePage('alarms');
                }
                break;

            case 'NAVIGATE':
                showToast(`Going to ${intent.page}...`, "info");
                setActivePage(intent.page);
                break;

            case 'PLAY_SOUND':
                const sound = SOUNDSCAPES.find(s => s.id === intent.soundId);
                if (sound) {
                    showToast(`Playing ${sound.name}...`, "success");
                    await playSleepSound(sound, 0.7, 0); // 70% volume, no auto-stop
                    activeSoundRef.current = sound.id;
                    setActivePage('sleep');
                } else {
                    showToast("Sound not found", "error");
                }
                break;

            case 'STOP_SOUND':
                stopSleepSound();
                activeSoundRef.current = null;
                showToast("Sounds stopped", "info");
                break;

            case 'START_SLEEP_SESSION':
                showToast("Starting sleep session...", "success");
                setActivePage('sleep');
                break;

            case 'UNKNOWN':
                if (isPremium()) {
                    showToast("I didn't understand that command", "error");
                } else {
                    showToast("Upgrade to PRO for advanced voice commands", "info");
                }
                break;
        }
    }, [setIsScribeOpen, setActivePage, addAlarm, showToast]);

    /**
     * Process transcript from voice service
     */
    const processTranscript = useCallback(async (transcript: string) => {
        setIsProcessing(true);
        showToast(`Heard: "${transcript}"`, "info");

        try {
            const intent = await parseVoiceIntent(transcript);
            await executeIntent(intent);
        } catch (error) {
            console.error('Voice command processing failed:', error);
            showToast("Voice command failed", "error");
        } finally {
            setIsProcessing(false);
        }
    }, [executeIntent, showToast]);

    useEffect(() => {
        // Override the voice service to use our AI-powered processing
        const originalOnResult = voiceService['recognition']?.onresult;

        if (voiceService['recognition']) {
            voiceService['recognition'].onresult = (event: any) => {
                const lastResultIndex = event.results.length - 1;
                const transcript = event.results[lastResultIndex][0].transcript.trim();

                if (event.results[lastResultIndex].isFinal) {
                    processTranscript(transcript);
                }
            };
        }

        return () => {
            // Restore original handler on cleanup
            if (voiceService['recognition'] && originalOnResult) {
                voiceService['recognition'].onresult = originalOnResult;
            }
        };
    }, [processTranscript]);

    const startListening = useCallback(() => {
        voiceService.start();
        setIsListening(true);
        showToast(isPremium() ? "AI Voice Assistant listening..." : "Voice commands active (basic mode)", "info");
    }, [showToast]);

    const stopListening = useCallback(() => {
        voiceService.stop();
        setIsListening(false);
    }, []);

    return {
        isListening,
        startListening,
        stopListening,
        isSupported,
        isProcessing,
        lastIntent
    };
};
