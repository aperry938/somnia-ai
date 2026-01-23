/**
 * Mock for capacitor-secure-storage-plugin
 * Used in test environment where native plugins aren't available
 */

export const SecureStoragePlugin = {
    get: async (_options: { key: string; service: string }): Promise<{ value: string }> => {
        throw new Error('Key not found');
    },
    set: async (_options: { key: string; value: string; service: string }): Promise<void> => {
        // No-op in tests
    },
    remove: async (_options: { key: string; service: string }): Promise<void> => {
        // No-op in tests
    },
    clear: async (_options: { service: string }): Promise<void> => {
        // No-op in tests
    },
};
