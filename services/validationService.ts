/**
 * Input Validation and Sanitization Service
 * Prevents XSS, injection attacks, and validates user input.
 */

// Maximum lengths for various input fields
export const INPUT_LIMITS = {
    dreamText: 50000,      // Dream journal entries can be long
    dreamTitle: 200,
    searchQuery: 100,
    label: 100,
    email: 254,
    password: 128,
    name: 100,
    notes: 5000,
    chatMessage: 2000,
    tags: 50,              // Per tag
    maxTags: 20,           // Maximum number of tags
};

/**
 * Remove potentially dangerous HTML characters
 * React escapes by default, but this is for non-React contexts (logs, API payloads)
 */
export const escapeHtml = (text: string): string => {
    const htmlEntities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };
    return text.replace(/[&<>"'/]/g, char => htmlEntities[char] || char);
};

/**
 * Remove control characters and normalize whitespace
 */
export const sanitizeText = (text: string): string => {
    return text
        // Remove control characters except newlines and tabs
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Normalize multiple spaces to single space
        .replace(/ {2,}/g, ' ')
        // Normalize multiple newlines to double newline
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

/**
 * Same as sanitizeText but preserves trailing/leading spaces during live input
 * Use this for onChange handlers, sanitizeText for final save
 */
export const sanitizeTextLive = (text: string): string => {
    return text
        // Remove control characters except newlines, tabs, and spaces
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Normalize multiple spaces to double space (allow some but not excessive)
        .replace(/ {3,}/g, '  ')
        // Normalize multiple newlines to double newline
        .replace(/\n{3,}/g, '\n\n');
};

/**
 * Validate and sanitize dream text input
 */
export const validateDreamText = (text: string): { valid: boolean; sanitized: string; error?: string } => {
    if (!text || typeof text !== 'string') {
        return { valid: false, sanitized: '', error: 'Dream text is required' };
    }

    const sanitized = sanitizeText(text);

    if (sanitized.length === 0) {
        return { valid: false, sanitized: '', error: 'Dream text cannot be empty' };
    }

    if (sanitized.length > INPUT_LIMITS.dreamText) {
        return {
            valid: false,
            sanitized: sanitized.slice(0, INPUT_LIMITS.dreamText),
            error: `Dream text exceeds maximum length of ${INPUT_LIMITS.dreamText} characters`
        };
    }

    return { valid: true, sanitized };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required' };
    }

    const trimmed = email.trim().toLowerCase();

    if (trimmed.length > INPUT_LIMITS.email) {
        return { valid: false, error: 'Email is too long' };
    }

    // RFC 5322 compliant email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(trimmed)) {
        return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; error?: string; strength: 'weak' | 'medium' | 'strong' } => {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password is required', strength: 'weak' };
    }

    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters', strength: 'weak' };
    }

    if (password.length > INPUT_LIMITS.password) {
        return { valid: false, error: 'Password is too long', strength: 'weak' };
    }

    // Check password strength
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const strengthScore = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (strengthScore >= 4 && password.length >= 12) {
        strength = 'strong';
    } else if (strengthScore >= 3 || (strengthScore >= 2 && password.length >= 10)) {
        strength = 'medium';
    }

    return { valid: true, strength };
};

/**
 * Validate and sanitize a search query
 */
