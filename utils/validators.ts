import { Alarm, Dream, SleepEntry } from '../types';

/**
 * Type guard validators for localStorage data.
 * Used by useLocalStorage to validate parsed JSON against expected schemas.
 */

export const isAlarmArray = (data: unknown): data is Alarm[] => {
    return Array.isArray(data) && data.every(item =>
        typeof item === 'object' && item !== null &&
        typeof (item as Alarm).id === 'number' &&
        typeof (item as Alarm).time === 'string'
    );
};

export const isDreamArray = (data: unknown): data is Dream[] => {
    return Array.isArray(data) && data.every(item =>
        typeof item === 'object' && item !== null &&
        typeof (item as Dream).id === 'number' &&
        typeof (item as Dream).dreamText === 'string'
    );
};

export const isSleepEntryArray = (data: unknown): data is SleepEntry[] => {
    return Array.isArray(data) && data.every(item =>
        typeof item === 'object' && item !== null &&
        typeof (item as SleepEntry).id === 'number' &&
        typeof (item as SleepEntry).date === 'string'
    );
};
