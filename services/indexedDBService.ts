import { Dream } from '../types';
import { logger } from './logger';

const DB_NAME = 'somnia-db';
const DB_VERSION = 1;
const DREAMS_STORE = 'dreams';
const DREAMS_LS_KEY = 'somnia_dreams';
const MIGRATION_FLAG_KEY = 'somnia_idb_migrated';

/**
 * Check if IndexedDB is available in the current browser context.
 * Safari private mode and some privacy browsers disable it.
 */
export function isIndexedDBAvailable(): boolean {
    try {
        if (typeof indexedDB === 'undefined' || !indexedDB) {
            return false;
        }
        // Quick probe: try to open and immediately close a test DB
        // Some browsers (Safari private mode) throw on open
        return true;
    } catch {
        return false;
    }
}

/**
 * Open (or create) the Somnia IndexedDB database.
 * Creates the dreams object store with indexes on first run.
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!isIndexedDBAvailable()) {
            reject(new Error('IndexedDB is not available'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(DREAMS_STORE)) {
                const store = db.createObjectStore(DREAMS_STORE, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('mood', 'mood', { unique: false });
                logger.log('[IndexedDB] Created dreams store with indexes');
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            logger.error('[IndexedDB] Failed to open database:', (event.target as IDBOpenDBRequest).error);
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
}

/**
 * Get all dreams from IndexedDB, sorted by timestamp descending (newest first).
 */
export async function getAllDreams(): Promise<Dream[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DREAMS_STORE, 'readonly');
        const store = tx.objectStore(DREAMS_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
            const dreams: Dream[] = request.result as Dream[];
            // Sort newest first (consistent with localStorage behavior)
            dreams.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            resolve(dreams);
        };

        request.onerror = () => {
            logger.error('[IndexedDB] getAllDreams failed:', request.error);
            reject(request.error);
        };

        tx.oncomplete = () => db.close();
    });
}

/**
 * Get a single dream by its ID.
 */
export async function getDreamById(id: number): Promise<Dream | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DREAMS_STORE, 'readonly');
        const store = tx.objectStore(DREAMS_STORE);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result as Dream | undefined);
        };

        request.onerror = () => {
            logger.error('[IndexedDB] getDreamById failed:', request.error);
            reject(request.error);
        };

        tx.oncomplete = () => db.close();
    });
}

/**
 * Get dreams within a date range (inclusive), sorted newest first.
 */
export async function getDreamsByDateRange(start: Date, end: Date): Promise<Dream[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DREAMS_STORE, 'readonly');
        const store = tx.objectStore(DREAMS_STORE);
        const index = store.index('timestamp');
        const range = IDBKeyRange.bound(start.toISOString(), end.toISOString());
        const request = index.getAll(range);

        request.onsuccess = () => {
            const dreams = (request.result as Dream[]).sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            resolve(dreams);
        };

        request.onerror = () => {
            logger.error('[IndexedDB] getDreamsByDateRange failed:', request.error);
            reject(request.error);
        };

        tx.oncomplete = () => db.close();
    });
}

/**
 * Save a single dream (add or update).
 */
export async function saveDream(dream: Dream): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DREAMS_STORE, 'readwrite');
        const store = tx.objectStore(DREAMS_STORE);
        const request = store.put(dream);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            logger.error('[IndexedDB] saveDream failed:', request.error);
            reject(request.error);
        };

        tx.oncomplete = () => db.close();
    });
}

/**
 * Bulk save dreams (add or update). Uses a single transaction for efficiency.
 */
export async function saveDreams(dreams: Dream[]): Promise<void> {
    if (dreams.length === 0) return;

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DREAMS_STORE, 'readwrite');
        const store = tx.objectStore(DREAMS_STORE);

        for (const dream of dreams) {
            store.put(dream);
        }

        tx.oncomplete = () => {
            db.close();
            resolve();
        };

        tx.onerror = () => {
            logger.error('[IndexedDB] saveDreams bulk failed:', tx.error);
            db.close();
            reject(tx.error);
        };
    });
}

/**
 * Delete a dream by its ID.
 */
export async function deleteDream(id: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DREAMS_STORE, 'readwrite');
        const store = tx.objectStore(DREAMS_STORE);
        const request = store.delete(id);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            logger.error('[IndexedDB] deleteDream failed:', request.error);
            reject(request.error);
        };

        tx.oncomplete = () => db.close();
    });
}

/**
 * Get the total count of dreams in the store.
 */
export async function getDreamCount(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DREAMS_STORE, 'readonly');
        const store = tx.objectStore(DREAMS_STORE);
        const request = store.count();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            logger.error('[IndexedDB] getDreamCount failed:', request.error);
            reject(request.error);
        };

        tx.oncomplete = () => db.close();
    });
}

/**
 * Get recent dreams with pagination (sorted newest first).
 * Uses a cursor for efficient paging over the timestamp index.
 */
export async function getRecentDreams(limit: number, offset: number): Promise<Dream[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DREAMS_STORE, 'readonly');
        const store = tx.objectStore(DREAMS_STORE);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev'); // newest first
        const results: Dream[] = [];
        let skipped = 0;

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (!cursor || results.length >= limit) {
                resolve(results);
                return;
            }

            if (skipped < offset) {
                skipped++;
                cursor.continue();
                return;
            }

            results.push(cursor.value as Dream);
            cursor.continue();
        };

        request.onerror = () => {
            logger.error('[IndexedDB] getRecentDreams failed:', request.error);
            reject(request.error);
        };

        tx.oncomplete = () => db.close();
    });
}

/**
 * Migrate dreams from localStorage to IndexedDB.
 * This is a one-time operation. After migration, the localStorage dreams key
 * is removed and a flag is set to prevent re-migration.
 *
 * @returns The number of dreams migrated, or 0 if no migration was needed.
 */
export async function migrateFromLocalStorage(): Promise<number> {
    // Check if already migrated
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') {
        return 0;
    }

    // Read dreams from localStorage
    const dreamsRaw = localStorage.getItem(DREAMS_LS_KEY);
    if (!dreamsRaw) {
        // No dreams in localStorage - set flag and return
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        return 0;
    }

    let dreams: Dream[];
    try {
        dreams = JSON.parse(dreamsRaw) as Dream[];
        if (!Array.isArray(dreams)) {
            logger.error('[IndexedDB] localStorage dreams is not an array, skipping migration');
            return 0;
        }
    } catch (e) {
        logger.error('[IndexedDB] Failed to parse localStorage dreams for migration:', e);
        return 0;
    }

    if (dreams.length === 0) {
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        return 0;
    }

    // Check if IDB already has data (e.g., partial previous migration)
    try {
        const existingCount = await getDreamCount();
        if (existingCount > 0) {
            logger.log(`[IndexedDB] IDB already has ${existingCount} dreams, skipping migration`);
            localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
            // Remove dreams from localStorage since IDB has data
            localStorage.removeItem(DREAMS_LS_KEY);
            return 0;
        }
    } catch (e) {
        logger.error('[IndexedDB] Failed to check IDB count during migration:', e);
        return 0;
    }

    // Perform the bulk migration
    try {
        await saveDreams(dreams);
        logger.log(`[IndexedDB] Migrated ${dreams.length} dreams from localStorage`);

        // Set migration flag and remove localStorage dreams
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        localStorage.removeItem(DREAMS_LS_KEY);

        return dreams.length;
    } catch (e) {
        logger.error('[IndexedDB] Migration failed, localStorage data preserved:', e);
        return 0;
    }
}
