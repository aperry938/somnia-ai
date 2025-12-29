import React, { useEffect, useState, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { analyzeDream, generateDreamImage } from '../../services/geminiService';
import { DreamChatModal } from '../modals/DreamChatModal';
import { ImageModal } from '../modals/ImageModal';
import { SleepAids } from '../../types';
import { AnalysisLoading, ImageGenerationLoading } from '../shared/LoadingStates';
import { TagInput, COMMON_DREAM_TAGS } from '../shared/TagInput';

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
    const { getDreamById, updateDream, biometrics } = useAppContext();
    const dream = dreamId ? getDreamById(dreamId) : null;
    const [analysisState, setAnalysisState] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(dream?.dreamText || '');
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);


    const performAnalysis = useCallback(async () => {
        if (!dream || dream.aiAnalysis) {
            if (dream?.aiAnalysis) setAnalysisState('success');
            return;
        }
        setAnalysisState('loading');
        try {
            const [analysisData, imageB64] = await Promise.all([
                analyzeDream(dream.dreamText, dream.sleepAids, biometrics),
                generateDreamImage(dream.dreamText)
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
                ) : analysisState === 'loading' || analysisState === 'pending' ? (
                    <div className="w-full h-64 rounded-lg bg-gray-200 dark:bg-gray-700 mb-6 animate-pulse"></div>
                ) : (
                    <div className="w-full h-64 rounded-lg bg-gray-200 dark:bg-gray-700 mb-6 flex items-center justify-center text-day-text-secondary">Image failed to load</div>
                )}

                <p className="text-day-text-secondary dark:text-night-text-secondary">{date.toLocaleString()}</p>
                <h2 className="font-serif text-3xl mt-2 mb-4">{dream.title}</h2>

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
                    <p className="text-lg leading-relaxed whitespace-pre-wrap">{dream.dreamText}</p>
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
            {isChatOpen && dream && <DreamChatModal dream={dream} onClose={() => setIsChatOpen(false)} />}
            {isImageModalOpen && dream?.imageUrl && <ImageModal src={dream.imageUrl} onClose={() => setIsImageModalOpen(false)} />}
        </>
    );
};