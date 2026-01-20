import { Dream, DreamMood } from '../types';
import { ShareCardFormat, ShareCardTheme, downloadShareCard, shareCard } from './shareCardService';
import { getLevelTitle, getLevelFromDreams, getLevelProgress, getDreamsForLevel } from '../constants/gamification';
import { calculateUserStats } from './userStatsService';
import { MOOD_LABELS } from '../constants/uiIcons';

export type AnalyticsCardType = 'weekly-wrap' | 'dream-journey' | 'mood-insights' | 'sleep-quality';

interface AnalyticsCardOptions {
    dreams: Dream[];
    format: ShareCardFormat;
    theme: ShareCardTheme;
    cardType: AnalyticsCardType;
    periodLabel?: string; // e.g., "This Week", "January 2026"
}

// Template dimensions
const DIMENSIONS = {
    square: { width: 1080, height: 1080 },
    vertical: { width: 1080, height: 1920 }
};

// Gradient backgrounds
const ANALYTICS_GRADIENTS: Record<ShareCardTheme, string[]> = {
    cosmic: ['#0f0c29', '#302b63', '#24243e'],
    serene: ['#2c3e50', '#3498db', '#2980b9'],
    mystic: ['#1a1a2e', '#4a148c', '#6a1b9a'],
    dawn: ['#2c3e50', '#fd746c', '#ff9068'],
    night: ['#0f2027', '#203a43', '#2c5364'],
    aurora: ['#1a2a6c', '#b21f1f', '#2af598'],
    ember: ['#22223b', '#4a4e69', '#c9ada7'],
    forest: ['#134e5e', '#71b280', '#0d4749'],
    ocean: ['#1c3f60', '#2e86ab', '#0a1628'],
    velvet: ['#200122', '#6f0000', '#440034'],
    storm: ['#16222a', '#3a6073', '#0f2027'],
    honey: ['#443627', '#c69749', '#2d2414'],
    lavender: ['#2e1c4a', '#7b5ea7', '#1a0f2e'],
    mint: ['#0d3331', '#2a9d8f', '#043836'],
    rose: ['#3c1642', '#a63d40', '#2b0d31']
};

// Mood colors for charts
const MOOD_COLORS: Record<DreamMood, string> = {
    joyful: '#FFD93D',
    peaceful: '#6BCB77',
    neutral: '#94A3B8',
    confused: '#9B59B6',
    anxious: '#FF6B6B',
    sad: '#74B9FF',
    fearful: '#636E72',
    nightmare: '#E74C3C',
    nostalgic: '#DDA0DD',
    hopeful: '#87CEEB'
};

// Calculate analytics from dreams
function calculateAnalytics(dreams: Dream[], periodDays: number = 7) {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const periodDreams = dreams.filter(d => new Date(d.timestamp) >= periodStart);
    const stats = calculateUserStats(dreams);

    // Calculate mood distribution
    const moodCounts: Partial<Record<DreamMood, number>> = {};
    periodDreams.forEach(d => {
        if (d.mood) {
            moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1;
        }
    });

    // Get top moods
    const topMoods = Object.entries(moodCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([mood, count]) => ({ mood: mood as DreamMood, count }));

    // Calculate average sleep quality
    const qualityDreams = periodDreams.filter(d => d.sleepQuality);
    const avgQuality = qualityDreams.length > 0
        ? qualityDreams.reduce((sum, d) => sum + (d.sleepQuality || 0), 0) / qualityDreams.length
        : 0;

    // Get top tags
    const tagCounts: Record<string, number> = {};
    periodDreams.forEach(d => {
        d.tags?.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([tag]) => tag);

    return {
        periodDreams: periodDreams.length,
        totalDreams: dreams.length,
        level: stats.level,
        levelTitle: getLevelTitle(stats.level),
        levelProgress: getLevelProgress(dreams.length),
        dreamsToNextLevel: getDreamsForLevel(stats.level + 1) - dreams.length,
        currentStreak: stats.currentStreak,
        bestStreak: stats.bestStreak,
        avgQuality,
        topMoods,
        topTags,
        moodCounts
    };
}

// Draw rounded rectangle
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Draw a stat card
function drawStatCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    value: string,
    label: string,
    isVertical: boolean
) {
    // Card background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    roundRect(ctx, x, y, width, height, 16);
    ctx.fill();

    // Value
    ctx.font = `bold ${isVertical ? 48 : 40}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(value, x + width / 2, y + height * 0.5);

    // Label
    ctx.font = `${isVertical ? 22 : 18}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(label, x + width / 2, y + height * 0.75);
}

