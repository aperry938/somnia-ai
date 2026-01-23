/**
 * Security Service for Somnia.ai
 * Handles AES-GCM encryption/decryption of user data for secure exports.
 * Includes secure keychain integration for mobile platforms.
 */

import { logger } from './logger';

// Keychain service identifier
const KEYCHAIN_SERVICE = 'com.somnia.dreamjournal';

// Secure storage keys
export const SECURE_STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    ENCRYPTION_KEY: 'encryption_key',
    BIOMETRIC_CREDENTIAL: 'biometric_credential',
} as const;

// Keychain plugin reference
let keychainPlugin: {
    get: (options: { key: string; service: string }) => Promise<{ value: string }>;
    set: (options: { key: string; value: string; service: string }) => Promise<void>;
    remove: (options: { key: string; service: string }) => Promise<void>;
    clear: (options: { service: string }) => Promise<void>;
} | null = null;

/**
 * Initialize secure storage (Keychain/Keystore)
 */
async function initSecureStorage(): Promise<boolean> {
    if (keychainPlugin) return true;

    try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.getPlatform() === 'web') {
            return false;
        }

        const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
        keychainPlugin = SecureStoragePlugin;
        return true;
    } catch {
        logger.info('Secure storage plugin not available, using fallback');
        return false;
    }
}

/**
 * Store value securely in Keychain/Keystore
 */
export async function secureSet(key: string, value: string): Promise<boolean> {
    try {
        const initialized = await initSecureStorage();

        if (initialized && keychainPlugin) {
            await keychainPlugin.set({
                key,
                value,
                service: KEYCHAIN_SERVICE,
            });
            return true;
        }

        // Fallback: Encrypt and store in localStorage
        const encryptedValue = await encryptForStorage(value);
        localStorage.setItem(`secure_${key}`, JSON.stringify(encryptedValue));
        return true;
    } catch (err) {
        logger.error('Failed to store secure value:', err);
        return false;
    }
}

/**
 * Retrieve value from Keychain/Keystore
 */
export async function secureGet(key: string): Promise<string | null> {
    try {
        const initialized = await initSecureStorage();

        if (initialized && keychainPlugin) {
            const result = await keychainPlugin.get({
                key,
                service: KEYCHAIN_SERVICE,
            });
            return result.value;
        }

        // Fallback: Decrypt from localStorage
        const stored = localStorage.getItem(`secure_${key}`);
        if (!stored) return null;

        const encryptedData = JSON.parse(stored);
        return await decryptFromStorage(encryptedData);
    } catch (err) {
        // Key not found is expected, don't log as error
        if ((err as Error).message?.includes('not found')) {
            return null;
        }
        logger.error('Failed to retrieve secure value:', err);
        return null;
    }
}

/**
 * Remove value from Keychain/Keystore
 */
export async function secureRemove(key: string): Promise<boolean> {
    try {
        const initialized = await initSecureStorage();

        if (initialized && keychainPlugin) {
            await keychainPlugin.remove({
                key,
                service: KEYCHAIN_SERVICE,
            });
        }

        // Also remove from localStorage fallback
        localStorage.removeItem(`secure_${key}`);
        return true;
    } catch (err) {
        logger.error('Failed to remove secure value:', err);
        return false;
    }
}

/**
 * Clear all secure storage
 */
export async function secureClear(): Promise<boolean> {
    try {
        const initialized = await initSecureStorage();

        if (initialized && keychainPlugin) {
            await keychainPlugin.clear({
                service: KEYCHAIN_SERVICE,
            });
        }

        // Clear localStorage fallback entries
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('secure_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        return true;
    } catch (err) {
        logger.error('Failed to clear secure storage:', err);
        return false;
    }
}

// Device-specific key for localStorage encryption fallback
let deviceKey: CryptoKey | null = null;

async function getDeviceKey(): Promise<CryptoKey> {
    if (deviceKey) return deviceKey;

    // Try to load existing key
    const storedKey = localStorage.getItem('device_key');
    if (storedKey) {
        try {
            deviceKey = await importKey(storedKey);
            return deviceKey;
        } catch {
            // Key corrupted, generate new one
        }
    }

    // Generate new device key
    deviceKey = await generateKey();
    const exported = await exportKey(deviceKey);
    localStorage.setItem('device_key', exported);

    return deviceKey;
}

async function encryptForStorage(value: string): Promise<{ encrypted: string; iv: string }> {
    const key = await getDeviceKey();
    return encryptData(value, key);
}

async function decryptFromStorage(data: { encrypted: string; iv: string }): Promise<string> {
    const key = await getDeviceKey();
    return decryptData(data.encrypted, data.iv, key);
}

// ============================================
// AES-GCM Encryption
// ============================================

export const generateKey = async (): Promise<CryptoKey> => {
    return window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
};

export const exportKey = async (key: CryptoKey): Promise<string> => {
    const exported = await window.crypto.subtle.exportKey("jwk", key);
    return JSON.stringify(exported);
};

export const importKey = async (jwkString: string): Promise<CryptoKey> => {
    const jwk = JSON.parse(jwkString);
    return window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "AES-GCM",
        },
        true,
        ["encrypt", "decrypt"]
    );
};

