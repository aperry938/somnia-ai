import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

interface ShareDreamModalProps {
    dream: Dream;
    isOpen: boolean;
    onClose: () => void;
}

const THEMES: { id: ShareCardTheme; label: string; emoji: string }[] = [
    { id: 'cosmic', label: 'Cosmic', emoji: '✨' },
    { id: 'serene', label: 'Serene', emoji: '🌊' },
    { id: 'mystic', label: 'Mystic', emoji: '🔮' },
    { id: 'dawn', label: 'Dawn', emoji: '🌅' },
    { id: 'night', label: 'Night', emoji: '🌙' },
];

const FORMATS: { id: ShareCardFormat; label: string; platforms: string }[] = [
    { id: 'square', label: 'Square', platforms: 'Instagram, X, Facebook' },
    { id: 'vertical', label: 'Story', platforms: 'TikTok, IG Story' },
];

export const ShareDreamModal: React.FC<ShareDreamModalProps> = ({ dream, isOpen, onClose }) => {
    const [format, setFormat] = useState<ShareCardFormat>('square');
    const [theme, setTheme] = useState<ShareCardTheme>(() => getThemeForMood(dream.mood));
    const [contentType, setContentType] = useState<'dream-excerpt' | 'ai-insight'>('ai-insight');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    // Generate preview when options change
    useEffect(() => {
        if (!isOpen) return;

        const generatePreview = async () => {
            setIsGenerating(true);
            try {
                const url = await generateShareCard({ dream, format, theme, contentType });
                setPreviewUrl(url);
            } catch (error) {
                console.error('Failed to generate preview:', error);
            }
            setIsGenerating(false);
        };

        generatePreview();
    }, [dream, format, theme, contentType, isOpen]);

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

    const hasAiInsight = !!dream.aiAnalysis?.interpretation;

    return (
        <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                    <h2 className="font-serif text-xl">Share Dream</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10"
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
                                    className={`flex-shrink-0 px-4 py-2 rounded-full border-2 transition-all ${theme === t.id
                                            ? 'border-day-accent dark:border-night-accent bg-day-accent/10 dark:bg-night-accent/10'
                                            : 'border-day-border dark:border-night-border'
                                        }`}
                                >
                                    <span className="mr-1">{t.emoji}</span>
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
