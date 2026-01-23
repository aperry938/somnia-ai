// AI Consent utility functions - separated for better code splitting
// These are used by DreamDetailPage before the modal is loaded

const CONSENT_STORAGE_KEY = 'somnia_ai_consent_given';

export const hasAIConsent = (): boolean => {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
};

export const setAIConsent = (consented: boolean): void => {
    if (consented) {
        localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
    } else {
        localStorage.removeItem(CONSENT_STORAGE_KEY);
    }
};