export const validateSearchQuery = (query: string): string => {
    if (!query || typeof query !== 'string') {
        return '';
    }

    return sanitizeText(query)
        .slice(0, INPUT_LIMITS.searchQuery)
        // Remove special characters that could be used for injection
        .replace(/[<>'"`;]/g, '');
};

/**
 * Validate and sanitize tags
 */
export const validateTags = (tags: string[]): string[] => {
    if (!Array.isArray(tags)) {
        return [];
    }

    return tags
        .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
        .map(tag => sanitizeText(tag).slice(0, INPUT_LIMITS.tags))
        .slice(0, INPUT_LIMITS.maxTags);
};

/**
 * Validate time string format (HH:MM)
 */
export const validateTimeString = (time: string): boolean => {
    if (!time || typeof time !== 'string') {
        return false;
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(time);
};

/**
 * Validate URL (for image URLs, etc.)
 */
export const validateUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const parsed = new URL(url);
        // Only allow http and https protocols
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
};

/**
 * Validate UUID format
 */
export const validateUUID = (uuid: string): boolean => {
    if (!uuid || typeof uuid !== 'string') {
        return false;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

/**
 * Sanitize object for safe JSON serialization
 * Removes functions, symbols, and circular references
 */
export const sanitizeForJson = <T>(obj: T): T => {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch {
        return obj;
    }
};

/**
 * Check if a string contains potential script injection
 */
export const containsScriptInjection = (text: string): boolean => {
    if (!text || typeof text !== 'string') {
        return false;
    }

    const patterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // Event handlers like onclick=
        /data:/gi,
        /vbscript:/gi,
        /expression\s*\(/gi, // CSS expression
        /url\s*\(/gi, // CSS url() with potential javascript
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
        /<form/gi,
        /<input/gi,
        /<meta/gi,
        /<link/gi,
        /<!--/gi, // HTML comments can be used for attacks
        /&\{/gi, // JavaScript entity encoding
    ];

    return patterns.some(pattern => pattern.test(text));
};

// ============================================
// SQL/NoSQL Injection Prevention
// ============================================

/**
 * Check for potential SQL/NoSQL injection patterns
 */
export const containsSqlInjection = (text: string): boolean => {
    if (!text || typeof text !== 'string') {
        return false;
    }

    const patterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
        /--/g, // SQL comment
        /;\s*$/g, // Trailing semicolon
        /'\s*(OR|AND)\s*'/gi, // Classic SQL injection
        /'\s*(OR|AND)\s+\d+\s*=\s*\d+/gi, // Numeric injection
        /\bOR\b\s+\d+\s*=\s*\d+/gi, // OR 1=1
        /'\s*;\s*(DROP|DELETE|UPDATE|INSERT)/gi, // Chained statements
        /\$where/gi, // MongoDB $where
        /\$gt|\$lt|\$gte|\$lte|\$ne|\$in|\$nin|\$or|\$and/gi, // MongoDB operators
        /\{\s*"\$/gi, // JSON injection for NoSQL
    ];

    return patterns.some(pattern => pattern.test(text));
};

/**
 * Sanitize input for use in database queries
 * Note: This is a fallback - always use parameterized queries
 */
export const sanitizeForDatabase = (text: string): string => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        // Remove null bytes
        .replace(/\0/g, '')
        // Escape quotes
        .replace(/'/g, "''")
        .replace(/"/g, '\\"')
        // Remove semicolons at end
        .replace(/;\s*$/, '')
        // Remove comment patterns
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '');
};

// ============================================
// Path Traversal Prevention
// ============================================

/**
 * Check for path traversal attempts
 */
export const containsPathTraversal = (path: string): boolean => {
    if (!path || typeof path !== 'string') {
        return false;
    }

    const patterns = [
        /\.\./g, // Directory traversal
        /~\//g, // Home directory
        /%2e%2e/gi, // URL encoded ..
        /%252e%252e/gi, // Double encoded ..
        /\.\.%2f/gi, // Mixed encoding
        /%2f\.\./gi, // Mixed encoding
        /\.\.\\/g, // Windows path traversal
        /%5c/gi, // URL encoded backslash
    ];

    return patterns.some(pattern => pattern.test(path));
};

/**
 * Sanitize a filename to prevent path traversal
 */
export const sanitizeFilename = (filename: string): string => {
    if (!filename || typeof filename !== 'string') {
        return 'unnamed';
    }

    return filename
        // Remove path separators
        .replace(/[/\\]/g, '')
        // Remove directory traversal
        .replace(/\.\./g, '')
        // Remove null bytes
        .replace(/\0/g, '')
        // Remove special characters
        .replace(/[<>:"|?*]/g, '')
        // Limit length
        .slice(0, 255)
        .trim() || 'unnamed';
};

// ============================================
// Enhanced Input Validation
// ============================================

/**
 * Validate and sanitize a generic text input with security checks
 */
export const validateSecureInput = (
    text: string,
    options: {
        maxLength?: number;
        allowHtml?: boolean;
        allowNewlines?: boolean;
        fieldName?: string;
    } = {}
): { valid: boolean; sanitized: string; error?: string; securityWarning?: string } => {
    const {
        maxLength = 1000,
        allowHtml = false,
        allowNewlines = true,
        fieldName = 'Input',
    } = options;

    if (!text || typeof text !== 'string') {
        return { valid: false, sanitized: '', error: `${fieldName} is required` };
    }

    let sanitized = text;

    // Check for injection attempts
    if (containsScriptInjection(sanitized)) {
        return {
            valid: false,
            sanitized: '',
            error: `${fieldName} contains invalid content`,
            securityWarning: 'XSS injection attempt detected',
        };
    }

    if (containsSqlInjection(sanitized)) {
        return {
            valid: false,
            sanitized: '',
            error: `${fieldName} contains invalid characters`,
            securityWarning: 'SQL injection attempt detected',
        };
    }

    // Sanitize based on options
    if (!allowHtml) {
        sanitized = escapeHtml(sanitized);
    }

    if (!allowNewlines) {
        sanitized = sanitized.replace(/[\r\n]/g, ' ');
    }

    // Apply general sanitization
    sanitized = sanitizeText(sanitized);

    // Check length
    if (sanitized.length > maxLength) {
        return {
            valid: false,
            sanitized: sanitized.slice(0, maxLength),
            error: `${fieldName} exceeds maximum length of ${maxLength} characters`,
        };
    }

    if (sanitized.length === 0) {
        return { valid: false, sanitized: '', error: `${fieldName} cannot be empty` };
    }

    return { valid: true, sanitized };
};

/**
 * Validate numeric input
 */
export const validateNumber = (
    value: unknown,
    options: {
        min?: number;
        max?: number;
        integer?: boolean;
        fieldName?: string;
    } = {}
): { valid: boolean; value: number | null; error?: string } => {
    const {
        min = -Infinity,
        max = Infinity,
        integer = false,
        fieldName = 'Value',
    } = options;

    if (value === null || value === undefined || value === '') {
        return { valid: false, value: null, error: `${fieldName} is required` };
    }

    const num = typeof value === 'number' ? value : parseFloat(String(value));

    if (isNaN(num)) {
        return { valid: false, value: null, error: `${fieldName} must be a valid number` };
    }

    if (!isFinite(num)) {
        return { valid: false, value: null, error: `${fieldName} must be a finite number` };
    }

    if (integer && !Number.isInteger(num)) {
        return { valid: false, value: null, error: `${fieldName} must be a whole number` };
    }

    if (num < min) {
        return { valid: false, value: null, error: `${fieldName} must be at least ${min}` };
    }

    if (num > max) {
        return { valid: false, value: null, error: `${fieldName} must be at most ${max}` };
    }

    return { valid: true, value: num };
};

/**
 * Validate date input
 */
export const validateDate = (
    value: string | Date,
    options: {
        minDate?: Date;
        maxDate?: Date;
        fieldName?: string;
    } = {}
): { valid: boolean; date: Date | null; error?: string } => {
    const { minDate, maxDate, fieldName = 'Date' } = options;

    if (!value) {
        return { valid: false, date: null, error: `${fieldName} is required` };
    }

    let date: Date;
    if (value instanceof Date) {
        date = value;
    } else {
        date = new Date(value);
    }

    if (isNaN(date.getTime())) {
        return { valid: false, date: null, error: `${fieldName} is not a valid date` };
    }

    if (minDate && date < minDate) {
        return { valid: false, date: null, error: `${fieldName} must be after ${minDate.toISOString()}` };
    }

    if (maxDate && date > maxDate) {
        return { valid: false, date: null, error: `${fieldName} must be before ${maxDate.toISOString()}` };
    }

    return { valid: true, date };
};

/**
 * Rate limit check helper (for client-side rate limiting)
 */
interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    key: string;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const checkRateLimit = (config: RateLimitConfig): { allowed: boolean; retryAfter?: number } => {
    const { maxRequests, windowMs, key } = config;
    const now = Date.now();

    const stored = rateLimitStore.get(key);

    if (!stored || now >= stored.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
    }

    if (stored.count >= maxRequests) {
        const retryAfter = Math.ceil((stored.resetAt - now) / 1000);
        return { allowed: false, retryAfter };
    }

    stored.count++;
    return { allowed: true };
};

/**
 * Clear rate limit for a key (e.g., after successful auth)
 */
export const clearRateLimit = (key: string): void => {
    rateLimitStore.delete(key);
};
