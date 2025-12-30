/**
 * Gamification Constants for Somnia.ai
 * Defines level thresholds, XP values, and progression milestones
 */

/** Number of dreams required to gain one level */
export const DREAMS_PER_LEVEL = 5;

/** XP awarded per dream logged */
export const XP_PER_DREAM = 100;

/** Level titles based on total dreams logged */
export const LEVEL_TITLES: Record<number, string> = {
    1: 'Dreamer',
    2: 'Seeker',
    3: 'Wanderer',
    4: 'Voyager',
    5: 'Explorer',
    6: 'Navigator',
    7: 'Sage',
    8: 'Oracle',
    9: 'Master',
    10: 'Oneironaut',
};

/**
 * Get the title for a given level
 * @param level - The user's current level
 * @returns The title string for that level
 */
export const getLevelTitle = (level: number): string => {
    if (level >= 10) return LEVEL_TITLES[10];
    return LEVEL_TITLES[level] || LEVEL_TITLES[1];
};

/** Achievement definitions */
export const ACHIEVEMENTS = {
    FIRST_DREAM: { id: 'first_dream', name: 'First Step', description: 'Log your first dream' },
    WEEK_STREAK: { id: 'week_streak', name: 'Consistent Dreamer', description: 'Log dreams for 7 consecutive days' },
    MONTH_STREAK: { id: 'month_streak', name: 'Dream Master', description: 'Log dreams for 30 consecutive days' },
    TEN_DREAMS: { id: 'ten_dreams', name: 'Dream Collector', description: 'Log 10 dreams' },
    FIFTY_DREAMS: { id: 'fifty_dreams', name: 'Dream Archivist', description: 'Log 50 dreams' },
    LUCID_TAGGER: { id: 'lucid_tagger', name: 'Lucid Tagger', description: 'Tag a dream as lucid' },
} as const;

export type AchievementId = keyof typeof ACHIEVEMENTS;
