import { Dream, SleepAids } from '../types';
import { logger } from './logger';

const CURRENT_MIGRATION_VERSION = 2;
const DREAMS_KEY = 'somnia_dreams';
const MIGRATION_LOG_KEY = 'somnia_migration_log';
const BACKUP_KEY_PREFIX = 'somnia_backup_v';
const MAX_BACKUPS = 3; // Keep last 3 backups for rollback

// Type for potentially incomplete dream data during migration
// Extended with migration-specific fields that may be added during migration
type PartialDream = Partial<Dream> & {
    id?: number;
    sleepAids?: SleepAids;
    tags?: string[];
    date?: number; // Legacy field that may exist in old data
    lastModified?: number; // Added in v2 migration
    syncStatus?: string; // Added in v2 migration
};

// Migration log structure
interface MigrationLog {
    version: number;
    timestamp: string;
    details: string;
    backupKey?: string;
    success: boolean;
    error?: string;
}

// Migration result
interface MigrationResult {
    success: boolean;
    version: number;
    changes: number;
    error?: string;
}

/**
 * Get the current migration version from storage
 */
const getCurrentVersion = (): number => {
    try {
        const logRaw = localStorage.getItem(MIGRATION_LOG_KEY);
        if (!logRaw) return 0;
        const log: MigrationLog = JSON.parse(logRaw);
        return log.version || 0;
    } catch {
        return 0;
    }
};

/**
 * Create a backup of current data before migration
 */
const createBackup = (version: number): string | null => {
    try {
        const dreamsRaw = localStorage.getItem(DREAMS_KEY);
        if (!dreamsRaw) return null;

        const backupKey = `${BACKUP_KEY_PREFIX}${version}_${Date.now()}`;
        localStorage.setItem(backupKey, dreamsRaw);

        // Clean up old backups (keep only MAX_BACKUPS)
        cleanupOldBackups();

        logger.log(`[Migration] Created backup: ${backupKey}`);
        return backupKey;
    } catch (e) {
        logger.error('[Migration] Failed to create backup:', e);
        return null;
    }
};

/**
 * Clean up old backups, keeping only the most recent ones
 */
const cleanupOldBackups = (): void => {
    try {
        const backups: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
                backups.push(key);
            }
        }

        // Sort by timestamp (embedded in key) descending
        backups.sort((a, b) => {
            const tsA = parseInt(a.split('_').pop() || '0', 10);
            const tsB = parseInt(b.split('_').pop() || '0', 10);
            return tsB - tsA;
        });

        // Remove old backups
        for (let i = MAX_BACKUPS; i < backups.length; i++) {
            const keyToRemove = backups[i];
            if (keyToRemove) {
                localStorage.removeItem(keyToRemove);
                logger.log(`[Migration] Removed old backup: ${keyToRemove}`);
            }
        }
    } catch (e) {
        logger.error('[Migration] Failed to cleanup backups:', e);
    }
};

/**
 * Get list of available backups for rollback
 */
export const getAvailableBackups = (): { key: string; version: number; timestamp: number }[] => {
    const backups: { key: string; version: number; timestamp: number }[] = [];

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
                const parts = key.replace(BACKUP_KEY_PREFIX, '').split('_');
                const version = parseInt(parts[0] || '0', 10);
                const timestamp = parseInt(parts[1] || '0', 10);
                backups.push({ key, version, timestamp });
            }
        }

        // Sort by timestamp descending (most recent first)
        backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
        logger.error('[Migration] Failed to get available backups:', e);
    }

    return backups;
};

/**
 * Rollback to a specific backup
 */
export const rollbackToBackup = (backupKey: string): { success: boolean; error?: string } => {
    try {
        const backupData = localStorage.getItem(backupKey);
        if (!backupData) {
            return { success: false, error: 'Backup not found' };
        }

        // Validate backup data
        const dreams = JSON.parse(backupData);
        if (!Array.isArray(dreams)) {
            return { success: false, error: 'Invalid backup data format' };
        }

        // Create a safety backup of current data before rollback
        const currentBackup = createBackup(getCurrentVersion());

        // Restore the backup
        localStorage.setItem(DREAMS_KEY, backupData);

        // Extract version from backup key
        const version = parseInt(backupKey.replace(BACKUP_KEY_PREFIX, '').split('_')[0] || '0', 10);

        // Update migration log
        localStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify({
            version: version,
            timestamp: new Date().toISOString(),
            details: `Rolled back from backup: ${backupKey}`,
            backupKey: currentBackup,
            success: true,
        }));

        logger.log(`[Migration] Rolled back to backup: ${backupKey}`);
        return { success: true };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        logger.error('[Migration] Rollback failed:', e);
        return { success: false, error };
    }
};