// Draw progress bar
function drawProgressBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    progress: number,
    color: string
) {
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    roundRect(ctx, x, y, width, height, height / 2);
    ctx.fill();

    // Progress
    if (progress > 0) {
        ctx.fillStyle = color;
        roundRect(ctx, x, y, width * Math.min(progress, 1), height, height / 2);
        ctx.fill();
    }
}

// Generate Weekly Wrap card
function generateWeeklyWrap(
    ctx: CanvasRenderingContext2D,
    analytics: ReturnType<typeof calculateAnalytics>,
    options: AnalyticsCardOptions
) {
    const { format } = options;
    const { width, height } = DIMENSIONS[format];
    const isVertical = format === 'vertical';
    const padding = width * 0.08;

    // Header
    ctx.font = `bold ${isVertical ? 32 : 28}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('☽ SOMNIA', width / 2, isVertical ? 100 : 70);

    // Period label
    ctx.font = `${isVertical ? 24 : 20}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(options.periodLabel || 'This Week', width / 2, isVertical ? 140 : 105);

    // Main title
    ctx.font = `bold ${isVertical ? 56 : 48}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Dream Wrap', width / 2, isVertical ? 240 : 180);

    // Stats grid
    const cardWidth = (width - padding * 3) / 2;
    const cardHeight = isVertical ? 140 : 120;
    const startY = isVertical ? 320 : 240;

    // Dreams logged
    drawStatCard(ctx, padding, startY, cardWidth, cardHeight,
        analytics.periodDreams.toString(), 'Dreams Logged', isVertical);

    // Average quality
    drawStatCard(ctx, padding * 2 + cardWidth, startY, cardWidth, cardHeight,
        analytics.avgQuality > 0 ? `${analytics.avgQuality.toFixed(1)}★` : '—', 'Avg Quality', isVertical);

    // Second row
    const row2Y = startY + cardHeight + padding * 0.5;
    drawStatCard(ctx, padding, row2Y, cardWidth, cardHeight,
        `${analytics.currentStreak}`, 'Day Streak', isVertical);

    drawStatCard(ctx, padding * 2 + cardWidth, row2Y, cardWidth, cardHeight,
        `Lvl ${analytics.level}`, analytics.levelTitle, isVertical);

    // Top themes section
    if (analytics.topTags.length > 0) {
        const themesY = row2Y + cardHeight + padding;
        ctx.font = `${isVertical ? 22 : 18}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText('Top Themes', width / 2, themesY);

        ctx.font = `bold ${isVertical ? 28 : 24}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(analytics.topTags.map(t => `#${t}`).join('  '), width / 2, themesY + (isVertical ? 40 : 35));
    }

    // Top moods
    if (analytics.topMoods.length > 0) {
        const moodsY = isVertical ? height * 0.65 : height * 0.7;
        ctx.font = `${isVertical ? 22 : 18}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText('Dominant Moods', width / 2, moodsY);

        ctx.font = `bold ${isVertical ? 28 : 24}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = '#ffffff';
        const moodText = analytics.topMoods.map(m => MOOD_LABELS[m.mood]).join('  •  ');
        ctx.fillText(moodText, width / 2, moodsY + (isVertical ? 40 : 35));
    }
}

