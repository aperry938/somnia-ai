/**
 * Tests for Crisis Detection Service
 *
 * Ensures that crisis detection:
 * 1. Catches genuine crisis indicators
 * 2. Does NOT trigger false positives for benign dream content
 */

import { describe, it, expect } from 'vitest';
import { detectCrisis, hasCrisisIndicators } from './crisisDetectionService';

describe('crisisDetectionService', () => {
    describe('detectCrisis', () => {
        // ===== TRUE POSITIVES (should detect) =====
        describe('true positives - should detect crisis', () => {
            it('detects "I want to kill myself"', () => {
                const result = detectCrisis('I want to kill myself');
                expect(result.detected).toBe(true);
                expect(result.triggers).toContain('kill myself');
            });

            it('detects "I want to end my life"', () => {
                const result = detectCrisis('I want to end my life');
                expect(result.detected).toBe(true);
                expect(result.triggers).toContain('end my life');
            });

            it('detects "thinking about suicide"', () => {
                const result = detectCrisis('I keep thinking about suicide');
                expect(result.detected).toBe(true);
                expect(result.triggers).toContain('suicide');
            });

            it('detects "I want to hurt myself"', () => {
                const result = detectCrisis('I want to hurt myself');
                expect(result.detected).toBe(true);
                expect(result.triggers).toContain('hurt myself');
            });

            it('detects crisis at end of sentence', () => {
                const result = detectCrisis('In my dream, I wanted to kill myself.');
                expect(result.detected).toBe(true);
            });

            it('detects crisis with punctuation', () => {
                const result = detectCrisis('Should I kill myself?');
                expect(result.detected).toBe(true);
            });

            it('detects multiple triggers with high confidence', () => {
                const result = detectCrisis('I want to kill myself and end my life');
                expect(result.detected).toBe(true);
                expect(result.confidence).toBe('high');
                expect(result.triggers.length).toBeGreaterThan(1);
            });
        });

        // ===== FALSE POSITIVES (should NOT detect) =====
        describe('false positives - should NOT detect crisis', () => {
            it('does NOT trigger on "cutting myself a piece of cake"', () => {
                const result = detectCrisis('I was cutting myself a piece of cake in the dream');
                expect(result.detected).toBe(false);
            });

            it('does NOT trigger on "kill myself character" (gaming/fiction)', () => {
                const result = detectCrisis('The villain wanted to kill myself character in the game');
                expect(result.detected).toBe(false);
            });

            it('does NOT trigger on "hurt myself laughing"', () => {
                const result = detectCrisis('I was going to hurt myself laughing in the dream');
                expect(result.detected).toBe(false);
            });

            it('does NOT trigger on benign dream content', () => {
                const result = detectCrisis('I dreamed about flying over mountains and swimming with dolphins');
                expect(result.detected).toBe(false);
            });

            it('does NOT trigger on "end my life savings" (financial)', () => {
                const result = detectCrisis('I dreamed about having to end my life savings on a big purchase');
                expect(result.detected).toBe(false);
            });

            it('does NOT trigger on "suicidal mission" (action context)', () => {
                // Note: "suicidal" as standalone word SHOULD trigger for safety
                // This test documents current behavior - may need context analysis later
                const result = detectCrisis('The dream was about a suicidal mission in a war');
                // This WILL trigger because "suicidal" is a standalone trigger word
                expect(result.detected).toBe(true);
            });
        });

        // ===== EDGE CASES =====
        describe('edge cases', () => {
            it('handles empty string', () => {
                const result = detectCrisis('');
                expect(result.detected).toBe(false);
            });

            it('handles whitespace only', () => {
                const result = detectCrisis('   ');
                expect(result.detected).toBe(false);
            });

            it('is case insensitive', () => {
                const result = detectCrisis('I WANT TO KILL MYSELF');
                expect(result.detected).toBe(true);
            });

            it('handles mixed case', () => {
                const result = detectCrisis('Kill Myself');
                expect(result.detected).toBe(true);
            });
        });
    });

    describe('hasCrisisIndicators', () => {
        it('returns true for crisis content', () => {
            expect(hasCrisisIndicators('I want to kill myself')).toBe(true);
        });

        it('returns false for safe content', () => {
            expect(hasCrisisIndicators('I had a wonderful dream about flying')).toBe(false);
        });

        it('returns false for false positive content', () => {
            expect(hasCrisisIndicators('cutting myself a slice of pizza')).toBe(false);
        });
    });
});
