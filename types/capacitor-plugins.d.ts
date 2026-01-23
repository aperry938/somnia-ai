// Type declarations for optional Capacitor plugins
// These plugins may not be installed, so dynamic imports with try/catch are used

declare module 'capacitor-native-biometric' {
    export interface Credentials {
        username: string;
        password: string;
    }

    export interface BiometricOptions {
        reason?: string;
        title?: string;
        subtitle?: string;
        description?: string;
        negativeButtonText?: string;
        maxAttempts?: number;
        useFallback?: boolean;
    }

    export interface AvailableResult {
        isAvailable: boolean;
        biometryType: number;
        errorCode?: number;
    }

    export interface NativeBiometricPlugin {
        isAvailable(): Promise<AvailableResult>;
        verifyIdentity(options?: BiometricOptions): Promise<void>;
        setCredentials(options: { username: string; password: string; server: string }): Promise<void>;
        getCredentials(options: { server: string }): Promise<Credentials>;
        deleteCredentials(options: { server: string }): Promise<void>;
    }

    export const NativeBiometric: NativeBiometricPlugin;
}

declare module 'capacitor-secure-storage-plugin' {
    export interface SecureStoragePluginPlugin {
        get(options: { key: string }): Promise<{ value: string }>;
        set(options: { key: string; value: string; service?: string }): Promise<void>;
        remove(options: { key: string }): Promise<void>;
        clear(): Promise<void>;
        keys(): Promise<{ value: string[] }>;
    }

    export const SecureStoragePlugin: SecureStoragePluginPlugin;
}
