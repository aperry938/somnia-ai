// constants/dreamPatterns.ts
import { Dream } from '../types';

interface PatternMatch {
    pattern: string;
    occurrences: number;
    dreamIds: number[];
    lastOccurrence: string;
}

/**
 * Common dream pattern keywords to detect
 */
const PATTERN_KEYWORDS = [
    // Locations
    'house', 'home', 'school', 'work', 'office', 'beach', 'forest', 'city', 'road', 'car',
    // People
    'family', 'friend', 'stranger', 'mother', 'father', 'child', 'partner',
    // Actions
    'flying', 'falling', 'running', 'chasing', 'hiding', 'fighting', 'swimming',
    // Emotions
    'scared', 'happy', 'lost', 'confused', 'peaceful', 'anxious',
    // Themes
    'death', 'water', 'fire', 'animals', 'teeth', 'naked', 'exam', 'late'
];

/**
 * Detect recurring patterns across dreams
 * Returns patterns that appear in 2+ dreams
 */
export const detectRecurringPatterns = (dreams: Dream[]): PatternMatch[] => {
    const patternMap = new Map<string, { dreamIds: number[]; lastDate: string }>();

    dreams.forEach(dream => {
        const text = (dream.dreamText + ' ' + (dream.title || '')).toLowerCase();

        PATTERN_KEYWORDS.forEach(keyword => {
            if (text.includes(keyword)) {
                const existing = patternMap.get(keyword);
                if (existing) {
                    if (!existing.dreamIds.includes(dream.id)) {
                        existing.dreamIds.push(dream.id);
                    }
                } else {
                    patternMap.set(keyword, {
                        dreamIds: [dream.id],
                        lastDate: dream.timestamp
                    });
                }
            }
        });
    });

    // Only return patterns with 2+ occurrences, sorted by frequency
    return Array.from(patternMap.entries())
        .filter(([, data]) => data.dreamIds.length >= 2)
        .map(([pattern, data]) => ({
            pattern,
            occurrences: data.dreamIds.length,
            dreamIds: data.dreamIds,
            lastOccurrence: data.lastDate
        }))
        .sort((a, b) => b.occurrences - a.occurrences);
};

/**
 * Get pattern display name (capitalize first letter)
 */
export const formatPatternName = (pattern: string): string => {
    return pattern.charAt(0).toUpperCase() + pattern.slice(1);
};
