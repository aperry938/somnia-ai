import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { analyzeDream, generateDreamImage, generateDreamTitle, DreamArtStyle, DREAM_ART_STYLES } from '../../services/geminiService';
import { DreamChatModal } from '../modals/DreamChatModal';
import { ImageModal } from '../modals/ImageModal';
import { SleepAids, DreamMood } from '../../types';
import { AnalysisLoading, ImageGenerationLoading } from '../shared/LoadingStates';
import { TagInput, COMMON_DREAM_TAGS } from '../shared/TagInput';
import { findDreamSymbols, DreamSymbol } from '../../constants/dreamSymbols';
import { useToast } from '../shared/Toast';
import { logger } from '../../services/logger';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { isPremium } from '../../services/secureSubscriptionService';
import haptics from '../../services/hapticsService';
import { MOOD_ICONS, MOOD_LABELS } from '../../constants/uiIcons';

// Evening Reflection Display Component
const EveningReflectionDisplay: React.FC<{ aids: SleepAids }> = ({ aids }) => {
    const { dayRating, dayNotes } = aids;
    const hasData = dayRating || dayNotes;

    if (!hasData) {
        return null;
    }

    return (
        <div className="bg-day-card-bg/50 dark:bg-night-card-bg/50 border border-day-border dark:border-night-border rounded-lg p-4 mb-6">
            <h3 className="font-serif text-lg mb-2">Evening Reflection</h3>
            <div className="text-sm text-day-text-secondary dark:text-night-text-secondary space-y-2">
                {dayRating && <p><strong>Day Rating:</strong> {dayRating} / 5</p>}
                {dayNotes && <p><strong>Notes:</strong> "{dayNotes}"</p>}
            </div>
        </div>
    );
};

