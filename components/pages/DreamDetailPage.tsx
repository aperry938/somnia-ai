import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { analyzeDream, generateDreamImage, generateDreamTitle, DreamArtStyle, DREAM_ART_STYLES } from '../../services/geminiService';
import { DreamChatModal } from '../modals/DreamChatModal';
import { ImageModal } from '../modals/ImageModal';
import { SleepAids } from '../../types';
import { AnalysisLoading, ImageGenerationLoading } from '../shared/LoadingStates';
import { TagInput, COMMON_DREAM_TAGS } from '../shared/TagInput';
import { findDreamSymbols, DreamSymbol } from '../../constants/dreamSymbols';

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

    return (
        <div className="border-b border-day-border dark:border-night-border">
            <button
                className="w-full flex justify-between items-center py-4 text-left font-serif text-xl"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{title}</span>
                <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>+</span>
            </button>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
                <p className="pb-4 text-day-text-secondary dark:text-night-text-secondary whitespace-pre-wrap">{content}</p>
            </div>
        </div>
    );
};

// Main Dream Detail Component
export const DreamDetailPage: React.FC<{ dreamId: number | null; onBack: () => void; }> = ({ dreamId, onBack }) => {
    const { getDreamById, updateDream, biometrics, dreams } = useAppContext();
    const dream = dreamId ? getDreamById(dreamId) : null;
    const [analysisState, setAnalysisState] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(dream?.dreamText || '');
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedArtStyle, setSelectedArtStyle] = useState<DreamArtStyle>('surrealist');

    // Detect dream symbols in the dream text
    const detectedSymbols = useMemo(() => {
        if (!dream) return [];
        return findDreamSymbols(dream.dreamText);
    }, [dream]);


    const performAnalysis = useCallback(async () => {
        if (!dream || dream.aiAnalysis) {
            if (dream?.aiAnalysis) setAnalysisState('success');
            return;
        }
        setAnalysisState('loading');
        try {
            const [analysisData, imageB64] = await Promise.all([
                analyzeDream(dream.dreamText, dream.sleepAids, biometrics),
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
            console.error(e);
            setAnalysisState('error');
        }
    }, [dream, updateDream]);

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
                    <button onClick={onBack} className="text-day-accent dark:text-night-accent">&larr; Back to Chronicle</button>
                    <button onClick={() => setIsEditing(!isEditing)} className="text-sm text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent">
                        {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                </div>

                {dream.imageUrl ? (
                    <button onClick={() => setIsImageModalOpen(true)} className="w-full">
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
                                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${selectedArtStyle === style
                                        ? 'bg-day-accent dark:bg-night-accent text-white'
                                        : 'bg-white/50 dark:bg-black/20 hover:bg-white/70 dark:hover:bg-black/30'
                                        }`}
                                >
                                    {DREAM_ART_STYLES[style].name}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-64 rounded-lg bg-gray-200 dark:bg-gray-700 mb-6 flex items-center justify-center text-day-text-secondary">Image failed to load</div>
                )}

                <p className="text-day-text-secondary dark:text-night-text-secondary">{date.toLocaleString()}</p>
                <div className="flex items-center gap-2 mt-2 mb-4">
                    <h2 className="font-serif text-3xl">{dream.title}</h2>
                    <button
                        onClick={async () => {
                            const newTitle = await generateDreamTitle(dream.dreamText);
                            updateDream({ id: dream.id, title: newTitle });
                        }}
                        className="text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent transition-colors"
                        title="Regenerate title with AI"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                {dream.sleepAids && <EveningReflectionDisplay aids={dream.sleepAids} />}
                {dream.sleepAids && <SleepAidsDisplay aids={dream.sleepAids} />}

                {isEditing ? (
                    <div>
                        <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full h-48 p-3 bg-white/80 dark:bg-black/30 border border-day-border dark:border-night-border rounded-md focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
                        />
                        <button onClick={handleSaveEdit} className="mt-2 px-4 py-2 bg-day-accent text-white rounded-full">Save Changes</button>
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
                    <div className="mt-6 bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border p-4 rounded-xl">
                        <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            Detected Symbols
                        </h3>
                        <div className="space-y-3">
                            {detectedSymbols.slice(0, 4).map(symbol => (
                                <div key={symbol.symbol} className="text-sm">
                                    <span className="font-medium text-day-accent dark:text-night-accent">{symbol.symbol}</span>
                                    <span className="mx-2 text-day-text-secondary dark:text-night-text-secondary">—</span>
                                    <span className="text-day-text-secondary dark:text-night-text-secondary">{symbol.meaning}</span>
                                </div>
                            ))}
                        </div>
                        {detectedSymbols.length > 4 && (
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-3">
                                +{detectedSymbols.length - 4} more symbols detected
                            </p>
                        )}
                    </div>
                )}

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
                            <button onClick={handleRetry} className="mt-2 px-4 py-2 bg-day-accent text-white rounded-full">
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
                            <button onClick={() => setIsChatOpen(true)} className="w-full mt-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-bold rounded-full">
                                Deepen Analysis with AI
                            </button>
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