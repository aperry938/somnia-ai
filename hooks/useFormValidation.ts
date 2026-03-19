// hooks/useFormValidation.ts
/**
 * Custom hook for real-time form validation with debouncing.
 * Provides instant feedback while user types.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
    validateEmail,
    validatePassword,
    validateDreamText,
    validateTimeString,
    INPUT_LIMITS,
    sanitizeTextLive
} from '../services/validationService';

export interface FieldValidation {
    value: string;
    error: string | null;
    isValid: boolean;
    isDirty: boolean;
    isValidating: boolean;
}

export interface UseFormValidationOptions<T extends Record<string, string>> {
    /** Initial values for the form fields */
    initialValues: T;
    /** Validation rules for each field */
    validators: {
        [K in keyof T]?: (value: string) => { valid: boolean; error?: string };
    };
    /** Debounce delay in ms (default: 300) */
    debounceMs?: number;
    /** Whether to validate on mount (default: false) */
    validateOnMount?: boolean;
}

export interface UseFormValidationReturn<T extends Record<string, string>> {
    /** Current field values and validation states */
    fields: {
        [K in keyof T]: FieldValidation;
    };
    /** Update a field's value */
    setValue: (field: keyof T, value: string) => void;
    /** Set a field as touched/dirty */
    setTouched: (field: keyof T) => void;
    /** Validate all fields at once */
    validateAll: () => boolean;
    /** Reset form to initial values */
    reset: () => void;
    /** Whether the entire form is valid */
    isFormValid: boolean;
    /** Whether any field has errors */
    hasErrors: boolean;
    /** Get error messages for display */
    getErrorMessages: () => string[];
}

export function useFormValidation<T extends Record<string, string>>({
    initialValues,
    validators,
    debounceMs = 300,
    validateOnMount = false
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
    // Initialize fields with default validation state
    const createInitialFields = useCallback(() => {
        const fields: Record<string, FieldValidation> = {};
        for (const key in initialValues) {
            fields[key] = {
                value: initialValues[key] || '',
                error: null,
                isValid: true,
                isDirty: false,
                isValidating: false
            };
        }
        return fields as { [K in keyof T]: FieldValidation };
    }, [initialValues]);

    const [fields, setFields] = useState(createInitialFields);

    // Debounce timers for each field
    const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
        };
    }, []);

    // Validate on mount if requested
    useEffect(() => {
        if (validateOnMount) {
            validateAll();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const validateField = useCallback((field: keyof T, value: string): { valid: boolean; error: string | null } => {
        const validator = validators[field];
        if (!validator) {
            return { valid: true, error: null };
        }

        const result = validator(value);
        return {
            valid: result.valid,
            error: result.error || null
        };
    }, [validators]);

    const setValue = useCallback((field: keyof T, value: string) => {
        // Clear existing timer
        if (timersRef.current[field as string]) {
            clearTimeout(timersRef.current[field as string]);
        }

        // Immediately update value
        setFields(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                value,
                isDirty: true,
                isValidating: true
            }
        }));

        // Debounced validation
        timersRef.current[field as string] = setTimeout(() => {
            const validation = validateField(field, value);
            setFields(prev => ({
                ...prev,
                [field]: {
                    ...prev[field],
                    error: validation.error,
                    isValid: validation.valid,
                    isValidating: false
                }
            }));
        }, debounceMs);
    }, [validateField, debounceMs]);

    const setTouched = useCallback((field: keyof T) => {
        setFields(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                isDirty: true
            }
        }));

        // Immediate validation when field is touched
        const currentValue = fields[field].value;
        const validation = validateField(field, currentValue);
        setFields(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                error: validation.error,
                isValid: validation.valid
            }
        }));
    }, [fields, validateField]);

    const validateAll = useCallback((): boolean => {
        let allValid = true;
        const newFields = { ...fields };

        for (const key in fields) {
            const validation = validateField(key as keyof T, fields[key].value);
            newFields[key] = {
                ...newFields[key],
                error: validation.error,
                isValid: validation.valid,
                isDirty: true,
                isValidating: false
            };
            if (!validation.valid) {
                allValid = false;
            }
        }

        setFields(newFields);
        return allValid;
    }, [fields, validateField]);

    const reset = useCallback(() => {
        Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
        timersRef.current = {};
        setFields(createInitialFields());
    }, [createInitialFields]);

    const isFormValid = Object.values(fields).every(f => f.isValid);
    const hasErrors = Object.values(fields).some(f => f.error !== null);

    const getErrorMessages = useCallback((): string[] => {
        return Object.values(fields)
            .filter(f => f.error !== null && f.isDirty)
            .map(f => f.error as string);
    }, [fields]);

    return {
        fields,
        setValue,
        setTouched,
        validateAll,
        reset,
        isFormValid,
        hasErrors,
        getErrorMessages
    };
}

// Pre-built validators for common use cases
export const commonValidators = {
    email: validateEmail,
    password: validatePassword,
    dreamText: validateDreamText,
    time: (value: string) => ({
        valid: validateTimeString(value),
        error: validateTimeString(value) ? undefined : 'Invalid time format (HH:MM)'
    }),
    required: (value: string) => ({
        valid: value.trim().length > 0,
        error: value.trim().length > 0 ? undefined : 'This field is required'
    }),
    minLength: (min: number) => (value: string) => ({
        valid: value.length >= min,
        error: value.length >= min ? undefined : `Must be at least ${min} characters`
    }),
    maxLength: (max: number) => (value: string) => ({
        valid: value.length <= max,
        error: value.length <= max ? undefined : `Must be at most ${max} characters`
    }),
    dreamTitle: (value: string) => ({
        valid: value.length <= INPUT_LIMITS.dreamTitle,
        error: value.length <= INPUT_LIMITS.dreamTitle ? undefined : `Title must be at most ${INPUT_LIMITS.dreamTitle} characters`
    }),
    notes: (value: string) => {
        const sanitized = sanitizeTextLive(value);
        return {
            valid: sanitized.length <= INPUT_LIMITS.notes,
            error: sanitized.length <= INPUT_LIMITS.notes ? undefined : `Notes must be at most ${INPUT_LIMITS.notes} characters`
        };
    }
};

export default useFormValidation;
