/**
 * Security Service for Somnia.ai
 * Handles AES-GCM encryption/decryption of user data for secure exports.
 */

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
        binary += String.fromCharCode(bytes[i]);
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
