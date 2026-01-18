import React, { useState, useEffect, useMemo } from 'react';
import { Dream } from '../../types';
import { useBackButton } from '../../hooks/useBackButton';

interface DreamCompareModalProps {
    dreams: Dream[];
    onClose: () => void;
}

export const DreamCompareModal: React.FC<DreamCompareModalProps> = ({ dreams, onClose }) => {
    const [leftDreamId, setLeftDreamId] = useState<number | null>(dreams[0]?.id || null);
    const [rightDreamId, setRightDreamId] = useState<number | null>(dreams[1]?.id || null);
    // Track if any select is currently being interacted with
    const isSelectActiveRef = React.useRef(false);
    const selectInteractionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Hardware back button support
    useBackButton(true, onClose);

    // Handle Escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSelectActiveRef.current) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Set select interaction flag with auto-clear
    const setSelectActive = (active: boolean) => {
        if (selectInteractionTimeoutRef.current) {
            clearTimeout(selectInteractionTimeoutRef.current);
        }
        isSelectActiveRef.current = active;
        if (active) {
            // Keep active for at least 1 second after any interaction
            selectInteractionTimeoutRef.current = setTimeout(() => {
                isSelectActiveRef.current = false;
            }, 1000);
        }
    };

    // Safely close modal only if select is not being interacted with
    const handleBackdropClick = (e: React.MouseEvent) => {
        // Only close if clicking directly on backdrop element
        if (e.target === e.currentTarget && !isSelectActiveRef.current) {
            onClose();
        }
    };

    const leftDream = dreams.find(d => d.id === leftDreamId);
    const rightDream = dreams.find(d => d.id === rightDreamId);

    const DreamCard: React.FC<{ dream: Dream | undefined; side: 'left' | 'right'; onSelect: (id: number) => void }> = ({ dream, side, onSelect }) => {
        return (
            <div className="flex-1 min-w-0">
                <select
                    value={dream?.id || ''}
                    onChange={(e) => {
                        onSelect(Number(e.target.value));
                        setSelectActive(false);
                    }}
                    aria-label={`Select ${side} dream for comparison`}
                    onFocus={() => setSelectActive(true)}
                    onBlur={() => {
                        // Keep active for extra time after blur to handle native picker
                        setTimeout(() => setSelectActive(false), 500);
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectActive(true);
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectActive(true);
                    }}
                    onTouchStart={(e) => {
                        e.stopPropagation();
                        setSelectActive(true);
                    }}
                    onTouchEnd={(e) => e.stopPropagation()}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectActive(true);
                    }}
                    className="w-full mb-4 p-3 min-h-[48px] text-base bg-white/50 dark:bg-black/30 border border-day-border dark:border-night-border rounded-lg focus:outline-none focus:ring-2 focus:ring-day-accent appearance-none cursor-pointer"
                    style={{ WebkitAppearance: 'menulist' }}
                >
                    {dreams.map(d => (
                        <option key={d.id} value={d.id}>
                            {new Date(d.timestamp).toLocaleDateString()} - {d.title || 'Untitled'}
                        </option>
                    ))}
                </select>

                {dream && (
                    <div className="space-y-3">
                        {dream.imageUrl && (
                            <img src={dream.imageUrl} alt={dream.title} loading="lazy" className="w-full h-32 object-cover rounded-lg" />
                        )}
                        <h3 className="font-serif text-lg font-bold truncate">{dream.title || 'Untitled'}</h3>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                            {new Date(dream.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                        {dream.sleepQuality && (
                            <div className="flex items-center gap-1 text-sm">
                                <span>Quality:</span>
                                <div className="flex" role="img" aria-label={`${dream.sleepQuality} out of 5 stars`}>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${i <= dream.sleepQuality! ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                        </svg>
                                    ))}
                                </div>
                            </div>
                        )}
                        <p className="text-sm line-clamp-4">{dream.dreamText}</p>
                        {dream.tags && dream.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {dream.tags.map(tag => (
                                    <span key={tag} className="text-xs px-2 py-0.5 bg-day-accent/10 dark:bg-night-accent/10 text-day-accent dark:text-night-accent rounded-full">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        {dream.aiAnalysis && (
                            <div className="mt-3 pt-3 border-t border-day-border dark:border-night-border">
                                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mb-1">AI Insights:</p>
                                <ul className="text-xs space-y-1">
                                    {dream.aiAnalysis.analysis.slice(0, 2).map((a, i) => (
                                        <li key={i} className="truncate">• {a.title}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Find shared and unique tags - memoized to avoid recalculation on every render
    const { sharedTags, uniqueLeft, uniqueRight } = useMemo(() => {
        const leftTags = new Set(leftDream?.tags || []);
        const rightTags = new Set(rightDream?.tags || []);
        return {
            sharedTags: [...leftTags].filter(t => rightTags.has(t)),
            uniqueLeft: [...leftTags].filter(t => !rightTags.has(t)),
            uniqueRight: [...rightTags].filter(t => !leftTags.has(t)),
        };
    }, [leftDream?.tags, rightDream?.tags]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 pt-4 pb-[calc(2rem+var(--safe-area-inset-bottom))]" onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="compare-modal-title">
            <div
                className="w-full max-w-4xl max-h-[calc(90vh-var(--safe-area-inset-bottom))] bg-day-bg-end dark:bg-night-bg-end rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-day-border dark:border-night-border flex justify-between items-center">
                    <h2 id="compare-modal-title" className="font-serif text-xl">Dream Comparison</h2>
                    <button onClick={onClose} aria-label="Close comparison" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-text-primary dark:hover:text-night-text-primary rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <div className="flex gap-6">
                        <DreamCard dream={leftDream} side="left" onSelect={setLeftDreamId} />
                        <div className="w-px bg-day-border dark:bg-night-border" />
                        <DreamCard dream={rightDream} side="right" onSelect={setRightDreamId} />
                    </div>

                    {/* Tag comparison */}
                    {(sharedTags.length > 0 || uniqueLeft.length > 0 || uniqueRight.length > 0) && (
                        <div className="mt-6 pt-4 border-t border-day-border dark:border-night-border">
                            <h4 className="text-sm font-medium mb-3">Tag Comparison</h4>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                    <p className="text-day-text-secondary dark:text-night-text-secondary mb-1">Only in Left</p>
                                    {uniqueLeft.map(t => <span key={t} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 rounded-full">#{t}</span>)}
                                </div>
                                <div className="text-center">
                                    <p className="text-day-text-secondary dark:text-night-text-secondary mb-1">Shared</p>
                                    {sharedTags.map(t => <span key={t} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-full">#{t}</span>)}
                                </div>
                                <div className="text-right">
                                    <p className="text-day-text-secondary dark:text-night-text-secondary mb-1">Only in Right</p>
                                    {uniqueRight.map(t => <span key={t} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full">#{t}</span>)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