/**
 * Validate dream data integrity
 */
const validateDreamData = (dream: PartialDream): { valid: boolean; issues: string[] } => {
    const issues: string[] = [];

    if (!dream.id) {
        issues.push('Missing ID');
    }

    if (dream.dreamText !== undefined && typeof dream.dreamText !== 'string') {
        issues.push('Invalid dreamText type');
    }

    if (dream.tags !== undefined && !Array.isArray(dream.tags)) {
        issues.push('Tags is not an array');
    }

    if (dream.sleepAids !== undefined && typeof dream.sleepAids !== 'object') {
        issues.push('SleepAids is not an object');
    }

    return { valid: issues.length === 0, issues };
};

/**
 * Migration v1: Ensure basic fields exist
 */
const migrateToV1 = (dreams: PartialDream[]): { migrated: PartialDream[]; changes: number } => {
    let changes = 0;

    const migrated = dreams.map(dream => {
        const d = { ...dream };

        // Fix 1: Add ID if missing
        if (!d.id) {
            d.id = Date.now() + Math.random();
            changes++;
        }

        // Fix 2: Ensure SleepAids object
        if (!d.sleepAids) {
            d.sleepAids = {};
            changes++;
        }

        // Fix 3: Ensure tags array
        if (!d.tags) {
            d.tags = [];
            changes++;
        }

        return d;
    });

    return { migrated, changes };
};

/**
 * Migration v2: Add sync metadata and validate data integrity
 */
const migrateToV2 = (dreams: PartialDream[]): { migrated: PartialDream[]; changes: number } => {
    let changes = 0;

    const migrated = dreams.map(dream => {
        const d = { ...dream };

        // Add lastModified timestamp if missing
        if (!d.lastModified) {
            (d as Record<string, unknown>).lastModified = d.date || Date.now();
            changes++;
        }

        // Add syncStatus if missing (for offline-first support)
        if (!d.syncStatus) {
            (d as Record<string, unknown>).syncStatus = 'pending';
            changes++;
        }

        // Normalize tags to lowercase for consistent searching
        if (d.tags && Array.isArray(d.tags)) {
            const normalizedTags = d.tags.map(tag =>
                typeof tag === 'string' ? tag.trim().toLowerCase() : ''
            ).filter(tag => tag.length > 0);

            if (JSON.stringify(normalizedTags) !== JSON.stringify(d.tags)) {
                d.tags = normalizedTags;
                changes++;
            }
        }

        return d;
    });

    return { migrated, changes };
};

/**
 * Run a single migration step
 */
const runMigration = (
    fromVersion: number,
    dreams: PartialDream[]
): { migrated: PartialDream[]; changes: number; error?: string } => {
    switch (fromVersion) {
        case 0:
            return migrateToV1(dreams);
        case 1:
            return migrateToV2(dreams);
        default:
            return { migrated: dreams, changes: 0 };
    }
};

/**
 * Main migration function - checks and migrates data if needed
 */
