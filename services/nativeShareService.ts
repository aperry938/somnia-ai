/**
 * Native Share Service
 * Provides platform-aware sharing using Capacitor Share plugin on mobile
 * and Web Share API / download fallback on web.
 */
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { logger } from './logger';

interface ShareOptions {
    title: string;
    text?: string;
    url?: string;
    dataUrl?: string; // base64 data URL from canvas
}

export async function shareNative(options: ShareOptions): Promise<boolean> {
    try {
        if (Capacitor.isNativePlatform() && options.dataUrl) {
            // On native: save to temp file, then share
            const base64Data = options.dataUrl.split(',')[1];
            const fileName = `somnia-share-${Date.now()}.png`;

            const result = await Filesystem.writeFile({
                path: fileName,
                data: base64Data ?? '',
                directory: Directory.Cache,
            });

            await Share.share({
                title: options.title,
                text: options.text,
                url: result.uri,
            });

            // Clean up temp file (don't await)
            Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {});

            return true;
        }

        // Web fallback: use Web Share API if available
        if (navigator.share && options.dataUrl) {
            const response = await fetch(options.dataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'somnia-dream.png', { type: 'image/png' });

            await navigator.share({
                title: options.title,
                text: options.text,
                files: [file],
            });
            return true;
        }

        // Final fallback: download
        if (options.dataUrl) {
            const link = document.createElement('a');
            link.download = `somnia-${Date.now()}.png`;
            link.href = options.dataUrl;
            link.click();
            return true;
        }

        return false;
    } catch (error) {
        // User cancelled share is not an error
        if (error instanceof Error && error.message.includes('cancel')) {
            return false;
        }
        logger.error('[NativeShare] Share failed:', error);
        return false;
    }
}

export function canShareNatively(): boolean {
    return Capacitor.isNativePlatform() || !!navigator.share;
}