// Generate Dream Journey card
function generateDreamJourney(
    ctx: CanvasRenderingContext2D,
    analytics: ReturnType<typeof calculateAnalytics>,
    options: AnalyticsCardOptions
) {
    const { format } = options;
    const { width, height } = DIMENSIONS[format];
    const isVertical = format === 'vertical';
    const padding = width * 0.08;

    // Header
    ctx.font = `bold ${isVertical ? 32 : 28}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('☽ SOMNIA', width / 2, isVertical ? 100 : 70);

    // Main title
    ctx.font = `bold ${isVertical ? 56 : 48}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Dream Journey', width / 2, isVertical ? 200 : 160);

    // Level badge
    const levelY = isVertical ? 320 : 260;
    ctx.font = `bold ${isVertical ? 120 : 100}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${analytics.level}`, width / 2, levelY);

    ctx.font = `bold ${isVertical ? 36 : 32}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(analytics.levelTitle.toUpperCase(), width / 2, levelY + (isVertical ? 50 : 45));

    // Progress bar
    const progressY = levelY + (isVertical ? 100 : 85);
    const barWidth = width - padding * 2;
    drawProgressBar(ctx, padding, progressY, barWidth, 20, analytics.levelProgress / 100, '#ffffff');

    // Progress text
    ctx.font = `${isVertical ? 20 : 16}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(
        analytics.dreamsToNextLevel > 0
            ? `${analytics.dreamsToNextLevel} dreams to next level`
            : 'Max level reached!',
        width / 2,
        progressY + 50
    );

    // Stats
    const statsY = isVertical ? height * 0.55 : height * 0.6;
    const cardWidth = (width - padding * 4) / 3;
    const cardHeight = isVertical ? 130 : 110;

    drawStatCard(ctx, padding, statsY, cardWidth, cardHeight,
        analytics.totalDreams.toString(), 'Total Dreams', isVertical);

    drawStatCard(ctx, padding * 2 + cardWidth, statsY, cardWidth, cardHeight,
        `${analytics.currentStreak}`, 'Day Streak', isVertical);

    drawStatCard(ctx, padding * 3 + cardWidth * 2, statsY, cardWidth, cardHeight,
        `${analytics.bestStreak}`, 'Best Streak', isVertical);
}

// Generate Mood Insights card
function generateMoodInsights(
    ctx: CanvasRenderingContext2D,
    analytics: ReturnType<typeof calculateAnalytics>,
    options: AnalyticsCardOptions
) {
    const { format } = options;
    const { width, height } = DIMENSIONS[format];
    const isVertical = format === 'vertical';
    const padding = width * 0.08;

    // Header
    ctx.font = `bold ${isVertical ? 32 : 28}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('☽ SOMNIA', width / 2, isVertical ? 100 : 70);

    // Period label
    ctx.font = `${isVertical ? 24 : 20}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(options.periodLabel || 'Dream Moods', width / 2, isVertical ? 140 : 105);

    // Main title
    ctx.font = `bold ${isVertical ? 56 : 48}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Mood Insights', width / 2, isVertical ? 240 : 180);

    // Mood bars
    const entries = Object.entries(analytics.moodCounts) as [DreamMood, number][];
    const sortedMoods = entries.sort(([, a], [, b]) => b - a).slice(0, 6);
    const maxCount = Math.max(...sortedMoods.map(([, c]) => c), 1);

    const barStartY = isVertical ? 340 : 260;
    const barHeight = isVertical ? 50 : 40;
    const barSpacing = isVertical ? 70 : 55;
    const barMaxWidth = width - padding * 2 - 140;

    ctx.textAlign = 'left';
    sortedMoods.forEach(([mood, count], index) => {
        const y = barStartY + index * barSpacing;

        // Mood label
        ctx.font = `${isVertical ? 22 : 18}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(MOOD_LABELS[mood], padding, y + barHeight * 0.65);

        // Bar
        const barX = padding + 120;
        const barWidth = (count / maxCount) * barMaxWidth;
        ctx.fillStyle = MOOD_COLORS[mood] || '#ffffff';
        roundRect(ctx, barX, y, Math.max(barWidth, 10), barHeight, barHeight / 2);
        ctx.fill();

        // Count
        ctx.font = `bold ${isVertical ? 20 : 16}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText(count.toString(), width - padding, y + barHeight * 0.65);
        ctx.textAlign = 'left';
    });

    // Total dreams footer
    ctx.textAlign = 'center';
    ctx.font = `${isVertical ? 22 : 18}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`Based on ${analytics.periodDreams} dreams`, width / 2, isVertical ? height * 0.8 : height * 0.85);
}

