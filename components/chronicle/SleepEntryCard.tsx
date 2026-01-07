import React, { useState } from 'react';
import { SleepEntry, Dream } from '../../types';
import { MOOD_ICONS, MOOD_LABELS } from '../../constants/uiIcons';

interface SleepEntryCardProps {
    entry: SleepEntry;
    dreams: Dream[];
    onEntryClick: (id: number) => void;
    onDreamClick: (id: number) => void;
    onAddDream: (entryId: number) => void;
    onDeleteEntry: (id: number) => void;
}

export const SleepEntryCard: React.FC<SleepEntryCardProps> = ({
    entry,
    dreams,
    onEntryClick,
    onDreamClick,
    onAddDream,
    onDeleteEntry
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Get dreams for this entry
    const entryDreams = dreams.filter(d => entry.dreamIds.includes(d.id));
    const dreamCount = entryDreams.length;

    // Format date nicely
    const displayDate = new Date(entry.date + 'T12:00:00').toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    // Render quality stars (hollow outline style matching brand)
    const renderQuality = () => {
        if (!entry.sleepQuality) return null;
        return (
            <div className="flex items-center gap-0.5" role="img" aria-label={`Sleep quality: ${entry.sleepQuality} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map(i => (
                    <svg
                        key={i}
                        className={`w-4 h-4 ${i <= entry.sleepQuality! ? 'text-day-accent dark:text-night-accent' : 'text-gray-300 dark:text-gray-600'}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border rounded-xl overflow-hidden">
            {/* Main Entry Row */}
            <div
                className="p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded); } }}
                aria-expanded={isExpanded}
                aria-label={`Sleep entry for ${displayDate}, ${dreamCount} ${dreamCount === 1 ? 'dream' : 'dreams'}${entry.sleepQuality ? `, ${entry.sleepQuality} star quality` : ''}`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Moon Icon */}
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        </div>

                        <div>
                            <p className="font-medium">{displayDate}</p>
                            <div className="flex items-center gap-2 text-sm text-day-text-secondary dark:text-night-text-secondary">
                                {renderQuality()}
                                <span>•</span>
                                <span>{dreamCount} {dreamCount === 1 ? 'dream' : 'dreams'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Expand Arrow */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 text-day-text-secondary dark:text-night-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                {/* Notes preview (if any) */}
                {entry.notes && !isExpanded && (
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mt-2 line-clamp-1 italic">
                        "{entry.notes}"
                    </p>
                )}
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-day-border dark:border-night-border animate-fadeIn">
                    {/* Notes (full) */}
                    {entry.notes && (
                        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-day-border dark:border-night-border">
                            <p className="text-sm italic">"{entry.notes}"</p>
                        </div>
                    )}

                    {/* Sleep Aids Used */}
                    {entry.sleepAids && (entry.sleepAids.sound || entry.sleepAids.relaxation) && (
                        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-day-border dark:border-night-border flex flex-wrap gap-2">
                            {entry.sleepAids.sound && (
                                <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-800/50 text-indigo-600 dark:text-indigo-300 rounded-full">
                                    🎵 {entry.sleepAids.sound}
                                </span>
                            )}
                            {entry.sleepAids.relaxation && (
                                <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-800/50 text-purple-600 dark:text-purple-300 rounded-full">
                                    🧘 {entry.sleepAids.relaxation}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Dreams List */}
                    <div className="divide-y divide-day-border dark:divide-night-border">
                        {entryDreams.length > 0 ? (
                            entryDreams.map(dream => (
                                <div
                                    key={dream.id}
                                    className="px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-start gap-3"
                                    onClick={(e) => { e.stopPropagation(); onDreamClick(dream.id); }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDreamClick(dream.id); } }}
                                    aria-label={`View dream: ${dream.title || 'Untitled Dream'}`}
                                >
                                    {dream.imageUrl ? (
                                        <img src={dream.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="overflow-hidden flex-1">
                                        <p className="font-medium truncate">{dream.title || 'Untitled Dream'}</p>
                                        <p className="text-sm text-day-text-secondary dark:text-night-text-secondary line-clamp-1">
                                            {dream.dreamText}
                                        </p>
                                        {dream.mood && (
                                            <span className="inline-flex items-center gap-1 text-xs text-day-accent dark:text-night-accent mt-1">
                                                {MOOD_ICONS[dream.mood]} {MOOD_LABELS[dream.mood]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-6 text-center text-day-text-secondary dark:text-night-text-secondary">
                                <p className="text-sm mb-2">No dreams recorded for this night</p>
                            </div>
                        )}
                    </div>

                    {/* Add Dream Button */}
                    <div className="p-3 border-t border-day-border dark:border-night-border flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddDream(entry.id); }}
                            aria-label={`Add dream to ${displayDate} entry`}
                            className="flex-1 py-2 flex items-center justify-center gap-2 text-sm text-day-accent dark:text-night-accent hover:bg-day-accent/10 dark:hover:bg-night-accent/10 rounded-lg transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Dream
                        </button>

                        {/* Delete Entry Button */}
                        {!showDeleteConfirm ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                                aria-label="Delete sleep entry"
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete sleep entry"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        ) : (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => { onDeleteEntry(entry.id); }}
                                    aria-label="Confirm delete"
                                    className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    aria-label="Cancel delete"
                                    className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
