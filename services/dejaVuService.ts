/**
 * Déjà Vu Dream Service
 *
 * Detects when a new dream echoes a past dream and notifies the user.
 * "Déjà Rêvé" = "Already Dreamed" in French
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { findSimilarDreams } from './geminiService';
import { logger } from './logger';

// Constants
const DEJA_VU_THRESHOLD = 0.80; // 80% similarity required
const MIN_DAYS_AGO = 30; // Dream must be at least 30 days old
const NOTIFICATION_ID_BASE = 900000; // Unique ID range for déjà vu notifications

export interface DejaVuMatch {
    dreamId: number;
    title: string;
    timestamp: string;
    similarity: number;
    daysAgo: number;
}

/**
 * Check if a dream matches an old dream (déjà vu detection)
 */
export function checkForDejaVu(
    newDreamEmbedding: number[],
    pastDreams: Array<{ id: number; dreamText: string; title: string; timestamp: string; embedding?: number[] }>
): DejaVuMatch | null {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - MIN_DAYS_AGO * 24 * 60 * 60 * 1000);

    // Filter to only dreams older than 30 days
    const oldDreams = pastDreams.filter(dream => {
        const dreamDate = new Date(dream.timestamp);
        return dreamDate < thirtyDaysAgo;
    });

    if (oldDreams.length === 0) {
        return null;
    }

    // Find similar dreams with high threshold
    const matches = findSimilarDreams(newDreamEmbedding, oldDreams, DEJA_VU_THRESHOLD, 1);

    if (matches.length === 0) {
        return null;
    }

    const bestMatch = matches[0];
    if (!bestMatch) {
        return null;
    }
    const dreamDate = new Date(bestMatch.timestamp);
    const daysAgo = Math.floor((now.getTime() - dreamDate.getTime()) / (24 * 60 * 60 * 1000));

    return {
        dreamId: bestMatch.id,
        title: bestMatch.title,
        timestamp: bestMatch.timestamp,
        similarity: bestMatch.similarity,
        daysAgo,
    };
}

/**
 * Send a déjà vu notification to the user
 */
export async function sendDejaVuNotification(
    newDreamId: number,
    match: DejaVuMatch
): Promise<boolean> {
    // Only send notifications on native platforms
    if (!Capacitor.isNativePlatform()) {
        logger.log('[DejaVu] Skipping notification - not native platform');
        return false;
    }

    try {
        const similarityPercent = Math.round(match.similarity * 100);
        const dateStr = new Date(match.timestamp).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
        });

        await LocalNotifications.schedule({
            notifications: [
                {
                    id: NOTIFICATION_ID_BASE + newDreamId,
                    title: 'Déjà Rêvé Alert',
                    body: `Your dream tonight echoes one from ${dateStr}. Tap to see the connection.`,
                    extra: {
                        type: 'deja_vu',
                        newDreamId,
                        matchedDreamId: match.dreamId,
                        similarity: match.similarity,
                    },
                    smallIcon: 'ic_stat_moon',
                    largeIcon: 'ic_launcher',
                },
            ],
        });

        logger.log(`[DejaVu] Sent notification: ${similarityPercent}% match with dream from ${match.daysAgo} days ago`);
        return true;
    } catch (error) {
        logger.error('[DejaVu] Failed to send notification:', error);
        return false;
    }
}

/**
 * Process a newly analyzed dream for déjà vu detection
 * Call this after dream analysis completes and embedding is generated
 */
export async function processDejaVuCheck(
    newDreamId: number,
    newDreamEmbedding: number[],
    pastDreams: Array<{ id: number; dreamText: string; title: string; timestamp: string; embedding?: number[] }>
): Promise<DejaVuMatch | null> {
    try {
        // Exclude the current dream from past dreams
        const otherDreams = pastDreams.filter(d => d.id !== newDreamId);

        const match = checkForDejaVu(newDreamEmbedding, otherDreams);

        if (match) {
            logger.log(`[DejaVu] Found match! Dream ${match.dreamId} is ${Math.round(match.similarity * 100)}% similar (${match.daysAgo} days ago)`);
            await sendDejaVuNotification(newDreamId, match);
            return match;
        }

        return null;
    } catch (error) {
        logger.error('[DejaVu] Error processing déjà vu check:', error);
        return null;
    }
}

/**
 * Initialize déjà vu notification listener
 * Call this on app startup to handle notification taps
 */
export function initializeDejaVuListener(
    onDejaVuTapped: (newDreamId: number, matchedDreamId: number) => void
): void {
    if (!Capacitor.isNativePlatform()) return;

    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        if (action.notification.extra?.type === 'deja_vu') {
            const { newDreamId, matchedDreamId } = action.notification.extra;
            onDejaVuTapped(newDreamId, matchedDreamId);
        }
    });
}