export const encryptData = async (data: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encodedData
    );

    return {
        encrypted: arrayBufferToBase64(encryptedBuffer),
        iv: arrayBufferToBase64(iv.buffer)
    };
};

export const decryptData = async (encryptedData: string, iv: string, key: CryptoKey): Promise<string> => {
    const encryptedBuffer = base64ToArrayBuffer(encryptedData);
    const ivBuffer = base64ToArrayBuffer(iv);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: ivBuffer
        },
        key,
        encryptedBuffer
    );

    return new TextDecoder().decode(decryptedBuffer);
};

// --- Password Based Encryption (PBKDF2 + AES-GCM) ---

const deriveKeyFromPassword = async (password: string, salt: Uint8Array, usage: KeyUsage[]): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        usage
    );
};

export const encryptDataWithPassword = async (data: string, password: string): Promise<{ encrypted: string; iv: string; salt: string }> => {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKeyFromPassword(password, salt, ["encrypt"]);
    const encodedData = new TextEncoder().encode(data);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encodedData
    );

    return {
        encrypted: arrayBufferToBase64(encryptedBuffer),
        iv: arrayBufferToBase64(iv.buffer),
        salt: arrayBufferToBase64(salt.buffer)
    };
};

export const decryptDataWithPassword = async (encryptedData: string, ivStr: string, saltStr: string, password: string): Promise<string> => {
    const encryptedBuffer = base64ToArrayBuffer(encryptedData);
    const iv = base64ToArrayBuffer(ivStr);
    const salt = base64ToArrayBuffer(saltStr);

    const key = await deriveKeyFromPassword(password, new Uint8Array(salt), ["decrypt"]);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        encryptedBuffer
    );

    return new TextDecoder().decode(decryptedBuffer);
};

// Helpers
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i] ?? 0);
    }
    return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
};

// ============================================
// Secure Data Validation
// ============================================

/**
 * Validate encrypted data structure before decryption
 */
export function validateEncryptedData(data: unknown): data is { encrypted: string; iv: string } {
    if (!data || typeof data !== 'object') return false;

    const d = data as Record<string, unknown>;

    if (typeof d.encrypted !== 'string' || d.encrypted.length === 0) return false;
    if (typeof d.iv !== 'string' || d.iv.length === 0) return false;

    // Validate base64 format
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(d.encrypted) || !base64Regex.test(d.iv)) return false;

    return true;
}

/**
 * Validate password-encrypted data structure
 */
export function validatePasswordEncryptedData(data: unknown): data is { encrypted: string; iv: string; salt: string } {
    if (!validateEncryptedData(data)) return false;

    const d = data as Record<string, unknown>;
    if (typeof d.salt !== 'string' || d.salt.length === 0) return false;

    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(d.salt)) return false;

    return true;
}

/**
 * Securely compare two strings in constant time
 * Prevents timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash data using SHA-256 (for integrity checks, not passwords)
 */
export async function hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    return arrayBufferToBase64(hashBuffer);
}

/**
 * Verify data integrity using hash
 */
export async function verifyDataIntegrity(data: string, expectedHash: string): Promise<boolean> {
    const computedHash = await hashData(data);
    return secureCompare(computedHash, expectedHash);
}

// ============================================
// Secure Memory Handling
// ============================================

/**
 * Securely clear a string from memory (best effort in JavaScript)
 * Note: JavaScript doesn't guarantee immediate garbage collection,
 * but this helps reduce the window of exposure
 */
export function secureClearString(value: string): void {
    // Overwrite the string reference (won't affect the actual memory)
    // This is a best-effort approach since strings are immutable in JS
    try {
        // Force the string to be dereferenced
        if (typeof value === 'string' && value.length > 0) {
            // Create new references to encourage garbage collection
            value = '';
            value = null as unknown as string;
        }
    } catch {
        // Ignore errors during cleanup
    }
}

/**
 * Securely clear an array buffer
 */
export function secureClearBuffer(buffer: ArrayBuffer | Uint8Array): void {
    try {
        const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        window.crypto.getRandomValues(view); // Overwrite with random data
        view.fill(0); // Then zero out
    } catch {
        // Ignore errors during cleanup
    }
}
