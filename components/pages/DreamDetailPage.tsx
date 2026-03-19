import React, { useEffect, useState, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { analyzeDream, generateDreamTitle, generateImagePrompt, DreamArtStyle, DREAM_ART_STYLES, generateDreamEmbedding, OfflineError } from '../../services/geminiService';
import { SleepAids, DreamMood } from '../../types';
import { AnalysisLoading as _AnalysisLoading, ModalLoading } from '../shared/LoadingStates';
import { TagInput, COMMON_DREAM_TAGS } from '../shared/TagInput';
import { findDreamSymbols, DreamSymbol as _DreamSymbol } from '../../constants/dreamSymbols';
import { useToast } from '../shared/Toast';
import { logger } from '../../services/logger';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { isPremium } from '../../services/secureSubscriptionService';
import haptics from '../../services/hapticsService';
import { MOOD_ICONS, MOOD_LABELS } from '../../constants/uiIcons';
import { processDejaVuCheck, DejaVuMatch } from '../../services/dejaVuService';
import { CALIBRATION_DREAM } from '../../constants/demoDreams';
import { hasAIConsent } from '../../services/aiConsentService';
import { queueForAnalysis, isQueued, isOnline } from '../../services/offlineQueueService';
import { Capacitor } from '@capacitor/core';

// Lazy load heavy modals
const DreamChatModal = lazy(() => import('../modals/DreamChatModal').then(m => ({ default: m.DreamChatModal })));
const AIConsentModal = lazy(() => import('../modals/AIConsentModal').then(m => ({ default: m.AIConsentModal })));
const ShareDreamModal = lazy(() => import('../modals/ShareDreamModal').then(m => ({ default: m.ShareDreamModal })));

// Evening Reflection Display Component
const EveningReflectionDisplay: React.FC<{ aids: SleepAids }> = ({ aids }) => {
    const { dayRating, dayNotes, totalPrepTime } = aids;
    const hasData = dayRating || dayNotes || totalPrepTime;

    if (!hasData) {
        return null;
    }

    return (
        <div className="bg-day-card-bg/50 dark:bg-night-card-bg/50 border border-day-border dark:border-night-border rounded-lg p-4 mb-6">
            <h3 className="font-serif text-lg mb-2">Evening Reflection</h3>
            <div className="text-sm text-day-text-secondary dark:text-night-text-secondary space-y-2">
                {dayRating && <p><strong>Day Rating:</strong> {dayRating} / 5</p>}
                {dayNotes && <p><strong>Notes:</strong> "{dayNotes}"</p>}
                {totalPrepTime && totalPrepTime > 0 && (
                    <p><strong>Total Prep Time:</strong> {Math.round(totalPrepTime / 60)} min</p>
                )}
            </div>
        </div>
    );
};

// Sleep Activities Display Component (soundscapes, breathing, checklist)
const SleepAidsDisplay: React.FC<{ aids: SleepAids }> = ({ aids }) => {
    const { sound, soundDuration, soundsPlayed, breathingExercises, checklist } = aids;

    // Check for any activity
    const hasActivities = sound || (soundsPlayed && soundsPlayed.length > 0) ||
        (breathingExercises && breathingExercises.length > 0) ||
        (checklist && checklist.length > 0);

    if (!hasActivities) {
        return null;
    }

    const checklistTextMap: { [key: string]: string } = {
        'dim_lights': 'Dimmed lights',
        'no_screens': 'No screens',
        'blue_light': 'Blue light filter',
        'cool_room': 'Cool room',
        'quiet_room': 'Quiet & dark room',
        'no_caffeine': 'No caffeine',
        'no_late_meals': 'No late meals',
    };

    return (
        <div className="bg-day-card-bg/50 dark:bg-night-card-bg/50 border border-day-border dark:border-night-border rounded-lg p-4 mb-6">
            <h3 className="font-serif text-lg mb-3">Sleep Activities</h3>
            <div className="text-sm text-day-text-secondary dark:text-night-text-secondary space-y-3">

                {/* Breathing Exercises */}
                {breathingExercises && breathingExercises.length > 0 && (
                    <div>
                        <strong className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            Breathing Exercises
                        </strong>
                        <div className="flex flex-wrap gap-2 ml-6">
                            {breathingExercises.map((ex, i) => (
                                <span key={i} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                                    {ex.name} ({Math.round(ex.duration / 60)}m)
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Soundscapes */}
                {soundsPlayed && soundsPlayed.length > 0 && (
                    <div>
                        <strong className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            Soundscapes
                        </strong>
                        <div className="flex flex-wrap gap-2 ml-6">
                            {soundsPlayed.map((s, i) => (
                                <span key={i} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
                                    {s.name} ({Math.round(s.duration / 60)}m)
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Legacy single sound field */}
                {sound && !soundsPlayed?.length && (
                    <div>
                        <strong className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            Soundscape
                        </strong>
                        <p className="ml-6">{sound} {soundDuration ? `(${soundDuration}m)` : ''}</p>
                    </div>
                )}

                {/* Checklist */}
                {checklist && checklist.length > 0 && (
                    <div>
                        <strong className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Sleep Checklist
                        </strong>
                        <ul className="ml-6 space-y-1">
                            {checklist.map(key => (
                                <li key={key} className="flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline text-green-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> {checklistTextMap[key] || key}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};


// Crisis keywords that trigger mental health resource display
const CRISIS_KEYWORDS = ['suicide', 'self-harm', 'hurting myself', 'ending it', 'kill myself', 'want to die'];

const hasCrisisContent = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

// Accordion Item Component
const AccordionItem: React.FC<{ title: string; content: string; isOpenDefault?: boolean }> = ({ title, content, isOpenDefault = false }) => {
    const [isOpen, setIsOpen] = useState(isOpenDefault);
    const buttonId = `accordion-button-${title.replace(/\s+/g, '-').toLowerCase()}`;
    const contentId = `accordion-content-${title.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div className="border-b border-day-border dark:border-night-border">
            <h3>
                <button
                    id={buttonId}
                    className="w-full flex justify-between items-center py-4 min-h-[56px] text-left font-serif text-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-day-accent dark:focus-visible:ring-night-accent"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                >
                    <span>{title}</span>
                    <span className={`transform transition-transform duration-300 text-2xl leading-none ${isOpen ? 'rotate-45' : ''}`} aria-hidden="true">+</span>
                </button>
            </h3>
            <div
                id={contentId}
                role="region"
                aria-labelledby={buttonId}
                className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-screen' : 'max-h-0'}`}
            >
                <p className="pb-4 text-day-text-secondary dark:text-night-text-secondary whitespace-pre-wrap">{content}</p>
            </div>
        </div>
    );
};

// Main Dream Detail Component
export const DreamDetailPage: React.FC<{ dreamId: number | null; onBack: () => void; onNavigateToDream?: (dreamId: number) => void; }> = ({ dreamId, onBack, onNavigateToDream }) => {
    const { getDreamById, updateDream, deleteDream, biometrics, dreams, analysisPersonality, setAnalysisPersonality: _setAnalysisPersonality, artStyle: _artStyle } = useAppContext();
    const { showToast } = useToast();
    // Use calibration dream for sample, otherwise get from context
    const dream = dreamId === CALIBRATION_DREAM.id ? CALIBRATION_DREAM : (dreamId ? getDreamById(dreamId) : null);
    const isCalibrationDream = dreamId === CALIBRATION_DREAM.id;
    const isReadOnly = isCalibrationDream; // Calibration dream is read-only sample
    const [analysisState, setAnalysisState] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(dream?.dreamText || '');
    const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);
    const [selectedPromptStyle, setSelectedPromptStyle] = useState<DreamArtStyle>('surreal');
    const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [dejaVuMatch, setDejaVuMatch] = useState<DejaVuMatch | null>(null);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const detectedSymbols = useMemo(() => {
        if (!dream) return [];
        return findDreamSymbols(dream.dreamText);
    }, [dream]);

    // Voice Journaling Integration
    const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition((transcript) => {
        setEditedText((prev: string) => (prev ? prev.trim() + ' ' : '') + transcript);
    });

    // Cleanup speech recognition on unmount
    useEffect(() => {
        return () => {
            if (isListening) {
                stopListening();
            }
        };
    }, [isListening, stopListening]);

    // Keyboard handling for native mobile using visualViewport API
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const handleResize = () => {
            if (window.visualViewport) {
                const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.75;
                setKeyboardVisible(isKeyboardOpen);

                if (isKeyboardOpen && textareaRef.current && isEditing) {
                    setTimeout(() => {
                        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            }
        };

        window.visualViewport?.addEventListener('resize', handleResize);

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
        };
    }, [isEditing]);

    // Cleanup abort controller on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const performAnalysis = useCallback(async () => {
        if (!dream || dream.aiAnalysis) {
            if (dream?.aiAnalysis) setAnalysisState('success');
            return;
        }

        // Check for AI consent before first analysis
        if (!hasAIConsent()) {
            setShowConsentModal(true);
            return;
        }

        // Check if offline - queue for later analysis
        if (!isOnline()) {
            // Only queue if not already queued
            if (!isQueued(dream.id)) {
                queueForAnalysis(dream.id, dream.dreamText);
                showToast('Dream queued for analysis when back online', 'info');
            }
            setAnalysisState('pending');
            return;
        }

        // Check daily analysis limit (5 per day)
        const today = new Date().toDateString();
        const storedAnalysis = localStorage.getItem('somnia_daily_analysis');
        let lastDateAnalysis = '';
        let countAnalysisStr = '0';
        try {
            const parsed = storedAnalysis ? JSON.parse(storedAnalysis) : ['', '0'];
            [lastDateAnalysis, countAnalysisStr] = Array.isArray(parsed) ? parsed : ['', '0'];
        } catch {
            // Corrupted data, reset to defaults
            lastDateAnalysis = '';
            countAnalysisStr = '0';
        }
        const countAnalysis = lastDateAnalysis === today ? parseInt(countAnalysisStr) : 0;

        if (countAnalysis >= 5) {
            showToast('Daily dream analysis limit reached (5/day)', 'error');
            return;
        }

        // Cancel any previous in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setAnalysisState('loading');
        try {
            // First perform text analysis
            const analysisData = await analyzeDream(dream.dreamText, dream.sleepAids, biometrics, analysisPersonality);

            // Check if component is still mounted (abort not triggered)
            if (abortControllerRef.current?.signal.aborted) return;

            // Increment analysis count
            localStorage.setItem('somnia_daily_analysis', JSON.stringify([today, countAnalysis + 1]));

            // Generate embedding for semantic similarity (Deja Vu detection)
            let embedding: number[] | undefined;
            try {
                embedding = await generateDreamEmbedding(dream.dreamText);

                // Check for Deja Vu (similar dream from 30+ days ago)
                if (embedding && isPremium() && !abortControllerRef.current?.signal.aborted) {
                    const match = await processDejaVuCheck(dream.id, embedding, dreams);
                    if (match) {
                        setDejaVuMatch(match);
                        haptics.success();
                        showToast(`Deja Reve! This echoes a dream from ${match.daysAgo} days ago`, 'info');
                    }
                }
            } catch (embeddingError) {
                // Embedding generation is optional - don't fail the whole analysis
                logger.error('Embedding generation failed:', embeddingError);
            }

            // Final check before state update
            if (abortControllerRef.current?.signal.aborted) return;

            updateDream({
                id: dream.id,
                title: analysisData.title || dream.title,
                aiAnalysis: analysisData,
                embedding,
            });
            setAnalysisState('success');
        } catch (e) {
            // Don't log abort errors
            if (e instanceof Error && e.name === 'AbortError') return;

            logger.error(e);
            // If offline error, queue for later analysis
            if (e instanceof OfflineError) {
                queueForAnalysis(dream.id, dream.dreamText);
                showToast('Dream queued for analysis when back online', 'info');
                setAnalysisState('pending');
            } else {
                setAnalysisState('error');
            }
        }
    }, [dream, updateDream, analysisPersonality, biometrics, showToast, dreams]);

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
                    <button type="button" onClick={onBack} aria-label="Back to Chronicle" className="min-h-[44px] px-3 py-2 text-day-accent dark:text-night-accent flex items-center active:scale-95 transition-transform">&larr; Back to Chronicle</button>
                    <div className="flex gap-1">
                        {!isReadOnly && (
                            <button type="button" onClick={() => setIsEditing(!isEditing)} aria-label={isEditing ? 'Cancel editing' : 'Edit dream'} className="min-h-[44px] min-w-[44px] px-3 py-2 text-sm text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent flex items-center active:scale-95 transition-transform">
                                {isEditing ? 'Cancel' : 'Edit'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                haptics.medium();
                                setIsShareOpen(true);
                            }}
                            aria-label="Share dream as card"
                            className="min-h-[44px] min-w-[44px] px-3 py-2 text-sm text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent flex items-center gap-1 active:scale-95 transition-transform"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share
                        </button>
                        {!isReadOnly && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this dream? This cannot be undone.')) {
                                        deleteDream(dream.id);
                                        showToast('Dream deleted');
                                        onBack();
                                    }
                                }}
                                aria-label="Delete dream permanently"
                                className="min-h-[44px] min-w-[44px] px-3 py-2 text-sm text-red-500 hover:text-red-700 flex items-center active:scale-95 transition-transform"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>




                <p className="text-day-text-secondary dark:text-night-text-secondary flex items-center gap-2 flex-wrap">
                    <span>{date.toLocaleString()}</span>

                    {/* Editable Sleep Quality */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 dark:bg-amber-400/10 rounded-full text-sm">
                        <span className="text-amber-600 dark:text-amber-400 text-xs mr-1">Quality:</span>
                        {[1, 2, 3, 4, 5].map(rating => (
                            <button
                                key={rating}
                                onClick={() => {
                                    if (isReadOnly) return;
                                    updateDream({ id: dream.id, sleepQuality: rating });
                                }}
                                disabled={isReadOnly}
                                className={`text-xl p-2 min-w-[44px] min-h-[44px] transition-colors ${dream.sleepQuality && rating <= dream.sleepQuality
                                    ? 'text-amber-500'
                                    : 'text-gray-300 dark:text-gray-600 hover:text-amber-300'
                                    } ${isReadOnly ? 'cursor-not-allowed opacity-50' : ''}`}
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
                            onChange={(e) => {
                                if (isReadOnly) return;
                                updateDream({ id: dream.id, mood: e.target.value as DreamMood || undefined });
                            }}
                            disabled={isReadOnly}
                            aria-label="Dream mood"
                            className={`appearance-none bg-day-accent/10 dark:bg-night-accent/10 text-day-accent dark:text-night-accent text-base min-h-[44px] rounded-full pl-4 pr-10 py-2 cursor-pointer hover:bg-day-accent/20 dark:hover:bg-night-accent/20 transition-colors border-0 focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent ${isReadOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                            <option value="">Set mood...</option>
                            {(['joyful', 'peaceful', 'neutral', 'confused', 'anxious', 'sad', 'fearful', 'nightmare'] as DreamMood[]).map(m => (
                                <option key={m} value={m}>{MOOD_ICONS[m]} {MOOD_LABELS[m]}</option>
                            ))}
                        </select>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-2 pointer-events-none text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </span>
                </p>
                <div className="flex items-center gap-2 mt-2 mb-4">
                    <h1 className="font-serif text-3xl">{dream.title}</h1>
                    <button
                        type="button"
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
                        disabled={isRegeneratingTitle || isReadOnly}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent transition-colors disabled:opacity-50 active:scale-95"
                        title="Regenerate title with AI"
                        aria-label={isRegeneratingTitle ? "Regenerating title..." : "Regenerate title with AI"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRegeneratingTitle ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                {/* Deja Vu Alert Banner */}
                {dejaVuMatch && (
                    <button
                        type="button"
                        onClick={() => {
                            if (onNavigateToDream) {
                                haptics.light();
                                onNavigateToDream(dejaVuMatch.dreamId);
                            }
                        }}
                        className="w-full mb-6 min-h-[80px] bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 dark:border-purple-700/50 rounded-xl p-4 animate-fadeIn hover:border-purple-400 dark:hover:border-purple-500 active:scale-[0.98] transition-all text-left group"
                        aria-label={`Deja Reve detected: This dream is ${Math.round(dejaVuMatch.similarity * 100)}% similar to ${dejaVuMatch.title} from ${dejaVuMatch.daysAgo} days ago. Tap to view the connected dream.`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                            </div>
                            <div className="flex-grow">
                                <span className="font-serif text-purple-800 dark:text-purple-200 font-medium block">Deja Reve Detected!</span>
                                <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">
                                    This dream is <strong>{Math.round(dejaVuMatch.similarity * 100)}% similar</strong> to "<span className="underline group-hover:text-purple-800 dark:group-hover:text-purple-100">{dejaVuMatch.title}</span>" from {dejaVuMatch.daysAgo} days ago.
                                </p>
                                <p className="text-xs text-purple-500 dark:text-purple-400 mt-2 flex items-center gap-1" aria-hidden="true">
                                    <span className="italic">Tap to view the connected dream</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </p>
                            </div>
                        </div>
                    </button>
                )}

                {dream.sleepAids && <EveningReflectionDisplay aids={dream.sleepAids} />}
                {dream.sleepAids && <SleepAidsDisplay aids={dream.sleepAids} />}

                {isEditing ? (
                    <div className={`${keyboardVisible ? 'pb-4' : ''}`}>
                        <div className="relative">
                            <label htmlFor="dream-text-editor" className="sr-only">Edit dream text</label>
                            <textarea
                                id="dream-text-editor"
                                ref={textareaRef}
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                className="w-full h-48 p-3 bg-white/80 dark:bg-black/30 border border-day-border dark:border-night-border rounded-md focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent pr-14 text-base resize-none"
                                disabled={isListening}
                                autoComplete="off"
                                autoCorrect="on"
                                spellCheck="true"
                                enterKeyHint="done"
                            />
                            {isSupported && (
                                <button
                                    type="button"
                                    onClick={isListening ? stopListening : startListening}
                                    className={`absolute top-2 right-2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${isListening ? 'text-red-500 bg-red-100 dark:bg-red-900/30' : 'text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    title={isListening ? "Stop recording" : "Dictate dream"}
                                    aria-label={isListening ? "Stop voice recording" : "Start voice dictation for dream text"}
                                    aria-pressed={isListening}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                    {isListening && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3" aria-hidden="true">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                        <button type="button" onClick={handleSaveEdit} className="mt-3 px-6 py-3 min-h-[48px] bg-day-accent text-white rounded-full flex items-center justify-center font-medium active:scale-95 transition-transform">Save Changes</button>
                    </div>
                ) : (
                    <>
                        <p className="text-lg leading-relaxed whitespace-pre-wrap">{dream.dreamText}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-3">
                            {dream.dreamText.split(/\s+/).filter((w: string) => w.length > 0).length} words • {dream.dreamText.length} characters
                        </p>
                    </>
                )}

                {/* Crisis Resources Banner */}
                {hasCrisisContent(dream.dreamText) && (
                    <div
                        className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4"
                        role="alert"
                        aria-live="polite"
                    >
                        <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                            If you're experiencing difficult thoughts, help is available 24/7:
                        </p>
                        <a
                            href="tel:988"
                            className="inline-flex items-center gap-2 mt-2 px-4 py-3 min-h-[48px] bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 active:scale-95 transition-all"
                            aria-label="Call 988 Suicide and Crisis Lifeline"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Call 988 Crisis Lifeline
                        </a>
                    </div>
                )}

                {/* Dream Tags Section */}
                <div className="mt-6">
                    <label className="block text-sm text-day-text-secondary dark:text-night-text-secondary mb-2">Dream Tags</label>
                    <TagInput
                        tags={dream.tags || []}
                        onChange={(newTags) => {
                            if (isReadOnly) return;
                            updateDream({ id: dream.id, tags: newTags });
                        }}
                        suggestions={COMMON_DREAM_TAGS}
                        placeholder="Add tags (flying, lucid, recurring...)"
                        disabled={isReadOnly}
                    />
                </div>

                {/* Dream Symbols Section */}
                {detectedSymbols.length > 0 && (
                    <details className="mt-6 bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl group">
                        <summary className="p-4 min-h-[56px] cursor-pointer flex items-center justify-between list-none select-none active:bg-black/5 dark:active:bg-white/5 rounded-xl transition-colors">
                            <span className="font-serif text-lg flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Detected Symbols ({detectedSymbols.length})
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-text-secondary dark:text-night-text-secondary transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </summary>
                        <ul className="px-4 pb-4 space-y-3" role="list" aria-label="Dream symbols and their meanings">
                            {detectedSymbols.map(symbol => (
                                <li key={symbol.symbol} className="text-sm py-1">
                                    <span className="font-medium text-day-accent dark:text-night-accent">{symbol.symbol}</span>
                                    <span className="mx-2 text-day-text-secondary dark:text-night-text-secondary" aria-hidden="true">-</span>
                                    <span className="text-day-text-secondary dark:text-night-text-secondary">{symbol.meaning}</span>
                                </li>
                            ))}
                        </ul>
                    </details>
                )}

                {/* Discuss with AI - PRO Feature */}
                <div className="mt-6 mb-4">
                    {isPremium() ? (
                        <button
                            type="button"
                            onClick={() => { haptics.medium(); setIsChatOpen(true); }}
                            className="w-full py-3 min-h-[48px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Discuss This Dream with AI
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                PRO
                            </span>
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
                                <span className="inline-flex items-center gap-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    PRO
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-day-border dark:border-night-border" aria-busy={analysisState === 'loading'}>
                    {analysisState === 'loading' && (
                        <div className="text-center text-day-accent dark:text-night-accent" role="status" aria-live="polite">
                            <svg className="animate-spin h-8 w-8 text-current mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <p className="mt-2">Analyzing your dream...</p>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-1">This may take a few moments</p>
                        </div>
                    )}
                    {analysisState === 'error' && (
                        <div className="text-center" role="alert">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-red-500 font-medium">Analysis could not be completed</p>
                            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mt-1">Please check your connection and try again</p>
                            <button
                                type="button"
                                onClick={handleRetry}
                                className="mt-4 px-6 py-3 min-h-[48px] bg-day-accent text-white rounded-full inline-flex items-center justify-center gap-2 font-medium active:scale-95 transition-transform"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Retry Analysis
                            </button>
                        </div>
                    )}
                    {analysisState === 'success' && dream.aiAnalysis && (
                        <div className="space-y-2">
                            <p className="text-xs italic text-day-text-secondary dark:text-night-text-secondary mb-2">
                                AI-generated interpretation for reflection purposes only. Not psychological or medical advice.
                            </p>
                            {dream.aiAnalysis.analysis.map((item: { title: string; content: string }, i: number) => (
                                <AccordionItem key={i} title={item.title} content={item.content} isOpenDefault={i === 0} />
                            ))}
                            <AccordionItem title={dream.aiAnalysis.integration.title} content={dream.aiAnalysis.integration.content} />

                            {/* Dream Visualization Section */}
                            <div className="mt-6 rounded-xl overflow-hidden border border-purple-200/50 dark:border-purple-800/50">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 px-4 py-3">
                                    <h4 className="font-serif text-base text-purple-800 dark:text-purple-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>Bring Your Dream to Life</h4>
                                    <p className="text-xs text-purple-600/80 dark:text-purple-300/80 mt-0.5">
                                        Create a personalized visualization of your dream
                                    </p>
                                </div>

                                {/* Content */}
                                <div className="bg-white/50 dark:bg-black/20 p-4 space-y-4">
                                    {/* Saved Image Display */}
                                    {dream.imageUrl && (
                                        <div className="relative group">
                                            <img
                                                src={dream.imageUrl}
                                                alt={`Dream visualization for ${dream.title || 'this dream'}`}
                                                loading="lazy"
                                                className="w-full h-48 object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isReadOnly) return;
                                                    if (window.confirm('Remove this visualization image?')) {
                                                        updateDream({ id: dream.id, imageUrl: null });
                                                        showToast('Image removed');
                                                    }
                                                }}
                                                disabled={isReadOnly}
                                                className={`absolute top-2 right-2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-95 transition-all ${isReadOnly ? 'cursor-not-allowed' : ''}`}
                                                aria-label="Remove visualization image"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}

                                    {/* Generated Prompt Display */}
                                    {(generatedPrompt || dream.aiAnalysis?.imagePrompt) && (
                                        <div className="bg-purple-50/50 dark:bg-purple-900/20 rounded-lg p-3">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Your Visualization Prompt</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const prompt = generatedPrompt || dream.aiAnalysis?.imagePrompt || '';
                                                        navigator.clipboard.writeText(prompt).then(() => {
                                                            haptics.success();
                                                            showToast('Prompt copied to clipboard');
                                                        }).catch(() => {
                                                            showToast('Failed to copy to clipboard', 'error');
                                                        });
                                                    }}
                                                    className="px-3 py-2 min-h-[44px] text-xs font-medium bg-purple-600 text-white rounded-full hover:bg-purple-700 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                                                    aria-label="Copy visualization prompt to clipboard"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    Copy
                                                </button>
                                            </div>
                                            <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed italic">"{generatedPrompt || dream.aiAnalysis?.imagePrompt}"</p>
                                        </div>
                                    )}

                                    {/* Style Picker & Generate Button */}
                                    {(() => {
                                        const today = new Date().toDateString();
                                        const storedPrompt = localStorage.getItem('somnia_daily_prompts');
                                        let lastDatePrompt = '';
                                        let countPromptStr = '0';
                                        try {
                                            const parsed = storedPrompt ? JSON.parse(storedPrompt) : ['', '0'];
                                            [lastDatePrompt, countPromptStr] = Array.isArray(parsed) ? parsed : ['', '0'];
                                        } catch {
                                            // Corrupted data, reset to defaults
                                            lastDatePrompt = '';
                                            countPromptStr = '0';
                                        }
                                        const promptCount = lastDatePrompt === today ? parseInt(countPromptStr) : 0;
                                        const limitReached = promptCount >= 5;

                                        return (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-medium text-purple-600 dark:text-purple-400 block mb-2">Choose Art Style</label>
                                                    <div className="flex flex-wrap gap-2" role="group" aria-label="Art style selection">
                                                        {(Object.keys(DREAM_ART_STYLES) as DreamArtStyle[]).map(style => (
                                                            <button
                                                                type="button"
                                                                key={style}
                                                                onClick={() => setSelectedPromptStyle(style)}
                                                                className={`px-4 py-2 text-sm rounded-full min-h-[44px] active:scale-95 transition-all ${selectedPromptStyle === style
                                                                    ? 'bg-purple-600 text-white'
                                                                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/40'
                                                                    }`}
                                                                aria-pressed={selectedPromptStyle === style}
                                                                aria-label={`Select ${DREAM_ART_STYLES[style].name} art style`}
                                                            >
                                                                {DREAM_ART_STYLES[style].name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (isReadOnly) return;
                                                        if (limitReached) {
                                                            showToast('Daily prompt limit reached (5/day)', 'info');
                                                            return;
                                                        }
                                                        setIsGeneratingPrompt(true);
                                                        try {
                                                            const prompt = await generateImagePrompt(dream.dreamText, selectedPromptStyle);
                                                            setGeneratedPrompt(prompt);
                                                            localStorage.setItem('somnia_daily_prompts', JSON.stringify([today, promptCount + 1]));
                                                            haptics.success();
                                                            showToast('Prompt generated! Copy and paste into your AI image generator');
                                                        } catch (e) {
                                                            logger.error(e);
                                                            showToast('Failed to generate prompt', 'error');
                                                        } finally {
                                                            setIsGeneratingPrompt(false);
                                                        }
                                                    }}
                                                    disabled={isGeneratingPrompt || limitReached || isReadOnly}
                                                    className="w-full px-4 py-3 min-h-[48px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                    aria-busy={isGeneratingPrompt}
                                                >
                                                    {isGeneratingPrompt ? (
                                                        <>
                                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                            Crafting your prompt...
                                                        </>
                                                    ) : limitReached ? (
                                                        <>Daily limit reached (5/day)</>
                                                    ) : (
                                                        <>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            Generate Image Prompt ({promptCount}/5 today)
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })()}

                                    {/* Instructions */}
                                    <details className="group/details">
                                        <summary className="text-sm text-purple-600 dark:text-purple-400 cursor-pointer hover:text-purple-700 dark:hover:text-purple-300 list-none flex items-center gap-1 py-2 min-h-[44px] select-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-open/details:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                            How to create your dream visualization
                                        </summary>
                                        <ol className="mt-3 pl-5 text-xs text-purple-600/80 dark:text-purple-300/80 space-y-2 list-decimal" aria-label="Instructions for creating dream visualization">
                                            <li>Pick an art style and generate your prompt above</li>
                                            <li>Copy and paste into ChatGPT, Midjourney, DALL-E, or Nano Banana</li>
                                            <li>Upload a photo of yourself for personalized results</li>
                                            <li>Save your creation below to keep it with this dream</li>
                                        </ol>
                                    </details>

                                    {/* Import Button */}
                                    {!dream.imageUrl && !isReadOnly && (
                                        <label className="flex items-center justify-center gap-2 w-full px-4 py-3 min-h-[56px] border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg cursor-pointer hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 active:scale-[0.98] transition-all">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Import Your Visualization</span>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="sr-only"
                                                aria-label="Upload dream visualization image (JPG, PNG, or WebP, max 2MB)"
                                                onChange={(e) => {
                                                    if (isReadOnly) return;
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        // Validate file size (max 2MB)
                                                        const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
                                                        if (file.size > MAX_IMAGE_SIZE) {
                                                            showToast('Image too large. Maximum size is 2MB.', 'error');
                                                            return;
                                                        }
                                                        // Validate file type
                                                        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
                                                        if (!validTypes.includes(file.type)) {
                                                            showToast('Invalid file type. Only JPG, PNG, and WebP are allowed.', 'error');
                                                            return;
                                                        }
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            const dataUrl = event.target?.result as string;
                                                            updateDream({ id: dream.id, imageUrl: dataUrl });
                                                            haptics.success();
                                                            showToast('Visualization saved to your dream');
                                                        };
                                                        reader.onerror = () => {
                                                            showToast('Failed to read image file', 'error');
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Related Dreams Section */}
            {dream?.tags && dream.tags.length > 0 && (() => {
                const relatedDreams = dreams.filter(d =>
                    d.id !== dream.id &&
                    d.tags?.some((t: string) => dream.tags?.includes(t))
                ).slice(0, 3);

                if (relatedDreams.length === 0) return null;

                return (
                    <section className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-xl mt-6" aria-labelledby="related-dreams-heading">
                        <h3 id="related-dreams-heading" className="font-serif text-lg mb-3">Related Dreams</h3>
                        <ul className="space-y-2" role="list">
                            {relatedDreams.map(rd => {
                                const sharedTags = rd.tags?.filter((t: string) => dream.tags?.includes(t)) || [];
                                return (
                                    <li key={rd.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (onNavigateToDream) {
                                                    haptics.light();
                                                    onNavigateToDream(rd.id);
                                                }
                                            }}
                                            className="w-full p-3 min-h-[56px] bg-white/50 dark:bg-black/20 rounded-lg text-left hover:bg-white/70 dark:hover:bg-black/30 active:scale-[0.98] transition-all"
                                            aria-label={`View related dream: ${rd.title || 'Untitled'}`}
                                        >
                                            <p className="font-medium truncate">{rd.title || 'Untitled'}</p>
                                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                                {new Date(rd.timestamp).toLocaleDateString()} •
                                                {sharedTags.map((t: string) => ` #${t}`).join('')}
                                            </p>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                );
            })()}

            {isChatOpen && dream && (
                <Suspense fallback={<ModalLoading />}>
                    <DreamChatModal dream={dream} onClose={() => setIsChatOpen(false)} />
                </Suspense>
            )}

            {/* AI Consent Modal */}
            {showConsentModal && (
                <Suspense fallback={<ModalLoading />}>
                    <AIConsentModal
                        onConsent={() => {
                            setShowConsentModal(false);
                            // Trigger analysis after consent
                            setAnalysisState('pending');
                        }}
                        onDecline={() => {
                            setShowConsentModal(false);
                        }}
                    />
                </Suspense>
            )}

            {/* Share Dream Modal */}
            {isShareOpen && dream && (
                <Suspense fallback={<ModalLoading />}>
                    <ShareDreamModal
                        dream={dream}
                        isOpen={isShareOpen}
                        onClose={() => setIsShareOpen(false)}
                    />
                </Suspense>
            )}
        </>
    );
};