// Generate Sleep Quality card
function generateSleepQuality(
    ctx: CanvasRenderingContext2D,
    analytics: ReturnType<typeof calculateAnalytics>,
    options: AnalyticsCardOptions
) {
    const { format } = options;
    const { width, height } = DIMENSIONS[format];
    const isVertical = format === 'vertical';

    // Header
    ctx.font = `bold ${isVertical ? 32 : 28}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('☽ SOMNIA', width / 2, isVertical ? 100 : 70);

    // Period label
    ctx.font = `${isVertical ? 24 : 20}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(options.periodLabel || 'Sleep Quality', width / 2, isVertical ? 140 : 105);

    // Main title
    ctx.font = `bold ${isVertical ? 56 : 48}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Sleep Score', width / 2, isVertical ? 240 : 180);

    // Large quality rating
    const ratingY = isVertical ? 420 : 340;
    ctx.font = `bold ${isVertical ? 160 : 140}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
        analytics.avgQuality > 0 ? analytics.avgQuality.toFixed(1) : '—',
        width / 2,
        ratingY
    );

    // Stars
    const starsY = ratingY + (isVertical ? 60 : 50);
    ctx.font = `${isVertical ? 48 : 40}px -apple-system, BlinkMacSystemFont, sans-serif`;
    const fullStars = Math.floor(analytics.avgQuality);
    const hasHalf = analytics.avgQuality % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) stars += '★';
        else if (i === fullStars && hasHalf) stars += '✦';
        else stars += '☆';
    }
    ctx.fillText(stars, width / 2, starsY);

    // Rating label
    ctx.font = `${isVertical ? 28 : 24}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const ratingLabel = analytics.avgQuality >= 4 ? 'Excellent'
        : analytics.avgQuality >= 3 ? 'Good'
        : analytics.avgQuality >= 2 ? 'Fair'
        : analytics.avgQuality > 0 ? 'Needs Improvement'
        : 'No Data';
    ctx.fillText(ratingLabel, width / 2, starsY + (isVertical ? 60 : 50));

    // Dreams count
    ctx.font = `${isVertical ? 22 : 18}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(`Based on ${analytics.periodDreams} dreams`, width / 2, isVertical ? height * 0.8 : height * 0.85);
}

// Main export function
export async function generateAnalyticsCard(options: AnalyticsCardOptions): Promise<string> {
    const { format, theme, cardType, dreams } = options;
    const { width, height } = DIMENSIONS[format];

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    const colors = ANALYTICS_GRADIENTS[theme];
    gradient.addColorStop(0, colors[0] ?? '#1a1a2e');
    gradient.addColorStop(0.5, colors[1] ?? '#4a148c');
    gradient.addColorStop(1, colors[2] ?? '#6a1b9a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // Calculate analytics
    const periodDays = cardType === 'weekly-wrap' ? 7 : 30;
    const analytics = calculateAnalytics(dreams, periodDays);

    // Generate card based on type
    switch (cardType) {
        case 'weekly-wrap':
            generateWeeklyWrap(ctx, analytics, options);
            break;
        case 'dream-journey':
            generateDreamJourney(ctx, analytics, options);
            break;
        case 'mood-insights':
            generateMoodInsights(ctx, analytics, options);
            break;
        case 'sleep-quality':
            generateSleepQuality(ctx, analytics, options);
            break;
    }

    // Footer branding
    const isVertical = format === 'vertical';
    ctx.font = `${isVertical ? 22 : 18}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('somnia.ai', width / 2, height - (isVertical ? 60 : 40));

    return canvas.toDataURL('image/png');
}

// Re-export utility functions
export { downloadShareCard, shareCard };
