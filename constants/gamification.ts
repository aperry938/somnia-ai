/**
 * Gamification Constants for Somnia.ai
 * Defines level thresholds, XP values, and progression milestones
 */

/**
 * Progressive level thresholds (cumulative dreams required)
 * Level 2: 5 dreams, Level 3: 15 (5+10), Level 4: 30 (5+10+15), etc.
 * Formula: threshold(n) = 5 * (n-1) * n / 2
 */
export const LEVEL_THRESHOLDS: Record<number, number> = {
    1: 0,    // Start
    2: 5,    // 5 dreams
    3: 15,   // +10 dreams
    4: 30,   // +15 dreams
    5: 50,   // +20 dreams
    6: 75,   // +25 dreams
    7: 105,  // +30 dreams
    8: 140,  // +35 dreams
    9: 180,  // +40 dreams
    10: 225, // +45 dreams
};

/**
 * Get dreams required for a specific level
 * @param level - Target level
 * @returns Cumulative dreams needed
 */
export const getDreamsForLevel = (level: number): number => {
    if (level <= 1) return 0;
    if (level <= 10) return LEVEL_THRESHOLDS[level] ?? 0;
    // Beyond level 10: continue the pattern (5 * (n-1) * n / 2)
    return Math.floor(5 * (level - 1) * level / 2);
};

/**
 * Get level from total dreams logged
 * @param totalDreams - Total dreams logged
 * @returns Current level (1-10+)
 */
export const getLevelFromDreams = (totalDreams: number): number => {
    for (let level = 10; level >= 1; level--) {
        if (totalDreams >= getDreamsForLevel(level)) {
            return level;
        }
    }
    return 1;
};

/**
 * Get progress percentage toward next level
 * @param totalDreams - Total dreams logged
 * @returns Progress percentage (0-100)
 */
export const getLevelProgress = (totalDreams: number): number => {
    const currentLevel = getLevelFromDreams(totalDreams);
    const currentThreshold = getDreamsForLevel(currentLevel);
    const nextThreshold = getDreamsForLevel(currentLevel + 1);

    if (currentLevel >= 10) {
        // At max level, show progress toward prestige
        return 100;
    }

    const dreamsInLevel = totalDreams - currentThreshold;
    const dreamsNeeded = nextThreshold - currentThreshold;

    return Math.min(100, Math.floor((dreamsInLevel / dreamsNeeded) * 100));
};

/** XP awarded per dream logged */
export const XP_PER_DREAM = 100;

/** Level titles based on total dreams logged */
export const LEVEL_TITLES: Record<number, string> = {
    1: 'Sleeper',
    2: 'Aware',
    3: 'Focused',
    4: 'Lucid',
    5: 'Vivid',
    6: 'Clarity',
    7: 'Insight',
    8: 'Apex',
    9: 'Sovereign',
    10: 'Integrated',
};

/**
 * Get the title for a given level
 * @param level - The user's current level
 * @returns The title string for that level
 */
export const getLevelTitle = (level: number): string => {
    if (level >= 10) return LEVEL_TITLES[10] ?? '';
    return LEVEL_TITLES[level] ?? LEVEL_TITLES[1] ?? '';
};

/** Dreams required to earn one prestige level after reaching level 10 */
export const DREAMS_FOR_PRESTIGE = 100;

/** Prestige tier titles for infinite progression beyond level 10 */
export const PRESTIGE_TITLES: Record<number, string> = {
    1: 'Integrated I',
    2: 'Integrated II',
    3: 'Integrated III',
    4: 'Integrated IV',
    5: 'Integrated V',
    6: 'Transcendent I',
    7: 'Transcendent II',
    8: 'Transcendent III',
    9: 'Transcendent IV',
    10: 'Transcendent V',
};

/**
 * Get prestige tier based on total dreams (for users beyond level 10)
 * @param totalDreams - Total dreams logged
 * @returns Prestige tier (0 if not yet at prestige)
 */
export const getPrestigeTier = (totalDreams: number): number => {
    const dreamsAtMaxLevel = getDreamsForLevel(10); // 225 dreams for level 10
    if (totalDreams < dreamsAtMaxLevel) return 0;
    const prestigeDreams = totalDreams - dreamsAtMaxLevel;
    return Math.floor(prestigeDreams / DREAMS_FOR_PRESTIGE) + 1;
};

/**
 * Get prestige title based on prestige tier
 * @param tier - Prestige tier (1+)
 * @returns Prestige title string
 */
export const getPrestigeTitle = (tier: number): string => {
    if (tier <= 0) return '';
    if (tier <= 10) return PRESTIGE_TITLES[tier] ?? '';
    // For tiers beyond 10, use Roman numerals
    return `Transcendent ${tier}`;
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
