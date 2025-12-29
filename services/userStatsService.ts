import { Dream } from '../types';

export interface UserStats {
    level: number;
    currentStreak: number;
    bestStreak: number;
    totalDreams: number;
    xp: number; // For future use
    nextLevelProgress: number; // 0-100 percentage
}

export const calculateUserStats = (dreams: Dream[]): UserStats => {
    // 1. Calculate Level
    // Simple logic: 1 level per 5 dreams
    const totalDreams = dreams.length;
    const level = Math.floor(totalDreams / 5) + 1;
    const dreamsForNextLevel = level * 5;
    const dreamsCurrentLevel = (level - 1) * 5;
    const progress = totalDreams >= dreamsForNextLevel
        ? 100
        : ((totalDreams - dreamsCurrentLevel) / 5) * 100;

    // 2. Calculate Streaks
    const map = new Set<string>();
    dreams.forEach(d => {
        const date = new Date(d.timestamp);
        map.add(date.toDateString());
    });

    let currentStreak = 0;
    let bestStreak = 0;

    // Sort unique dates newest first
    const uniqueDates = Array.from(map).map(d => new Date(d).getTime()).sort((a, b) => b - a);

    if (uniqueDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let expected = today.getTime();
        let isStreakActive = false;

        // Check if streak is active (logged today or yesterday)
        if (uniqueDates[0] === today.getTime() || uniqueDates[0] === yesterday.getTime()) {
            isStreakActive = true;
        }

        if (isStreakActive) {
            // Count backwards
            const oneDay = 24 * 60 * 60 * 1000;
            // Align expected to the most recent log (today or yesterday) to start counting
            expected = uniqueDates[0];

            for (const time of uniqueDates) {
                if (Math.abs(time - expected) < 1000) { // allowing small float diffs if any, though getTime is int
                    currentStreak++;
                    expected -= oneDay;
                } else {
                    break;
                }
            }
        }
    }

    // Calculate best streak (simple iterate)
    if (uniqueDates.length > 0) {
        let tempStreak = 1;
        const oneDay = 24 * 60 * 60 * 1000;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
            if (uniqueDates[i] - uniqueDates[i + 1] === oneDay) {
                tempStreak++;
            } else {
                bestStreak = Math.max(bestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        bestStreak = Math.max(bestStreak, tempStreak);
    }


    return {
        level,
        currentStreak,
        bestStreak,
        totalDreams,
        xp: totalDreams * 100,
        nextLevelProgress: progress
    };
};
