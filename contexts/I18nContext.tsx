import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import enLocale from '../locales/en.json';

type NestedStrings = { [key: string]: string | NestedStrings };

interface I18nContextType {
    t: (key: string, params?: Record<string, string | number>) => string;
    locale: string;
    setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nContextType>({
    t: (key) => key,
    locale: 'en',
    setLocale: () => {},
});

// Locale data cache — English is always present
const enMessages = enLocale as NestedStrings;
const localeCache: Record<string, NestedStrings> = {
    en: enMessages,
};

/**
 * Resolve a dot-notation key like "nav.alarms" from a nested object
 */
function resolveKey(obj: NestedStrings, key: string): string | undefined {
    const parts = key.split('.');
    let current: string | NestedStrings = obj;
    for (const part of parts) {
        if (typeof current !== 'object' || current === null) return undefined;
        const next: string | NestedStrings | undefined = (current as NestedStrings)[part];
        if (next === undefined) return undefined;
        current = next;
    }
    return typeof current === 'string' ? current : undefined;
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocaleState] = useState(() => {
        try {
            return localStorage.getItem('somnia_locale') || 'en';
        } catch {
            return 'en';
        }
    });

    const [messages, setMessages] = useState<NestedStrings>(localeCache[locale] ?? enMessages);

    // Persist locale choice
    const setLocale = useCallback((newLocale: string) => {
        setLocaleState(newLocale);
        try {
            localStorage.setItem('somnia_locale', newLocale);
        } catch {
            // Ignore
        }
    }, []);

    // Load locale data when locale changes
    useEffect(() => {
        const cached = localeCache[locale];
        if (cached) {
            setMessages(cached);
            return;
        }
        // Future: dynamic import for other locales
        // import(`../locales/${locale}.json`).then(mod => { ... })
        // For now, fall back to English
        setMessages(enMessages);
    }, [locale]);

    const t = useCallback((key: string, params?: Record<string, string | number>): string => {
        let value = resolveKey(messages, key);
        if (!value) {
            // Fallback to English
            value = resolveKey(enMessages, key);
        }
        if (!value) return key; // Return key itself as last resort

        // Simple parameter interpolation: {{count}} → 5
        if (params) {
            for (const [paramKey, paramValue] of Object.entries(params)) {
                value = value.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
            }
        }

        return value;
    }, [messages]);

    const contextValue = useMemo(() => ({ t, locale, setLocale }), [t, locale, setLocale]);

    return (
        <I18nContext.Provider value={contextValue}>
            {children}
        </I18nContext.Provider>
    );
};

export const useTranslation = () => useContext(I18nContext);
export default I18nContext;
