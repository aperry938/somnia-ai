import { Dream, DreamMood } from '../types';
import { MOOD_LABELS } from '../constants/uiIcons';

export type ShareCardFormat = 'square' | 'vertical';
export type ShareCardTheme = 'cosmic' | 'serene' | 'mystic' | 'dawn' | 'night';

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
    cosmic: ['#0f0c29', '#302b63', '#24243e'],
    serene: ['#2c3e50', '#3498db', '#2980b9'],
    mystic: ['#1a1a2e', '#4a148c', '#6a1b9a'],
    dawn: ['#2c3e50', '#fd746c', '#ff9068'],
    night: ['#0f2027', '#203a43', '#2c5364']
};

// Get appropriate theme based on dream mood
export function getThemeForMood(mood?: DreamMood): ShareCardTheme {
    switch (mood) {
        case 'joyful':
        case 'peaceful':
            return 'serene';
        case 'neutral':
            return 'cosmic';
        case 'confused':
        case 'anxious':
            return 'mystic';
        case 'sad':
        case 'fearful':
        case 'nightmare':
            return 'night';
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

    // Try to load template image, fallback to gradient
    const templatePath = `/share-templates/dream-card-${theme}${format === 'vertical' ? '-vertical' : ''}.png`;

    try {
        const img = await loadImage(templatePath);
        ctx.drawImage(img, 0, 0, width, height);
    } catch {
        // Fallback gradient
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
        console.error('Share failed:', error);
    }
    return false;
}
