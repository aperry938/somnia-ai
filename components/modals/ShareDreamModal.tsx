import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useBackButton } from '../../hooks/useBackButton';
import { Dream } from '../../types';
import {
    ShareCardFormat,
    ShareCardTheme,
    generateShareCard,
    downloadShareCard,
    shareCard,
    getThemeForMood
} from '../../services/shareCardService';
import haptics from '../../services/hapticsService';
import { logger } from '../../services/logger';

interface ShareDreamModalProps {
    dream: Dream;
    isOpen: boolean;
    onClose: () => void;
}

const THEME_ICONS: Record<ShareCardTheme, React.ReactNode> = {
    cosmic: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
    aurora: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    serene: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>,
    mystic: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    dawn: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    night: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
    ember: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
    forest: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l7 9 7-9M12 12v9M8 21h8" /></svg>,
    ocean: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>,
    velvet: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
    storm: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
    honey: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    lavender: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
    mint: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l7 9 7-9M12 12v9M8 21h8" /></svg>,
    rose: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
};

const THEMES: { id: ShareCardTheme; label: string }[] = [
    { id: 'cosmic', label: 'Cosmic' },
    { id: 'serene', label: 'Serene' },
    { id: 'mystic', label: 'Mystic' },
    { id: 'dawn', label: 'Dawn' },
    { id: 'night', label: 'Night' },
    { id: 'aurora', label: 'Aurora' },
    { id: 'ember', label: 'Ember' },
    { id: 'forest', label: 'Forest' },
    { id: 'ocean', label: 'Ocean' },
    { id: 'velvet', label: 'Velvet' },
    { id: 'storm', label: 'Storm' },
    { id: 'honey', label: 'Honey' },
    { id: 'lavender', label: 'Lavender' },
    { id: 'mint', label: 'Mint' },
    { id: 'rose', label: 'Rose' },
];

const FORMATS: { id: ShareCardFormat; label: string; platforms: string }[] = [
    { id: 'square', label: 'Square', platforms: 'Instagram, X, Facebook' },
    { id: 'vertical', label: 'Story', platforms: 'TikTok, IG Story' },
];

export const ShareDreamModal: React.FC<ShareDreamModalProps> = ({ dream, isOpen, onClose }) => {
    const [format, setFormat] = useState<ShareCardFormat>('square');
    const [theme, setTheme] = useState<ShareCardTheme>(() => getThemeForMood(dream.mood, dream.tags));
    const [contentType, setContentType] = useState<'dream-excerpt' | 'ai-insight'>('ai-insight');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    // Hardware back button support
    useBackButton(isOpen, onClose);

    // Generate preview when options change
    useEffect(() => {
        if (!isOpen) return;

        const generatePreview = async () => {
            setIsGenerating(true);
            try {
                const url = await generateShareCard({ dream, format, theme, contentType });
                setPreviewUrl(url);
            } catch (error) {
                logger.error('Failed to generate preview:', error);
            }
            setIsGenerating(false);
        };

        generatePreview();
    }, [dream, format, theme, contentType, isOpen]);

    // Handle escape key to close modal
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleDownload = () => {
        if (!previewUrl) return;
        haptics.medium();
        const filename = `somnia-dream-${dream.id}-${format}.png`;
        downloadShareCard(previewUrl, filename);
    };

    const handleShare = async () => {
        if (!previewUrl) return;
        haptics.medium();
        setIsSharing(true);

        const title = dream.aiAnalysis?.title || dream.title || 'My Dream';
        const shared = await shareCard(previewUrl, title);

        if (!shared) {
            // Fallback to download
            handleDownload();
        }
        setIsSharing(false);
    };

    if (!isOpen) return null;

    const hasAiInsight = !!dream.aiAnalysis?.integration;

    return (
        <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4 pt-4 pb-[calc(6.5rem+var(--safe-area-inset-bottom))] sm:pb-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dream-title"
        >
            <motion.div
                className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-day-border dark:border-night-border">
                    <h2 id="share-dream-title" className="font-serif text-xl">Share Dream</h2>
                    <button
                        onClick={onClose}
                        className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center hover:bg-white/10"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 space-y-5">
                    {/* Preview */}
                    <div className="flex justify-center">
                        <div
                            className={`relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl ${format === 'vertical' ? 'w-40 h-72' : 'w-48 h-48'
                                }`}
                        >
                            {isGenerating ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                </div>
                            ) : previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Share card preview"
                                    className="w-full h-full object-cover"
                                />
                            ) : null}
                        </div>
                    </div>

                    {/* Format Selection */}
                    <div>
                        <label className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-2 block">Format</label>
                        <div className="grid grid-cols-2 gap-2">
                            {FORMATS.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFormat(f.id)}
                                    className={`p-3 rounded-xl border-2 transition-all text-left ${format === f.id
                                        ? 'border-day-accent dark:border-night-accent bg-day-accent/10 dark:bg-night-accent/10'
                                        : 'border-day-border dark:border-night-border'
                                        }`}
                                    aria-label={`Select ${f.label} format for ${f.platforms}`}
                                    aria-pressed={format === f.id}
                                >
                                    <p className="font-medium">{f.label}</p>
                                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">{f.platforms}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme Selection */}
                    <div>
                        <label className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-2 block">Theme</label>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {THEMES.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full border-2 transition-all flex items-center gap-1.5 ${theme === t.id
                                        ? 'border-day-accent dark:border-night-accent bg-day-accent/10 dark:bg-night-accent/10'
                                        : 'border-day-border dark:border-night-border'
                                        }`}
                                    aria-label={`Select ${t.label} theme`}
                                    aria-pressed={theme === t.id}
                                >
                                    <span className="text-day-accent dark:text-night-accent">{THEME_ICONS[t.id]}</span>
                                    <span className="text-sm">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Type */}
                    {hasAiInsight && (
                        <div>
                            <label className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-2 block">Content</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setContentType('ai-insight')}
                                    className={`p-3 rounded-xl border-2 transition-all ${contentType === 'ai-insight'
                                        ? 'border-day-accent dark:border-night-accent bg-day-accent/10 dark:bg-night-accent/10'
                                        : 'border-day-border dark:border-night-border'
                                        }`}
                                    aria-label="Use AI insight analysis quote as content"
                                    aria-pressed={contentType === 'ai-insight'}
                                >
                                    <p className="font-medium">AI Insight</p>
                                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Analysis quote</p>
                                </button>
                                <button
                                    onClick={() => setContentType('dream-excerpt')}
                                    className={`p-3 rounded-xl border-2 transition-all ${contentType === 'dream-excerpt'
                                        ? 'border-day-accent dark:border-night-accent bg-day-accent/10 dark:bg-night-accent/10'
                                        : 'border-day-border dark:border-night-border'
                                        }`}
                                    aria-label="Use dream excerpt as content"
                                    aria-pressed={contentType === 'dream-excerpt'}
                                >
                                    <p className="font-medium">Dream Excerpt</p>
                                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Your words</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleDownload}
                            disabled={!previewUrl || isGenerating}
                            className="flex-1 py-3 border-2 border-day-accent dark:border-night-accent text-day-accent dark:text-night-accent font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                        </button>
                        <button
                            onClick={handleShare}
                            disabled={!previewUrl || isGenerating || isSharing}
                            className="flex-1 py-3 bg-day-accent dark:bg-night-accent text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSharing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                            )}
                            Share
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
