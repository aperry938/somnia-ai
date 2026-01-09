import { Dream, SleepAids } from '../types';
import { logger } from './logger';

const MIGRATION_VERSION = 1;

// Type for potentially incomplete dream data during migration
type PartialDream = Partial<Dream> & { id?: number; sleepAids?: SleepAids; tags?: string[] };

export const checkAndMigrateData = () => {
    try {
        const dreamsRaw = localStorage.getItem('somnia_dreams');
        if (!dreamsRaw) return;

        const dreams: PartialDream[] = JSON.parse(dreamsRaw);
        if (!Array.isArray(dreams)) return;

        let hasChanges = false;

        // Migration 1: Ensure SleepAids object exists
        const migrated = dreams.map(dream => {
            const d = { ...dream };

            // Fix 1: Add ID if missing (shouldn't happen but valid for stability)
            if (!d.id) {
                d.id = Date.now() + Math.random();
                hasChanges = true;
            }

            // Fix 2: Ensure SleepAids object
            if (!d.sleepAids) {
                d.sleepAids = {};
                hasChanges = true;
            }

            // Fix 3: Ensure tags array
            if (!d.tags) {
                d.tags = [];
                hasChanges = true;
            }

            return d;
        });

        if (hasChanges) {
            logger.log("Migrating data to schema v1...");
            localStorage.setItem('somnia_dreams', JSON.stringify(migrated));
            localStorage.setItem('somnia_migration_log', JSON.stringify({
                version: MIGRATION_VERSION,
                timestamp: new Date().toISOString(),
                details: "Backfilled missing IDs, sleepAids, and tags."
            }));
            logger.log("Migration complete.");
        } else {
            logger.log("Data integrity clean.");
        }

    } catch (e) {
        logger.error("Migration failed:", e);
    }
};
