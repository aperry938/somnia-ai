/**
 * Gemini Service Tests
 * Tests for AI-powered dream analysis utilities and error classes
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// Note: Due to module mocking complexity with dynamic imports,
// we test the exportable utilities and error classes directly
// Integration tests should be used for full API flow testing

// Import once at module level to avoid timeout issues
let geminiService: typeof import('./geminiService') | null = null;

async function getGeminiService() {
    if (!geminiService) {
        geminiService = await import('./geminiService');
    }
    return geminiService;
}

describe('geminiService - Error Classes', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('NoCreditsError', () => {
        it('should have correct name and message', async () => {
            const { NoCreditsError } = await getGeminiService();
            const error = new NoCreditsError();

            expect(error.name).toBe('NoCreditsError');
            expect(error.message).toContain('Daily AI limit reached');
            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('OfflineError', () => {
        it('should have correct name and message', async () => {
            const { OfflineError } = await getGeminiService();
            const error = new OfflineError();

            expect(error.name).toBe('OfflineError');
            expect(error.message).toContain('offline');
            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('AITimeoutError', () => {
        it('should include operation and timeout in message', async () => {
            const { AITimeoutError } = await getGeminiService();
            const error = new AITimeoutError('analysis', 30000);

            expect(error.name).toBe('AITimeoutError');
            expect(error.message).toContain('analysis');
            expect(error.message).toContain('30 seconds');
            expect(error).toBeInstanceOf(Error);
        });

        it('should handle different timeout values', async () => {
            const { AITimeoutError } = await getGeminiService();
            const error = new AITimeoutError('chat', 60000);

            expect(error.message).toContain('chat');
            expect(error.message).toContain('60 seconds');
        });
    });

    describe('ContentFilterError', () => {
        it('should have correct name and message', async () => {
            const { ContentFilterError } = await getGeminiService();
            const error = new ContentFilterError();

            expect(error.name).toBe('ContentFilterError');
            expect(error.message).toContain('filtered for safety');
            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('ResponseTooLargeError', () => {
        it('should have correct name and message', async () => {
            const { ResponseTooLargeError } = await getGeminiService();
            const error = new ResponseTooLargeError();

            expect(error.name).toBe('ResponseTooLargeError');
            expect(error.message).toContain('exceeded maximum size');
            expect(error).toBeInstanceOf(Error);
        });
    });
});

describe('geminiService - DREAM_ART_STYLES', () => {
    it('should have all expected art styles defined', async () => {
        const { DREAM_ART_STYLES } = await getGeminiService();

        const expectedStyles = [
            'surreal',
            'watercolor',
            'oil-painting',
            'anime',
            'photorealistic',
            'abstract',
            'fantasy',
            'minimalist',
        ];

        expectedStyles.forEach((style) => {
            const artStyle = DREAM_ART_STYLES[style as keyof typeof DREAM_ART_STYLES];
            expect(artStyle).toBeDefined();
            expect(artStyle.name).toBeTruthy();
            expect(artStyle.prompt).toBeTruthy();
            expect(typeof artStyle.name).toBe('string');
            expect(typeof artStyle.prompt).toBe('string');
        });
    });

    it('should have unique names for each style', async () => {
        const { DREAM_ART_STYLES } = await getGeminiService();

        const names = Object.values(DREAM_ART_STYLES).map(style => style.name);
        const uniqueNames = new Set(names);

        expect(uniqueNames.size).toBe(names.length);
    });

    it('should have prompts with sufficient length', async () => {
        const { DREAM_ART_STYLES } = await getGeminiService();

        // Each prompt should contain sufficient artistic direction
        Object.values(DREAM_ART_STYLES).forEach(style => {
            expect(style.prompt.length).toBeGreaterThan(20);
            // Prompts should be meaningful (not empty or trivial)
            expect(style.prompt.trim().length).toBeGreaterThan(15);
        });
    });
});

describe('geminiService - findSimilarDreams', () => {
    it('should return empty array when no dreams have embeddings', async () => {
        const { findSimilarDreams } = await getGeminiService();

        const targetEmbedding = new Array(768).fill(0.5);
        const dreams = [
            { id: 1, dreamText: 'Dream 1', title: 'No Embedding', timestamp: new Date().toISOString() },
            { id: 2, dreamText: 'Dream 2', title: 'Also No Embedding', timestamp: new Date().toISOString() },
        ];

        const similar = findSimilarDreams(targetEmbedding, dreams, 0.75, 5);

        expect(similar).toHaveLength(0);
    });

    it('should find similar dreams based on cosine similarity', async () => {
        const { findSimilarDreams } = await getGeminiService();

        const targetEmbedding = new Array(768).fill(0.5);

        const dreams = [
            {
                id: 1,
                dreamText: 'Dream 1',
                title: 'Very Similar',
                timestamp: new Date().toISOString(),
                embedding: new Array(768).fill(0.5), // Identical = similarity 1.0
            },
            {
                id: 2,
                dreamText: 'Dream 2',
                title: 'Different',
                timestamp: new Date().toISOString(),
                embedding: new Array(768).fill(-0.5), // Opposite = similarity -1.0
            },
        ];

        const similar = findSimilarDreams(targetEmbedding, dreams, 0.5, 5);

        expect(similar.length).toBeGreaterThanOrEqual(1);
        expect(similar[0]?.id).toBe(1); // Most similar should be first
        expect(similar[0]?.similarity).toBeGreaterThan(0.9);
    });

    it('should respect the threshold parameter for dissimilar dreams', async () => {
        const { findSimilarDreams } = await getGeminiService();

        // Create a target embedding
        const targetEmbedding = new Array(768).fill(0).map((_, i) => i / 768);

        // Create a dream with a very different embedding to get low similarity
        const dreams = [
            {
                id: 1,
                dreamText: 'Dream 1',
                title: 'Low Similarity Dream',
                timestamp: new Date().toISOString(),
                // Reverse pattern to get lower cosine similarity
                embedding: new Array(768).fill(0).map((_, i) => (768 - i) / 768 * 0.3),
            },
        ];

        // First, let's check what similarity we actually get
        const allResults = findSimilarDreams(targetEmbedding, dreams, 0.0, 5);
        const actualSimilarity = allResults[0]?.similarity ?? 0;

        // Now test threshold behavior
        // If similarity is below 0.8, high threshold should filter it out
        const highThreshold = findSimilarDreams(targetEmbedding, dreams, actualSimilarity + 0.1, 5);
        expect(highThreshold.length).toBe(0);

        // Low threshold should include it
        const lowThreshold = findSimilarDreams(targetEmbedding, dreams, actualSimilarity - 0.1, 5);
        expect(lowThreshold.length).toBe(1);
    });

    it('should limit results to maxResults', async () => {
        const { findSimilarDreams } = await getGeminiService();

        const targetEmbedding = new Array(768).fill(0.5);
        const dreams = Array.from({ length: 10 }, (_, i) => ({
            id: i,
            dreamText: `Dream ${i}`,
            title: `Title ${i}`,
            timestamp: new Date().toISOString(),
            embedding: new Array(768).fill(0.5),
        }));

        const limited = findSimilarDreams(targetEmbedding, dreams, 0.5, 3);

        expect(limited.length).toBeLessThanOrEqual(3);
    });

    it('should sort by similarity descending', async () => {
        const { findSimilarDreams } = await getGeminiService();

        const targetEmbedding = new Array(768).fill(0.5);

        // Create dreams with decreasing similarity
        const dreams = [
            {
                id: 1,
                dreamText: 'Dream 1',
                title: 'Most Similar',
                timestamp: new Date().toISOString(),
                embedding: new Array(768).fill(0.5),
            },
            {
                id: 2,
                dreamText: 'Dream 2',
                title: 'Less Similar',
                timestamp: new Date().toISOString(),
                embedding: new Array(768).fill(0.3),
            },
            {
                id: 3,
                dreamText: 'Dream 3',
                title: 'Least Similar',
                timestamp: new Date().toISOString(),
                embedding: new Array(768).fill(0.1),
            },
        ];

        const sorted = findSimilarDreams(targetEmbedding, dreams, 0.1, 5);

        // Should be sorted by similarity descending
        for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1]?.similarity).toBeGreaterThanOrEqual(sorted[i]?.similarity ?? 0);
        }
    });

    it('should handle empty dreams array', async () => {
        const { findSimilarDreams } = await getGeminiService();

        const targetEmbedding = new Array(768).fill(0.5);
        const similar = findSimilarDreams(targetEmbedding, [], 0.75, 5);

        expect(similar).toHaveLength(0);
    });

    it('should filter out dreams with wrong embedding dimension', async () => {
        const { findSimilarDreams } = await getGeminiService();

        const targetEmbedding = new Array(768).fill(0.5);
        const dreams = [
            {
                id: 1,
                dreamText: 'Dream 1',
                title: 'Wrong Dimension',
                timestamp: new Date().toISOString(),
                embedding: new Array(512).fill(0.5), // Wrong size
            },
        ];

        const similar = findSimilarDreams(targetEmbedding, dreams, 0.5, 5);

        expect(similar).toHaveLength(0);
    });
});

describe('geminiService - Cache Functions', () => {
    it('cacheDreamTitle should be a function', async () => {
        const { cacheDreamTitle } = await getGeminiService();
        expect(typeof cacheDreamTitle).toBe('function');
    });

    it('cacheDreamEmbedding should be a function', async () => {
        const { cacheDreamEmbedding } = await getGeminiService();
        expect(typeof cacheDreamEmbedding).toBe('function');
    });
});

describe('geminiService - Type exports', () => {
    it('DreamArtStyle type should match expected values', async () => {
        const { DREAM_ART_STYLES } = await getGeminiService();

        // Verify the type covers all expected keys
        const keys = Object.keys(DREAM_ART_STYLES);
        expect(keys).toContain('surreal');
        expect(keys).toContain('watercolor');
        expect(keys).toContain('oil-painting');
        expect(keys).toContain('anime');
        expect(keys).toContain('photorealistic');
        expect(keys).toContain('abstract');
        expect(keys).toContain('fantasy');
        expect(keys).toContain('minimalist');
        expect(keys.length).toBe(8);
    });
});
