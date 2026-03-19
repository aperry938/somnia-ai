import { useState, useEffect } from 'react';
import { logger } from '../services/logger';

/**
 * Enhanced useLocalStorage hook with:
 * - Storage quota handling
 * - JSON parse error recovery
 * - Data corruption detection
 * - Schema validation callback
 */
export const useLocalStorage = <T,>(
    key: string,
    initialValue: T,
    validator?: (data: unknown) => data is T
): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item === null) return initialValue;

            let parsed: unknown;
            try {
                parsed = JSON.parse(item);
            } catch (parseError) {
                logger.error(`[Storage] Corrupted data for key ${key}, resetting to default`, parseError);
                try {
                    window.localStorage.setItem(`${key}_corrupted_${Date.now()}`, item);
                } catch {
                    // Ignore backup failure
                }
                return initialValue;
            }

            if (validator && !validator(parsed)) {
                logger.warn(`[Storage] Schema validation failed for key ${key}, using default value`);
                return initialValue;
            }

            return parsed as T;
        } catch (error) {
            logger.error(`[Storage] Error reading ${key}:`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            const serialized = JSON.stringify(storedValue);
            window.localStorage.setItem(key, serialized);
        } catch (error) {
            if (error instanceof DOMException && (
                error.code === 22 || // Chrome
                error.code === 1014 || // Firefox
                error.name === 'QuotaExceededError' ||
                error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
            )) {
                logger.error(`[Storage] Quota exceeded for key ${key}, attempting cleanup`);
                try {
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const storageKey = localStorage.key(i);
                        if (storageKey && (
                            storageKey.includes('_corrupted_') ||
                            storageKey.startsWith('somnia_backup_')
                        )) {
                            keysToRemove.push(storageKey);
                        }
                    }
                    keysToRemove.forEach(k => localStorage.removeItem(k));
                    window.localStorage.setItem(key, JSON.stringify(storedValue));
                } catch (retryError) {
                    logger.error(`[Storage] Failed to save ${key} even after cleanup:`, retryError);
                }
            } else {
                logger.error(`[Storage] Error saving ${key}:`, error);
            }
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
};
