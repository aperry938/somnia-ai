import { Dream, DreamMood } from '../types';
import { MOOD_LABELS } from '../constants/uiIcons';
import { logger } from './logger';

export type ShareCardFormat = 'square' | 'vertical';
export type ShareCardTheme =
    | 'cosmic' | 'serene' | 'mystic' | 'dawn' | 'night'
    | 'aurora' | 'ember' | 'forest' | 'ocean' | 'velvet'
    | 'storm' | 'honey' | 'lavender' | 'mint' | 'rose';

interface ShareCardOptions {
    dream: Dream;
    format: ShareCardFormat;
    theme: ShareCardTheme;
    contentType: 'dream-excerpt' | 'ai-insight';
}

// Template dimensions
const DIMENSIONS = {
    square: { width: 1080, height: 1080 },
    vertical: { width: 1080, height: 1920 }
};

// Default fallback gradient backgrounds (used if template images not found)
const FALLBACK_GRADIENTS: Record<ShareCardTheme, string[]> = {
    // Original 5
    cosmic: ['#0f0c29', '#302b63', '#24243e'],
    serene: ['#2c3e50', '#3498db', '#2980b9'],
    mystic: ['#1a1a2e', '#4a148c', '#6a1b9a'],
    dawn: ['#2c3e50', '#fd746c', '#ff9068'],
    night: ['#0f2027', '#203a43', '#2c5364'],
    // New 10
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

// Get appropriate theme based on dream mood and tags
export function getThemeForMood(mood?: DreamMood, tags?: string[]): ShareCardTheme {
    // Check tags first for specific dream types
    if (tags?.length) {
        const tagLower = tags.map(t => t.toLowerCase());
        if (tagLower.includes('lucid')) return 'aurora';
        if (tagLower.includes('flying')) return 'cosmic';
        if (tagLower.includes('adventure')) return 'forest';
        if (tagLower.includes('recurring')) return 'velvet';
        if (tagLower.includes('water') || tagLower.includes('swimming')) return 'ocean';
        if (tagLower.includes('nature')) return 'forest';
        if (tagLower.includes('love') || tagLower.includes('romantic')) return 'rose';
    }

    // Map mood to theme
    switch (mood) {
        case 'joyful':
            return 'dawn';
        case 'peaceful':
            return 'serene';
        case 'neutral':
            return 'cosmic';
        case 'confused':
            return 'mystic';
        case 'anxious':
            return 'storm';
        case 'sad':
            return 'lavender';
        case 'fearful':
            return 'night';
        case 'nightmare':
            return 'velvet';
        default:
            return 'cosmic';
    }
}

// Truncate text intelligently
function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return truncated.substring(0, lastSpace > 0 ? lastSpace : maxLength) + '…';
}

// Get content to display on card
function getCardContent(dream: Dream, contentType: 'dream-excerpt' | 'ai-insight'): string {
    if (contentType === 'ai-insight' && dream.aiAnalysis?.interpretation) {
        // Get first sentence or first 150 chars of interpretation
        const interpretation = dream.aiAnalysis.interpretation;
        const firstSentence = interpretation.split('.')[0];
        return truncateText(firstSentence || interpretation, 180);
    }
    // Default to dream excerpt
    return truncateText(dream.dreamText, 200);
}

// Format date nicely
function formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Draw text with word wrap
function drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
): number {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line.trim(), x, currentY);
            line = word + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), x, currentY);
    return currentY;
}

// Generate share card as data URL
export async function generateShareCard(options: ShareCardOptions): Promise<string> {
    const { dream, format, theme, contentType } = options;
    const { width, height } = DIMENSIONS[format];

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    let backgroundLoaded = false;

    // Priority 1: User's attached dream visualization image
    if (dream.imageUrl) {
        try {
            const userImg = await loadImage(dream.imageUrl);
            drawImageCover(ctx, userImg, width, height);
            backgroundLoaded = true;
        } catch {
            // Image failed to load, continue to fallbacks
        }
    }

    // Priority 2: Theme template image
    if (!backgroundLoaded) {
        const templatePath = `/share-templates/dream-card-${theme}${format === 'vertical' ? '-vertical' : ''}.png`;
        try {
            const img = await loadImage(templatePath);
            ctx.drawImage(img, 0, 0, width, height);
            backgroundLoaded = true;
        } catch {
            // Template not found, use gradient fallback
        }
    }

    // Priority 3: Gradient fallback
    if (!backgroundLoaded) {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        const colors = FALLBACK_GRADIENTS[theme];
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.5, colors[1]);
        gradient.addColorStop(1, colors[2]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    // Add semi-transparent overlay for text readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);

    // Text settings
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';

    // Responsive sizing
    const isVertical = format === 'vertical';
    const padding = width * 0.08;
    const maxTextWidth = width - (padding * 2);

    // Brand header
    ctx.font = `bold ${isVertical ? 32 : 28}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('☽ SOMNIA', width / 2, isVertical ? 120 : 80);

    // Quote marks
    const quoteY = isVertical ? height * 0.35 : height * 0.35;
    ctx.font = `${isVertical ? 120 : 80}px Georgia, serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillText('"', width / 2, quoteY - 20);

    // Main content quote
    const content = getCardContent(dream, contentType);
    ctx.font = `italic ${isVertical ? 42 : 36}px Georgia, serif`;
    ctx.fillStyle = '#ffffff';
    const contentY = quoteY + (isVertical ? 60 : 40);
    drawWrappedText(ctx, content, width / 2, contentY, maxTextWidth, isVertical ? 56 : 48);

    // Dream title
    const title = dream.aiAnalysis?.title || dream.title || 'Untitled Dream';
    const metaY = isVertical ? height * 0.75 : height * 0.75;
    ctx.font = `bold ${isVertical ? 32 : 28}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`— ${truncateText(title, 40)}`, width / 2, metaY);

    // Mood and date
    const mood = dream.mood ? MOOD_LABELS[dream.mood] : 'Dream';
    const date = formatDate(dream.timestamp ?? new Date().toISOString());
    ctx.font = `${isVertical ? 26 : 22}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`${mood} • ${date}`, width / 2, metaY + (isVertical ? 50 : 40));

    // Footer branding
    ctx.font = `${isVertical ? 22 : 18}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('somnia.ai', width / 2, height - (isVertical ? 60 : 40));

    return canvas.toDataURL('image/png');
}

// Draw image covering the canvas (like CSS background-size: cover)
function drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    canvasWidth: number,
    canvasHeight: number
): void {
    const imgRatio = img.width / img.height;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > canvasRatio) {
        // Image is wider - crop sides
        drawHeight = canvasHeight;
        drawWidth = img.width * (canvasHeight / img.height);
        offsetX = (canvasWidth - drawWidth) / 2;
    } else {
        // Image is taller - crop top/bottom
        drawWidth = canvasWidth;
        drawHeight = img.height * (canvasWidth / img.width);
        offsetY = (canvasHeight - drawHeight) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

// Load image helper
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Download the share card
export function downloadShareCard(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
}

// Native share if available
export async function shareCard(dataUrl: string, title: string): Promise<boolean> {
    try {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `${title}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
                title: 'My Dream from Somnia',
                text: title,
                files: [file]
            });
            return true;
        }
    } catch (error) {
        logger.error('Share failed:', error);
    }
    return false;
}
