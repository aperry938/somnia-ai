/**
 * Generate cryptographically secure random ID.
 * Uses crypto.getRandomValues for unpredictable IDs instead of Date.now().
 * Returns a positive integer in the safe integer range.
 */
export const generateSecureId = (): number => {
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    return Math.abs(((array[0] ?? 0) * 0x100000000 + (array[1] ?? 0)) % Number.MAX_SAFE_INTEGER);
};