export const checkAndMigrateData = (): MigrationResult => {
    try {
        const dreamsRaw = localStorage.getItem(DREAMS_KEY);
        if (!dreamsRaw) {
            return { success: true, version: CURRENT_MIGRATION_VERSION, changes: 0 };
        }

        let dreams: PartialDream[];
        try {
            dreams = JSON.parse(dreamsRaw);
        } catch (parseError) {
            logger.error('[Migration] Failed to parse dreams data:', parseError);
            return {
                success: false,
                version: 0,
                changes: 0,
                error: 'Failed to parse dreams data - data may be corrupted',
            };
        }

        if (!Array.isArray(dreams)) {
            return {
                success: false,
                version: 0,
                changes: 0,
                error: 'Dreams data is not an array',
            };
        }

        const currentVersion = getCurrentVersion();

        // Already at current version
        if (currentVersion >= CURRENT_MIGRATION_VERSION) {
            logger.log('[Migration] Data is up to date');
            return { success: true, version: currentVersion, changes: 0 };
        }

        // Create backup before any migrations
        const backupKey = createBackup(currentVersion);
        if (!backupKey && dreams.length > 0) {
            logger.warn('[Migration] Failed to create backup, proceeding with caution');
        }

        let totalChanges = 0;
        let migratedDreams = [...dreams];
        let lastSuccessfulVersion = currentVersion;

        // Run migrations sequentially
        for (let v = currentVersion; v < CURRENT_MIGRATION_VERSION; v++) {
            logger.log(`[Migration] Running migration v${v} -> v${v + 1}`);

            try {
                const result = runMigration(v, migratedDreams);

                if (result.error) {
                    throw new Error(result.error);
                }

                migratedDreams = result.migrated;
                totalChanges += result.changes;
                lastSuccessfulVersion = v + 1;

                logger.log(`[Migration] v${v + 1} complete: ${result.changes} changes`);
            } catch (migrationError) {
                const error = migrationError instanceof Error ? migrationError.message : 'Unknown error';
                logger.error(`[Migration] Failed at v${v + 1}:`, migrationError);

                // Save partial progress
                if (lastSuccessfulVersion > currentVersion) {
                    localStorage.setItem(DREAMS_KEY, JSON.stringify(migratedDreams));
                    localStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify({
                        version: lastSuccessfulVersion,
                        timestamp: new Date().toISOString(),
                        details: `Partial migration: stopped at v${v + 1}`,
                        backupKey,
                        success: false,
                        error,
                    }));
                }

                return {
                    success: false,
                    version: lastSuccessfulVersion,
                    changes: totalChanges,
                    error: `Migration failed at v${v + 1}: ${error}`,
                };
            }
        }

        // Validate migrated data
        let validationIssues = 0;
        for (const dream of migratedDreams) {
            const validation = validateDreamData(dream);
            if (!validation.valid) {
                logger.warn(`[Migration] Validation issues for dream ${dream.id}:`, validation.issues);
                validationIssues++;
            }
        }

        if (validationIssues > 0) {
            logger.warn(`[Migration] ${validationIssues} dreams have validation issues`);
        }

        // Save migrated data
        localStorage.setItem(DREAMS_KEY, JSON.stringify(migratedDreams));
        localStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify({
            version: CURRENT_MIGRATION_VERSION,
            timestamp: new Date().toISOString(),
            details: `Migrated from v${currentVersion} to v${CURRENT_MIGRATION_VERSION}. ${totalChanges} changes. ${validationIssues} validation warnings.`,
            backupKey,
            success: true,
        }));

        logger.log(`[Migration] Complete: v${currentVersion} -> v${CURRENT_MIGRATION_VERSION}, ${totalChanges} changes`);

        return {
            success: true,
            version: CURRENT_MIGRATION_VERSION,
            changes: totalChanges,
        };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        logger.error('[Migration] Fatal error:', e);
        return {
            success: false,
            version: getCurrentVersion(),
            changes: 0,
            error,
        };
    }
};

/**
 * Get migration status and history
 */
export const getMigrationStatus = (): {
    currentVersion: number;
    targetVersion: number;
    lastMigration: MigrationLog | null;
    availableBackups: number;
} => {
    let lastMigration: MigrationLog | null = null;

    try {
        const logRaw = localStorage.getItem(MIGRATION_LOG_KEY);
        if (logRaw) {
            lastMigration = JSON.parse(logRaw);
        }
    } catch {
        // Ignore parse errors
    }

    return {
        currentVersion: getCurrentVersion(),
        targetVersion: CURRENT_MIGRATION_VERSION,
        lastMigration,
        availableBackups: getAvailableBackups().length,
    };
};

/**
 * Force re-run all migrations (useful for debugging)
 */
export const forceMigration = (): MigrationResult => {
    // Reset version to 0 to force all migrations
    localStorage.removeItem(MIGRATION_LOG_KEY);
    return checkAndMigrateData();
};
