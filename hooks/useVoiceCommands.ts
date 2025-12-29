
import { useState, useEffect, useCallback } from 'react';
import { voiceService } from '../services/voiceCommandService';
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../components/shared/Toast';

export const useVoiceCommands = () => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSupported] = useState('webkitSpeechRecognition' in window);

    const { setIsScribeOpen } = useAppContext();
    const { showToast } = useToast();

    useEffect(() => {
        // Register commands
        voiceService.registerCommand('log dream', () => {
            setIsProcessing(true);
            showToast("Voice Command: Opening Dream Scribe...", "success");
            setTimeout(() => {
                setIsScribeOpen(true);
                setIsProcessing(false);
            }, 500);
        });

        voiceService.registerCommand('stop listening', () => {
            stopListening();
            showToast("Voice Recognition Paused", "info");
        });

        return () => {
            // Cleanup (?) - Singleton service might keep listeners if we don't unregister
            // For now, let's keep them bound or we'd need a robust unregister logic
        };
    }, []);

    const startListening = useCallback(() => {
        voiceService.start();
        setIsListening(true);
    }, []);

    const stopListening = useCallback(() => {
        voiceService.stop();
        setIsListening(false);
    }, []);

    return {
        isListening,
        startListening,
        stopListening,
        isSupported,
        isProcessing
    };
};
