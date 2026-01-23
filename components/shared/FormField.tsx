// components/shared/FormField.tsx
/**
 * Reusable form field component with real-time validation feedback.
 * Provides accessible error messages and visual states.
 */
import React from 'react';
import { FieldValidation } from '../../hooks/useFormValidation';

interface FormFieldProps {
    /** Unique identifier for the field */
    id: string;
    /** Label text for the field */
    label: string;
    /** Field type (text, email, password, textarea) */
    type?: 'text' | 'email' | 'password' | 'textarea';
    /** Placeholder text */
    placeholder?: string;
    /** Validation state from useFormValidation */
    validation: FieldValidation;
    /** Handler for value changes */
    onChange: (value: string) => void;
    /** Handler for blur (touch) events */
    onBlur?: () => void;
    /** Whether the field is disabled */
    disabled?: boolean;
    /** Number of rows for textarea */
    rows?: number;
    /** Maximum length */
    maxLength?: number;
    /** Whether to show character count */
    showCharCount?: boolean;
    /** Auto-complete value */
    autoComplete?: string;
    /** Additional className */
    className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
    id,
    label,
    type = 'text',
    placeholder,
    validation,
    onChange,
    onBlur,
    disabled = false,
    rows = 3,
    maxLength,
    showCharCount = false,
    autoComplete,
    className = ''
}) => {
    const { value, error, isValid, isDirty, isValidating } = validation;

    // Determine visual state
    const hasError = isDirty && error !== null;
    const showSuccess = isDirty && isValid && !isValidating && value.length > 0;

    // Dynamic classes based on state
    const inputClasses = `w-full p-3 min-h-[48px] text-base bg-white/50 dark:bg-black/20 border rounded-lg transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${hasError ? 'border-red-500 dark:border-red-400 focus:ring-red-500' : showSuccess ? 'border-green-500 dark:border-green-400' : 'border-day-border dark:border-night-border focus:border-day-accent dark:focus:border-night-accent'} focus:outline-none focus:ring-2 focus:ring-opacity-50 ${className}`;

    const errorId = `${id}-error`;
    const charCountId = `${id}-count`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        let newValue = e.target.value;
        if (maxLength) {
            newValue = newValue.slice(0, maxLength);
        }
        onChange(newValue);
    };

    return (
        <div className="space-y-1">
            <label
                htmlFor={id}
                className="block text-sm font-medium text-day-text-primary dark:text-night-text-primary"
            >
                {label}
            </label>

            <div className="relative">
                {type === 'textarea' ? (
                    <textarea
                        id={id}
                        value={value}
                        onChange={handleChange}
                        onBlur={onBlur}
                        disabled={disabled}
                        placeholder={placeholder}
                        rows={rows}
                        maxLength={maxLength}
                        aria-invalid={hasError}
                        aria-describedby={`${hasError ? errorId : ''} ${showCharCount && maxLength ? charCountId : ''}`.trim() || undefined}
                        className={`${inputClasses} resize-none custom-scrollbar`}
                    />
                ) : (
                    <input
                        id={id}
                        type={type}
                        value={value}
                        onChange={handleChange}
                        onBlur={onBlur}
                        disabled={disabled}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        autoComplete={autoComplete}
                        aria-invalid={hasError}
                        aria-describedby={hasError ? errorId : undefined}
                        className={inputClasses}
                    />
                )}

                {/* Status indicators */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {/* Validating spinner */}
                    {isValidating && (
                        <div
                            className="w-4 h-4 border-2 border-day-accent/30 border-t-day-accent rounded-full animate-spin"
                            role="status"
                            aria-label="Validating"
                        />
                    )}

                    {/* Success check */}
                    {showSuccess && !isValidating && (
                        <svg
                            className="w-5 h-5 text-green-500 dark:text-green-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    )}

                    {/* Error X */}
                    {hasError && !isValidating && (
                        <svg
                            className="w-5 h-5 text-red-500 dark:text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Error message */}
            {hasError && (
                <p
                    id={errorId}
                    className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1"
                    role="alert"
                >
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {error}
                </p>
            )}

            {/* Character count */}
            {showCharCount && maxLength && (
                <p
                    id={charCountId}
                    className={`text-xs text-right ${value.length >= maxLength ? 'text-red-500' : value.length >= maxLength * 0.9 ? 'text-amber-500' : 'text-day-text-secondary dark:text-night-text-secondary'}`}
                >
                    {value.length}/{maxLength}
                </p>
            )}
        </div>
    );
};

export default FormField;
