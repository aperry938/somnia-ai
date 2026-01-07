/**
 * Tests for validationService
 * Critical security tests for XSS prevention, input validation, and sanitization
 */

import { describe, it, expect } from 'vitest';
import {
    escapeHtml,
    sanitizeText,
    validateDreamText,
    validateEmail,
    validatePassword,
    validateSearchQuery,
    validateTags,
    validateTimeString,
    validateUrl,
    validateUUID,
    sanitizeForJson,
    containsScriptInjection,
    INPUT_LIMITS,
} from './validationService';

describe('validationService', () => {
    describe('escapeHtml', () => {
        it('should escape HTML special characters', () => {
            expect(escapeHtml('<script>alert("xss")</script>')).toBe(
                '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
            );
        });

        it('should escape ampersands', () => {
            expect(escapeHtml('a & b')).toBe('a &amp; b');
        });

        it('should escape single quotes', () => {
            expect(escapeHtml("it's")).toBe('it&#x27;s');
        });

        it('should handle empty string', () => {
            expect(escapeHtml('')).toBe('');
        });

        it('should not modify safe text', () => {
            expect(escapeHtml('Hello world 123')).toBe('Hello world 123');
        });

        it('should escape all dangerous characters in complex XSS payload', () => {
            const xss = '<img src=x onerror="alert(\'XSS\')">';
            const escaped = escapeHtml(xss);
            expect(escaped).not.toContain('<');
            expect(escaped).not.toContain('>');
            expect(escaped).not.toContain('"');
        });
    });

    describe('sanitizeText', () => {
        it('should remove control characters', () => {
            const withControl = 'hello\x00\x01\x02world';
            expect(sanitizeText(withControl)).toBe('helloworld');
        });

        it('should normalize multiple spaces', () => {
            expect(sanitizeText('hello    world')).toBe('hello world');
        });

        it('should normalize multiple newlines', () => {
            expect(sanitizeText('hello\n\n\n\nworld')).toBe('hello\n\nworld');
        });

        it('should preserve single newlines', () => {
            expect(sanitizeText('hello\nworld')).toBe('hello\nworld');
        });

        it('should trim whitespace', () => {
            expect(sanitizeText('  hello world  ')).toBe('hello world');
        });

        it('should preserve tabs and single newlines', () => {
            expect(sanitizeText('hello\tworld')).toBe('hello\tworld');
        });
    });

    describe('validateDreamText', () => {
        it('should accept valid dream text', () => {
            const result = validateDreamText('I had a dream about flying over mountains');
            expect(result.valid).toBe(true);
            expect(result.sanitized).toBe('I had a dream about flying over mountains');
        });

        it('should reject empty text', () => {
            const result = validateDreamText('');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Dream text is required');
        });

        it('should reject whitespace-only text', () => {
            const result = validateDreamText('   \n\n   ');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Dream text cannot be empty');
        });

        it('should reject text exceeding max length', () => {
            const longText = 'a'.repeat(INPUT_LIMITS.dreamText + 100);
            const result = validateDreamText(longText);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('exceeds maximum length');
            expect(result.sanitized.length).toBe(INPUT_LIMITS.dreamText);
        });

        it('should sanitize control characters', () => {
            const result = validateDreamText('dream\x00with\x01control');
            expect(result.valid).toBe(true);
            expect(result.sanitized).toBe('dreamwithcontrol');
        });

        it('should handle non-string input', () => {
            const result = validateDreamText(null as any);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Dream text is required');
        });
    });

    describe('validateEmail', () => {
        it('should accept valid email', () => {
            expect(validateEmail('user@example.com').valid).toBe(true);
        });

        it('should accept email with subdomain', () => {
            expect(validateEmail('user@mail.example.com').valid).toBe(true);
        });

        it('should accept email with plus sign', () => {
            expect(validateEmail('user+tag@example.com').valid).toBe(true);
        });

        it('should reject empty email', () => {
            const result = validateEmail('');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Email is required');
        });

        it('should reject email without @', () => {
            expect(validateEmail('userexample.com').valid).toBe(false);
        });

        it('should reject email without domain', () => {
            expect(validateEmail('user@').valid).toBe(false);
        });

        it('should reject email that is too long', () => {
            const longEmail = 'a'.repeat(250) + '@example.com';
            const result = validateEmail(longEmail);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Email is too long');
        });
    });

    describe('validatePassword', () => {
        it('should reject short password', () => {
            const result = validatePassword('short');
            expect(result.valid).toBe(false);
            expect(result.strength).toBe('weak');
        });

        it('should accept password with 8+ characters', () => {
            const result = validatePassword('password');
            expect(result.valid).toBe(true);
        });

        it('should rate weak password', () => {
            const result = validatePassword('password');
            expect(result.strength).toBe('weak');
        });

        it('should rate medium password', () => {
            const result = validatePassword('Password1');
            expect(result.strength).toBe('medium');
        });

        it('should rate strong password', () => {
            const result = validatePassword('MyP@ssword123!');
            expect(result.strength).toBe('strong');
        });

        it('should reject password that is too long', () => {
            const longPassword = 'A'.repeat(INPUT_LIMITS.password + 1);
            const result = validatePassword(longPassword);
            expect(result.valid).toBe(false);
        });
    });

    describe('validateSearchQuery', () => {
        it('should return sanitized query', () => {
            expect(validateSearchQuery('flying dreams')).toBe('flying dreams');
        });

        it('should remove dangerous characters', () => {
            expect(validateSearchQuery('test<script>')).toBe('testscript');
        });

        it('should truncate long queries', () => {
            const longQuery = 'a'.repeat(200);
            expect(validateSearchQuery(longQuery).length).toBe(INPUT_LIMITS.searchQuery);
        });

        it('should handle empty input', () => {
            expect(validateSearchQuery('')).toBe('');
        });

        it('should handle null input', () => {
            expect(validateSearchQuery(null as any)).toBe('');
        });
    });

    describe('validateTags', () => {
        it('should accept valid tags', () => {
            const tags = ['flying', 'water', 'nature'];
            expect(validateTags(tags)).toEqual(['flying', 'water', 'nature']);
        });

        it('should filter out empty tags', () => {
            const tags = ['flying', '', '  ', 'water'];
            expect(validateTags(tags)).toEqual(['flying', 'water']);
        });

        it('should limit number of tags', () => {
            const manyTags = Array(30).fill(0).map((_, i) => `tag${i}`);
            expect(validateTags(manyTags).length).toBe(INPUT_LIMITS.maxTags);
        });

        it('should truncate long tag names', () => {
            const longTag = 'a'.repeat(100);
            const result = validateTags([longTag]);
            expect(result[0].length).toBe(INPUT_LIMITS.tags);
        });

        it('should handle non-array input', () => {
            expect(validateTags('not-an-array' as any)).toEqual([]);
        });
    });

    describe('validateTimeString', () => {
        it('should accept valid 24-hour time', () => {
            expect(validateTimeString('08:30')).toBe(true);
            expect(validateTimeString('23:59')).toBe(true);
            expect(validateTimeString('00:00')).toBe(true);
        });

        it('should accept single-digit hours', () => {
            expect(validateTimeString('8:30')).toBe(true);
        });

        it('should reject invalid times', () => {
            expect(validateTimeString('25:00')).toBe(false);
            expect(validateTimeString('12:60')).toBe(false);
            expect(validateTimeString('invalid')).toBe(false);
        });

        it('should reject empty input', () => {
            expect(validateTimeString('')).toBe(false);
        });
    });

    describe('validateUrl', () => {
        it('should accept valid https URL', () => {
            expect(validateUrl('https://example.com')).toBe(true);
        });

        it('should accept valid http URL', () => {
            expect(validateUrl('http://example.com')).toBe(true);
        });

        it('should reject javascript: protocol', () => {
            expect(validateUrl('javascript:alert(1)')).toBe(false);
        });

        it('should reject data: protocol', () => {
            expect(validateUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
        });

        it('should reject invalid URLs', () => {
            expect(validateUrl('not-a-url')).toBe(false);
        });

        it('should reject empty input', () => {
            expect(validateUrl('')).toBe(false);
        });
    });

    describe('validateUUID', () => {
        it('should accept valid UUID v4', () => {
            expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        });

        it('should accept UUID v1', () => {
            expect(validateUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
        });

        it('should reject invalid UUID', () => {
            expect(validateUUID('not-a-uuid')).toBe(false);
            expect(validateUUID('12345678-1234-1234-1234-123456789012')).toBe(false);
        });

        it('should reject empty input', () => {
            expect(validateUUID('')).toBe(false);
        });
    });

    describe('sanitizeForJson', () => {
        it('should preserve simple objects', () => {
            const obj = { name: 'test', count: 42 };
            expect(sanitizeForJson(obj)).toEqual(obj);
        });

        it('should remove functions', () => {
            const obj = { name: 'test', fn: () => {} };
            const result = sanitizeForJson(obj);
            expect(result).not.toHaveProperty('fn');
        });

        it('should handle arrays', () => {
            const arr = [1, 2, 3];
            expect(sanitizeForJson(arr)).toEqual(arr);
        });

        it('should return original if serialization fails', () => {
            // Create circular reference
            const obj: any = { name: 'test' };
            obj.self = obj;
            const result = sanitizeForJson(obj);
            expect(result).toBe(obj);
        });
    });

    describe('containsScriptInjection', () => {
        it('should detect script tags', () => {
            expect(containsScriptInjection('<script>alert(1)</script>')).toBe(true);
        });

        it('should detect javascript: protocol', () => {
            expect(containsScriptInjection('javascript:alert(1)')).toBe(true);
        });

        it('should detect event handlers', () => {
            expect(containsScriptInjection('<img onerror=alert(1)>')).toBe(true);
            expect(containsScriptInjection('<div onclick=alert(1)>')).toBe(true);
        });

        it('should detect data: protocol', () => {
            expect(containsScriptInjection('data:text/html,<script>alert(1)</script>')).toBe(true);
        });

        it('should not flag safe text', () => {
            expect(containsScriptInjection('Hello world')).toBe(false);
            expect(containsScriptInjection('I had a dream about scripts')).toBe(false);
        });

        it('should handle empty input', () => {
            expect(containsScriptInjection('')).toBe(false);
        });
    });
});
