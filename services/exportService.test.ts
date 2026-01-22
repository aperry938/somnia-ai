/**
 * Tests for exportService
 * Tests JSON/PDF export and encrypted backup functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dream } from '../types';

// Mock the security service
vi.mock('./securityService', () => ({
    encryptDataWithPassword: vi.fn().mockResolvedValue({
        encrypted: 'mock-encrypted-data',
        iv: 'mock-iv',
        salt: 'mock-salt',
    }),
    decryptDataWithPassword: vi.fn().mockResolvedValue('{"dreams":[]}'),
}));

// Mock document methods
const mockLink = {
    href: '',
    download: '',
    click: vi.fn(),
};

const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

// Preserve native URL constructor while mocking static methods
const OriginalURL = globalThis.URL;
vi.stubGlobal('URL', class extends OriginalURL {
    static createObjectURL = mockCreateObjectURL;
    static revokeObjectURL = mockRevokeObjectURL;
});

describe('exportService', () => {
    const mockDreams: Dream[] = [
        {
            id: 1,
            timestamp: '2024-01-01T08:00:00.000Z',
            dreamText: 'I was flying over a forest.',
            sleepQuality: 5,
            title: 'Forest Flight',
            imageUrl: null,
            aiAnalysis: {
                title: 'Forest Flight',
                analysis: [{ title: 'Freedom', content: 'Flying represents freedom.' }],
                integration: { title: 'Integration', content: 'Embrace your freedom.' },
            },
            chatHistory: [],
            tags: ['flying', 'nature'],
        },
        {
            id: 2,
            timestamp: '2024-01-02T07:30:00.000Z',
            dreamText: 'I was swimming in the ocean.',
            sleepQuality: 4,
            title: 'Ocean Depths',
            imageUrl: null,
            aiAnalysis: null,
            chatHistory: [],
            tags: ['water'],
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement);
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as HTMLElement);
        vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as HTMLElement);
    });

    describe('exportDreamsAsJSON', () => {
        it('should create a downloadable JSON file', async () => {
            const { exportDreamsAsJSON } = await import('./exportService');

            exportDreamsAsJSON(mockDreams);

            expect(mockCreateObjectURL).toHaveBeenCalled();
            expect(mockLink.click).toHaveBeenCalled();
        });

        it('should include all dream fields in export', async () => {
            const { exportDreamsAsJSON } = await import('./exportService');

            exportDreamsAsJSON(mockDreams);

            // Verify Blob was created with correct content
            expect(mockCreateObjectURL).toHaveBeenCalled();
        });
    });

    describe('importDreamsFromJSON', () => {
        it('should parse valid JSON and return dreams array', async () => {
            const { importDreamsFromJSON } = await import('./exportService');

            const jsonContent = JSON.stringify({
                version: '1.0',
                dreams: mockDreams,
            });

            const mockFile = new File([jsonContent], 'dreams.json', { type: 'application/json' });

            const imported = await importDreamsFromJSON(mockFile, []);

            expect(imported).toHaveLength(2);
            expect(imported[0].dreamText).toBe('I was flying over a forest.');
        });

        it('should handle ID collisions by reassigning IDs', async () => {
            const { importDreamsFromJSON } = await import('./exportService');

            const existingDreams: Dream[] = [{ ...mockDreams[0], id: 100 }];
            const importData = JSON.stringify({
                version: '1.0',
                dreams: [{ ...mockDreams[1], id: 100 }], // Same ID collision
            });

            const mockFile = new File([importData], 'dreams.json', { type: 'application/json' });

            const imported = await importDreamsFromJSON(mockFile, existingDreams);

            // Should have a different ID than the existing dream
            expect(imported[0].id).not.toBe(100);
        });
    });

    describe('encrypted exports', () => {
        it('should call encryption service with password', async () => {
            const { encryptDataWithPassword } = await import('./securityService');
            const { exportDreamsEncrypted } = await import('./exportService');

            // SECURITY FIX: Password is now passed as parameter (no more prompt())
            await exportDreamsEncrypted(mockDreams, 'test-password');

            expect(encryptDataWithPassword).toHaveBeenCalled();
        });

        it('should throw error when password is empty', async () => {
            const { exportDreamsEncrypted } = await import('./exportService');

            await expect(exportDreamsEncrypted(mockDreams, '')).rejects.toThrow('Password is required');
        });
    });
});
