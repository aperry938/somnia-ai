import { useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'somnia_sleep_detection';
const LAST_ACTIVITY_KEY = 'somnia_last_activity';

interface SleepDetectionSettings {
    enabled: boolean;
    inactivityHours: number; // Hours of inactivity before prompting
    soundId: string; // Alarm sound to use when triggered
}

const DEFAULT_SETTINGS: SleepDetectionSettings = {
    enabled: false,
    inactivityHours: 5,
    soundId: 'somnia'
};

/**
 * Hook to detect phone inactivity and prompt dream logging.
 * Monitors user activity and triggers a callback when inactivity threshold is reached.
 * @param onWakePrompt - Called with the sound ID to use when inactivity threshold is met
 */
export const useSleepDetection = (onWakePrompt: (soundId: string) => void) => {
    const checkIntervalRef = useRef<number | null>(null);

    // Get settings from localStorage
    const getSettings = useCallback((): SleepDetectionSettings => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
        } catch {
            return DEFAULT_SETTINGS;
        }
    }, []);

    // Save settings to localStorage
    const saveSettings = useCallback((settings: SleepDetectionSettings) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, []);

    // Update last activity timestamp
    const recordActivity = useCallback(() => {
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }, []);

    // Check if inactivity threshold has been reached
    const checkInactivity = useCallback(() => {
        const settings = getSettings();
        if (!settings.enabled) return false;

        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (!lastActivity) {
            recordActivity();
            return false;
        }

        const lastActivityTime = parseInt(lastActivity, 10);
        const inactivityMs = Date.now() - lastActivityTime;
        const thresholdMs = settings.inactivityHours * 60 * 60 * 1000;

        if (inactivityMs >= thresholdMs) {
            // Reset last activity to prevent repeated prompts
            recordActivity();
            return true;
        }
        return false;
    }, [getSettings, recordActivity]);

    // Setup activity listeners
    useEffect(() => {
        const settings = getSettings();
        if (!settings.enabled) return;

        // Record activity on various user interactions
        const activityEvents = ['touchstart', 'mousedown', 'keydown', 'scroll', 'visibilitychange'];

        const handleActivity = () => {
            if (document.visibilityState === 'visible') {
                recordActivity();
            }
        };

        activityEvents.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Initial activity record
        recordActivity();

        // Check inactivity periodically (every 5 minutes when app is active)
        checkIntervalRef.current = window.setInterval(() => {
            if (document.visibilityState === 'visible' && checkInactivity()) {
                const settings = getSettings();
                onWakePrompt(settings.soundId);
            }
        }, 5 * 60 * 1000);

        // Also check when app becomes visible after being in background
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && checkInactivity()) {
                const settings = getSettings();
                onWakePrompt(settings.soundId);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, [getSettings, recordActivity, checkInactivity, onWakePrompt]);

    return {
        getSettings,
        saveSettings,
        recordActivity
    };
};