// Sleep Aids Display Component
const SleepAidsDisplay: React.FC<{ aids: SleepAids }> = ({ aids }) => {
    const { sound, relaxation, checklist } = aids;
    const hasAids = sound || relaxation || (checklist && checklist.length > 0);

    if (!hasAids) {
        return null;
    }

    const checklistTextMap: { [key: string]: string } = {
        'dim_lights': 'Dimmed lights',
        'no_screens': 'No screens',
        'cool_room': 'Cool room',
        'quiet_room': 'Quiet & dark room',
        'no_caffeine': 'No caffeine',
        'no_late_meals': 'No late meals',
    };

    return (
        <div className="bg-day-card-bg/50 dark:bg-night-card-bg/50 border border-day-border dark:border-night-border rounded-lg p-4 mb-6">
            <h3 className="font-serif text-lg mb-2">Sleep Gateway Settings</h3>
            <div className="text-sm text-day-text-secondary dark:text-night-text-secondary space-y-1">
                {sound && <p><strong>Soundscape:</strong> {sound}</p>}
                {relaxation && <p><strong>Relaxation:</strong> {relaxation}</p>}
                {checklist && checklist.length > 0 && (
                    <div>
                        <strong>Checklist:</strong>
                        <ul className="list-disc list-inside ml-2">
                            {checklist.map(key => <li key={key}>{checklistTextMap[key] || key}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};


// Accordion Item Component
const AccordionItem: React.FC<{ title: string; content: string; isOpenDefault?: boolean }> = ({ title, content, isOpenDefault = false }) => {
    const [isOpen, setIsOpen] = useState(isOpenDefault);
    const contentId = `accordion-content-${title.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div className="border-b border-day-border dark:border-night-border">
            <button
                className="w-full flex justify-between items-center py-4 min-h-[56px] text-left font-serif text-xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-day-accent dark:focus:ring-night-accent"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-controls={contentId}
            >
                <span>{title}</span>
                <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} aria-hidden="true">+</span>
            </button>
            <div id={contentId} className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
                <p className="pb-4 text-day-text-secondary dark:text-night-text-secondary whitespace-pre-wrap">{content}</p>
            </div>
        </div>
    );
};

// Main Dream Detail Component
export const DreamDetailPage: React.FC<{ dreamId: number | null; onBack: () => void; }> = ({ dreamId, onBack }) => {
    const { getDreamById, updateDream, deleteDream, biometrics, dreams, analysisPersonality, setAnalysisPersonality, artStyle } = useAppContext();
    const { showToast } = useToast();
    const dream = dreamId ? getDreamById(dreamId) : null;
    const [analysisState, setAnalysisState] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(dream?.dreamText || '');
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedArtStyle, setSelectedArtStyle] = useState<DreamArtStyle>(artStyle);
    const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);

    const detectedSymbols = useMemo(() => {
        if (!dream) return [];
        return findDreamSymbols(dream.dreamText);
    }, [dream]);

    // Voice Journaling Integration
    const { isListening, interimTranscript, startListening, stopListening, isSupported } = useSpeechRecognition((transcript) => {
        setEditedText(prev => (prev ? prev.trim() + ' ' : '') + transcript);
    });

    // Real-time preview of speech
    useEffect(() => {
        if (isListening) {
            // In edit mode we can't easily show interim in textarea without messing up cursor, 
            // but we can append it if we really wanted. For now, we rely on final transcript callback.
            // Or we could show a "Listening..." overlay.
        }
    }, [isListening, interimTranscript]);


    const performAnalysis = useCallback(async () => {
        if (!dream || dream.aiAnalysis) {
            if (dream?.aiAnalysis) setAnalysisState('success');
            return;
        }
        setAnalysisState('loading');
        try {
            const [analysisData, imageB64] = await Promise.all([
                analyzeDream(dream.dreamText, dream.sleepAids, biometrics, analysisPersonality),
                generateDreamImage(dream.dreamText, selectedArtStyle)
            ]);

            updateDream({
                id: dream.id,
                title: analysisData.title || dream.title,
                aiAnalysis: analysisData,
                imageUrl: `data:image/png;base64,${imageB64}`
            });
            setAnalysisState('success');
        } catch (e) {
            logger.error(e);
            setAnalysisState('error');
        }
    }, [dream, updateDream, analysisPersonality, selectedArtStyle, biometrics]);

    useEffect(() => {
        if (analysisState === 'pending') {
            performAnalysis();
        }
    }, [analysisState, performAnalysis]);

    const handleRetry = () => {
        setAnalysisState('pending');
    };

    const handleSaveEdit = () => {
        if (dream) {
            updateDream({ id: dream.id, dreamText: editedText });
            setIsEditing(false);
        }
    };

    if (!dream) {
        return <div className="text-center">Dream not found.</div>;
    }

    const date = new Date(dream.timestamp);

    return (
        <>
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={onBack} aria-label="Back to Chronicle" className="min-h-[44px] px-3 py-2 text-day-accent dark:text-night-accent flex items-center">&larr; Back to Chronicle</button>
                    <div className="flex gap-1">
                        <button onClick={() => setIsEditing(!isEditing)} aria-label={isEditing ? 'Cancel editing' : 'Edit dream'} className="min-h-[44px] min-w-[44px] px-3 py-2 text-sm text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent flex items-center">
                            {isEditing ? 'Cancel' : 'Edit'}
                        </button>
                        <button
                            onClick={async () => {
                                const shareData = {
                                    title: `Somnia Dream: ${dream.title}`,
                                    text: `${dream.title}\n${new Date(dream.timestamp).toLocaleDateString()}\n\n${dream.dreamText}\n\nAnalysed by Somnia.ai`,
                                };
                                try {
                                    if (navigator.share) {
                                        await navigator.share(shareData);
                                    } else {
                                        await navigator.clipboard.writeText(shareData.text);
                                        showToast('Dream copied to clipboard');
                                    }
                                } catch (err) {
                                    logger.error('Share failed:', err);
                                }
                            }}
                            aria-label="Share dream"
                            className="min-h-[44px] min-w-[44px] px-3 py-2 text-sm text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to delete this dream? This cannot be undone.')) {
                                    deleteDream(dream.id);
                                    showToast('Dream deleted');
                                    onBack();
                                }
                            }}
                            aria-label="Delete dream"
                            className="min-h-[44px] min-w-[44px] px-3 py-2 text-sm text-red-500 hover:text-red-700 flex items-center"
                        >
                            Delete
                        </button>
                    </div>
                </div>

                {dream.imageUrl ? (
                    <button onClick={() => setIsImageModalOpen(true)} aria-label="View full dream image" className="w-full">
                        <img src={dream.imageUrl} alt={dream.title} className="w-full h-64 object-cover rounded-lg mb-6" />
                    </button>
                ) : analysisState === 'loading' ? (
                    <div className="w-full h-64 rounded-lg bg-gray-200 dark:bg-gray-700 mb-6 animate-pulse flex items-center justify-center text-day-text-secondary">
                        Generating in {DREAM_ART_STYLES[selectedArtStyle].name} style...
                    </div>
                ) : analysisState === 'pending' ? (
                    <div className="w-full rounded-lg bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border p-4 mb-6">
                        <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-3">Choose art style for dream image:</p>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(DREAM_ART_STYLES) as DreamArtStyle[]).map(style => (
                                <button
                                    key={style}
                                    onClick={() => setSelectedArtStyle(style)}
                                    aria-pressed={selectedArtStyle === style}
                                    className={`px-4 py-2 min-h-[44px] rounded-full text-sm transition-colors flex items-center ${selectedArtStyle === style
                                        ? 'bg-day-accent dark:bg-night-accent text-white'
                                        : 'bg-white/50 dark:bg-black/20 hover:bg-white/70 dark:hover:bg-black/30'
                                        }`}
                                >
                                    {DREAM_ART_STYLES[style].name}
                                </button>
                            ))}
                        </div>
                        <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mt-4 mb-2">Choose analysis persona:</p>
                        <div className="flex flex-wrap gap-2">
                            {(['oneironaut', 'jungian', 'scientific'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setAnalysisPersonality(p)}
                                    aria-pressed={analysisPersonality === p}
                                    className={`px-4 py-2 min-h-[44px] rounded-full text-sm transition-colors flex items-center ${analysisPersonality === p
                                        ? 'bg-indigo-500 dark:bg-indigo-600 text-white'
                                        : 'bg-white/50 dark:bg-black/20 hover:bg-white/70 dark:hover:bg-black/30'
                                        }`}
                                >
                                    {p === 'oneironaut' ? 'The Oneironaut' : p === 'jungian' ? 'Shadow Walker' : 'Dr. REM'}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-64 rounded-lg bg-gray-200 dark:bg-gray-700 mb-6 flex items-center justify-center text-day-text-secondary">Image failed to load</div>
                )}

                <p className="text-day-text-secondary dark:text-night-text-secondary flex items-center gap-2 flex-wrap">
                    <span>{date.toLocaleString()}</span>

                    {/* Editable Sleep Quality */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 dark:bg-amber-400/10 rounded-full text-sm">
                        <span className="text-amber-600 dark:text-amber-400 text-xs mr-1">Quality:</span>
                        {[1, 2, 3, 4, 5].map(rating => (
                            <button
                                key={rating}
                                onClick={() => updateDream({ id: dream.id, sleepQuality: rating })}
                                className={`text-xl p-1 min-w-[32px] min-h-[32px] transition-colors ${dream.sleepQuality && rating <= dream.sleepQuality
                                        ? 'text-amber-500'
                                        : 'text-gray-300 dark:text-gray-600 hover:text-amber-300'
                                    }`}
                                title={`Set quality to ${rating}`}
                                aria-label={`Set quality to ${rating} stars`}
                                aria-pressed={dream.sleepQuality === rating}
                            >
                                ★
                            </button>
                        ))}
                    </span>

                    {/* Editable Mood */}
                    <span className="relative inline-flex items-center">
                        <select
                            value={dream.mood || ''}
                            onChange={(e) => updateDream({ id: dream.id, mood: e.target.value as DreamMood || undefined })}
                            aria-label="Dream mood"
                            className="appearance-none bg-day-accent/10 dark:bg-night-accent/10 text-day-accent dark:text-night-accent text-base min-h-[44px] rounded-full pl-4 pr-10 py-2 cursor-pointer hover:bg-day-accent/20 dark:hover:bg-night-accent/20 transition-colors border-0 focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
                        >
                            <option value="">Set mood...</option>
                            {(['joyful', 'peaceful', 'neutral', 'confused', 'anxious', 'sad', 'fearful'] as DreamMood[]).map(m => (
                                <option key={m} value={m}>{MOOD_ICONS[m]} {MOOD_LABELS[m]}</option>
                            ))}
                        </select>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-2 pointer-events-none text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </span>
                </p>
                <div className="flex items-center gap-2 mt-2 mb-4">
                    <h2 className="font-serif text-3xl">{dream.title}</h2>
                    <button
                        onClick={async () => {
                            setIsRegeneratingTitle(true);
                            try {
                                const newTitle = await generateDreamTitle(dream.dreamText);
                                updateDream({ id: dream.id, title: newTitle });
                                showToast('Title regenerated!');
                            } catch {
                                showToast('Failed to regenerate title', 'error');
                            } finally {
                                setIsRegeneratingTitle(false);
                            }
                        }}
                        disabled={isRegeneratingTitle}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent transition-colors disabled:opacity-50"
                        title="Regenerate title with AI"
                        aria-label="Regenerate title with AI"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRegeneratingTitle ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                {dream.sleepAids && <EveningReflectionDisplay aids={dream.sleepAids} />}
                {dream.sleepAids && <SleepAidsDisplay aids={dream.sleepAids} />}

                {isEditing ? (
                    <div>
                        <div className="relative">
                            <textarea
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                className="w-full h-48 p-3 bg-white/80 dark:bg-black/30 border border-day-border dark:border-night-border rounded-md focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent pr-12"
                                disabled={isListening}
                            />
                            {isSupported && (
                                <button
                                    onClick={isListening ? stopListening : startListening}
                                    className={`absolute top-2 right-2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${isListening ? 'text-red-500 bg-red-100 dark:bg-red-900/30' : 'text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    title={isListening ? "Stop recording" : "Dictate dream"}
                                    aria-label={isListening ? "Stop recording" : "Dictate dream"}
                                    aria-pressed={isListening}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                    {isListening && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                        <button onClick={handleSaveEdit} aria-label="Save changes" className="mt-2 px-6 py-3 min-h-[48px] bg-day-accent text-white rounded-full flex items-center justify-center">Save Changes</button>
                    </div>
                ) : (
                    <>
                        <p className="text-lg leading-relaxed whitespace-pre-wrap">{dream.dreamText}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-3">
                            {dream.dreamText.split(/\s+/).filter(w => w.length > 0).length} words • {dream.dreamText.length} characters
                        </p>
                    </>
                )}

                {/* Dream Tags Section */}
                <div className="mt-6">
                    <label className="block text-sm text-day-text-secondary dark:text-night-text-secondary mb-2">Dream Tags</label>
                    <TagInput
                        tags={dream.tags || []}
                        onChange={(newTags) => updateDream({ id: dream.id, tags: newTags })}
                        suggestions={COMMON_DREAM_TAGS}
                        placeholder="Add tags (flying, lucid, recurring...)"
                    />
                </div>

                {/* Dream Symbols Section */}
                {detectedSymbols.length > 0 && (
                    <details className="mt-6 bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl group">
                        <summary className="p-4 cursor-pointer flex items-center justify-between list-none">
                            <h3 className="font-serif text-lg flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Detected Symbols ({detectedSymbols.length})
                            </h3>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-text-secondary dark:text-night-text-secondary transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </summary>
                        <div className="px-4 pb-4 space-y-3">
                            {detectedSymbols.map(symbol => (
                                <div key={symbol.symbol} className="text-sm">
                                    <span className="font-medium text-day-accent dark:text-night-accent">{symbol.symbol}</span>
                                    <span className="mx-2 text-day-text-secondary dark:text-night-text-secondary">—</span>
                                    <span className="text-day-text-secondary dark:text-night-text-secondary">{symbol.meaning}</span>
                                </div>
                            ))}
                        </div>
                    </details>
                )}

                {/* Discuss with AI - PRO Feature */}
                <div className="mt-6 mb-4">
                    {isPremium() ? (
                        <button
                            onClick={() => { haptics.medium(); setIsChatOpen(true); }}
                            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Discuss This Dream with AI
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">PRO</span>
                        </button>
                    ) : (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <div className="flex-grow">
                                    <p className="font-medium text-amber-800 dark:text-amber-200">Discuss This Dream with AI</p>
                                    <p className="text-sm text-amber-600 dark:text-amber-400">Unlock personalized dream interpretation and deeper insights</p>
                                </div>
                                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">PRO</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-day-border dark:border-night-border">
                    {analysisState === 'loading' && (
                        <div className="text-center text-day-accent dark:text-night-accent">
                            <svg className="animate-spin h-8 w-8 text-current mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <p className="mt-2">Illuminating...</p>
                        </div>
                    )}
                    {analysisState === 'error' && (
                        <div className="text-center">
                            <p className="text-red-500">Sorry, the analysis could not be completed.</p>
                            <button onClick={handleRetry} aria-label="Retry dream analysis" className="mt-2 px-6 py-3 min-h-[48px] bg-day-accent text-white rounded-full flex items-center justify-center">
                                Retry Analysis
                            </button>
                        </div>
                    )}
                    {analysisState === 'success' && dream.aiAnalysis && (
                        <div className="space-y-2">
                            {dream.aiAnalysis.analysis.map((item, i) => (
                                <AccordionItem key={i} title={item.title} content={item.content} isOpenDefault={i === 0} />
                            ))}
                            <AccordionItem title={dream.aiAnalysis.integration.title} content={dream.aiAnalysis.integration.content} />
                        </div>
                    )}
                </div>
            </div>

            {/* Related Dreams Section */}
            {dream?.tags && dream.tags.length > 0 && (() => {
                const relatedDreams = dreams.filter(d =>
                    d.id !== dream.id &&
                    d.tags?.some(t => dream.tags?.includes(t))
                ).slice(0, 3);

                if (relatedDreams.length === 0) return null;

                return (
                    <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-xl mt-6">
                        <h3 className="font-serif text-lg mb-3">Related Dreams</h3>
                        <div className="space-y-2">
                            {relatedDreams.map(rd => {
                                const sharedTags = rd.tags?.filter(t => dream.tags?.includes(t)) || [];
                                return (
                                    <div
                                        key={rd.id}
                                        className="p-3 bg-white/50 dark:bg-black/20 rounded-lg"
                                    >
                                        <p className="font-medium truncate">{rd.title || 'Untitled'}</p>
                                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                            {new Date(rd.timestamp).toLocaleDateString()} •
                                            {sharedTags.map(t => ` #${t}`).join('')}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {isChatOpen && dream && <DreamChatModal dream={dream} onClose={() => setIsChatOpen(false)} />}
            {isImageModalOpen && dream?.imageUrl && <ImageModal src={dream.imageUrl} onClose={() => setIsImageModalOpen(false)} />}
        </>
    );
};