/**
 * Mock for capacitor-native-biometric
 * Used in test environment where native plugins aren't available
 */

export const BiometricAuth = {
    isAvailable: async (): Promise<{ isAvailable: boolean; biometryType: string }> => {
        return { isAvailable: false, biometryType: 'none' };
    },
    verifyIdentity: async (_options: { reason: string }): Promise<boolean> => {
        return false;
    },
    setCredentials: async (_options: { username: string; password: string; server: string }): Promise<void> => {
        // No-op in tests
    },
    getCredentials: async (_options: { server: string }): Promise<{ username: string; password: string }> => {
        throw new Error('No credentials stored');
    },
    deleteCredentials: async (_options: { server: string }): Promise<void> => {
        // No-op in tests
    },
};

export const NativeBiometric = BiometricAuth;
