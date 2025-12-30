/**
 * Achievement Service for Somnia.ai
 * Checks and tracks user achievements based on dream data
 */

import { Dream } from '../types';
import { ACHIEVEMENTS, AchievementId } from '../constants/gamification';

const EARNED_ACHIEVEMENTS_KEY = 'somnia_earned_achievements';

export interface EarnedAchievement {
    id: AchievementId;
    earnedAt: string;
}

/**
 * Get all earned achievements from storage
 */
export const getEarnedAchievements = (): EarnedAchievement[] => {
    const stored = localStorage.getItem(EARNED_ACHIEVEMENTS_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch {
        return [];
    }
};

/**
 * Save earned achievements to storage
 */
const saveEarnedAchievements = (achievements: EarnedAchievement[]): void => {
    localStorage.setItem(EARNED_ACHIEVEMENTS_KEY, JSON.stringify(achievements));
};

/**
 * Check if a specific achievement has been earned
 */
export const hasEarnedAchievement = (id: AchievementId): boolean => {
    return getEarnedAchievements().some(a => a.id === id);
};

/**
 * Earn an achievement (if not already earned)
 * @returns true if newly earned, false if already had it
 */
export const earnAchievement = (id: AchievementId): boolean => {
    if (hasEarnedAchievement(id)) return false;

    const earned = getEarnedAchievements();
    earned.push({ id, earnedAt: new Date().toISOString() });
    saveEarnedAchievements(earned);

    // Dispatch event for toast/notification
    window.dispatchEvent(new CustomEvent('achievement-earned', {
        detail: { achievement: ACHIEVEMENTS[id] }
    }));

    return true;
};

/**
 * Check all achievements against current dream data and unlock any newly earned
 * @returns Array of newly earned achievement IDs
 */
export const checkAchievements = (dreams: Dream[], stats: { currentStreak: number; bestStreak: number }): AchievementId[] => {
    const newlyEarned: AchievementId[] = [];

    // FIRST_DREAM: Log your first dream
    if (dreams.length >= 1 && earnAchievement('FIRST_DREAM')) {
        newlyEarned.push('FIRST_DREAM');
    }

    // TEN_DREAMS: Log 10 dreams
    if (dreams.length >= 10 && earnAchievement('TEN_DREAMS')) {
        newlyEarned.push('TEN_DREAMS');
    }

    // FIFTY_DREAMS: Log 50 dreams
    if (dreams.length >= 50 && earnAchievement('FIFTY_DREAMS')) {
        newlyEarned.push('FIFTY_DREAMS');
    }

    // WEEK_STREAK: 7 consecutive days
    if (stats.bestStreak >= 7 && earnAchievement('WEEK_STREAK')) {
        newlyEarned.push('WEEK_STREAK');
    }

    // MONTH_STREAK: 30 consecutive days
    if (stats.bestStreak >= 30 && earnAchievement('MONTH_STREAK')) {
        newlyEarned.push('MONTH_STREAK');
    }

    // LUCID_TAGGER: Tag a dream as lucid
    const hasLucidTag = dreams.some(d =>
        d.tags?.some(tag => tag.toLowerCase().includes('lucid'))
    );
    if (hasLucidTag && earnAchievement('LUCID_TAGGER')) {
        newlyEarned.push('LUCID_TAGGER');
    }

    return newlyEarned;
};

/**
 * Get all achievements with their earned status
 */
export const getAllAchievementsWithStatus = () => {
    const earned = getEarnedAchievements();
    return Object.entries(ACHIEVEMENTS).map(([key, achievement]) => ({
        ...achievement,
        key: key as AchievementId,
        earned: earned.some(e => e.id === key),
        earnedAt: earned.find(e => e.id === key)?.earnedAt || null,
    }));
};
