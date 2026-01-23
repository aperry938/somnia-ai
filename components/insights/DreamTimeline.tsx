import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface DreamTimelineProps {
    dreams: Dream[];
    onDreamClick?: (dreamId: number) => void;
}

/**
 * Vertical timeline view of recent dreams showing progression.
 */
export const DreamTimeline: React.FC<DreamTimelineProps> = ({ dreams, onDreamClick }) => {
    const timelineDreams = useMemo(() => {
        return dreams.slice(0, 10).map((dream, idx) => ({
            ...dream,
            isFirst: idx === 0,
            isLast: idx === Math.min(dreams.length - 1, 9)
        }));
    }, [dreams]);

    if (timelineDreams.length === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Dream Timeline
            </h3>

            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-day-border dark:bg-night-border" />

                <div className="space-y-4">
                    {timelineDreams.map((dream) => (
                        <button
                            key={dream.id}
                            onClick={() => onDreamClick?.(dream.id)}
                            className="w-full flex items-start gap-3 text-left hover:bg-white/30 dark:hover:bg-black/20 rounded-lg p-2 -ml-2 transition-colors"
                            aria-label={`View dream: ${dream.title || 'Untitled'}`}
                        >
                            <div className="relative z-10 w-6 h-6 rounded-full bg-day-accent dark:bg-night-accent flex items-center justify-center flex-shrink-0">
                                <div className="w-2 h-2 rounded-full bg-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{dream.title || 'Untitled'}</p>
                                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                    {new Date(dream.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                                {dream.dreamText && (
                                <p className="text-sm text-day-text-secondary dark:text-night-text-secondary line-clamp-1 mt-1">
                                    {dream.dreamText.length > 80 ? `${dream.dreamText.slice(0, 80)}...` : dream.dreamText}
                                </p>
                            )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
