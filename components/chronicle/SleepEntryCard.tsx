import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SleepEntry, Dream } from '../../types';
import { MOOD_ICONS, MOOD_LABELS } from '../../constants/uiIcons';
import haptics from '../../services/hapticsService';

interface SleepEntryCardProps {
    entry: SleepEntry;
    dreams: Dream[];
    _onEntryClick: (id: number) => void;
    onDreamClick: (id: number) => void;
    onAddDream: (entryId: number) => void;
    onDeleteEntry: (id: number) => void;
}

// Map alarm sound IDs to display names
const ALARM_SOUND_NAMES: Record<string, string> = {
    'classic': 'Classic',
    'aether': 'Aether',
    'somnia': 'Somnia',
    'gentle': 'Gentle',
    'prism': 'Prism',
    'bamboo': 'Bamboo',
    'progressive': 'Progressive',
};

const getAlarmSoundName = (soundId?: string): string => {
    if (!soundId) return '';
    return ALARM_SOUND_NAMES[soundId] || soundId;
};

// Format time from HH:MM to display format
const formatAlarmTime = (time?: string): string => {
    if (!time) return '';
    const parts = time.split(':').map(Number);
    const hours = parts[0];
    const minutes = parts[1];
    if (hours === undefined || minutes === undefined) return '';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

export const SleepEntryCard: React.FC<SleepEntryCardProps> = ({
    entry,
    dreams,
    _onEntryClick: _unused_onEntryClick,
    onDreamClick,
    onAddDream,
    onDeleteEntry
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Get dreams for this entry (memoized to avoid filtering on every render)
    const entryDreams = useMemo(() =>
        dreams.filter(d => entry.dreamIds.includes(d.id)),
        [dreams, entry.dreamIds]
    );
    const dreamCount = entryDreams.length;

    // Format date nicely
    const displayDate = new Date(entry.date + 'T12:00:00').toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    // Render quality stars
    const renderQuality = () => {
        if (!entry.sleepQuality) return null;
        return (
            <div className="flex items-center gap-0.5" role="img" aria-label={`Sleep quality: ${entry.sleepQuality} out of 5`}>
                {[1, 2, 3, 4, 5].map(i => (
                    <svg
                        key={i}
                        className={`w-4 h-4 ${i <= entry.sleepQuality! ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`}
                        fill={i <= entry.sleepQuality! ? 'currentColor' : 'none'}
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

    // Check if we have pre-sleep data
    const hasSleepAids = entry.sleepAids && (
        entry.sleepAids.dayRating ||
        entry.sleepAids.dayNotes ||
        entry.sleepAids.sound ||
        entry.sleepAids.relaxation ||
        (entry.sleepAids.checklist && entry.sleepAids.checklist.length > 0) ||
        (entry.sleepAids.soundsPlayed && entry.sleepAids.soundsPlayed.length > 0) ||
        (entry.sleepAids.breathingExercises && entry.sleepAids.breathingExercises.length > 0) ||
        entry.sleepAids.totalPrepTime
    );

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Header Row - Always Visible */}
            <div
                className="p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                onClick={() => { haptics.selection(); setIsExpanded(!isExpanded); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptics.selection(); setIsExpanded(!isExpanded); } }}
                aria-expanded={isExpanded}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Moon Icon */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-serif text-lg font-medium">{displayDate}</p>
                                {entry.alarmTime && (
                                    <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {formatAlarmTime(entry.alarmTime)}
                                    </span>
                                )}
                                {entry.alarmSoundId && (
                                    <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-full flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                        </svg>
                                        {getAlarmSoundName(entry.alarmSoundId)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-day-text-secondary dark:text-night-text-secondary mt-1">
                                {renderQuality()}
                                {entry.sleepQuality && <span>•</span>}
                                <span>{dreamCount} {dreamCount === 1 ? 'dream' : 'dreams'}</span>
                                {hasSleepAids && (
                                    <>
                                        <span>•</span>
                                        <span className="text-indigo-600 dark:text-indigo-400">Sleep tracked</span>
                                    </>
                                )}
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
            </div>

            {/* Expanded Content - Timeline Layout */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        className="border-t border-day-border dark:border-night-border overflow-hidden"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >

                        {/* Section 1: Evening Reflection */}
                        {(entry.sleepAids?.dayRating || entry.sleepAids?.dayNotes || entry.notes) && (
                            <div className="p-4 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 border-b border-day-border dark:border-night-border">
                                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <span className="text-sm font-medium uppercase tracking-wide">Evening Reflection</span>
                                </div>

                                <div className="space-y-2">
                                    {entry.sleepAids?.dayRating && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-day-text-secondary dark:text-night-text-secondary">How was your day:</span>
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <svg key={i} className={`w-4 h-4 ${i <= entry.sleepAids!.dayRating! ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`} fill={i <= entry.sleepAids!.dayRating! ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                    </svg>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(entry.sleepAids?.dayNotes || entry.notes) && (
                                        <p className="text-sm italic text-day-text-secondary dark:text-night-text-secondary">
                                            "{entry.sleepAids?.dayNotes || entry.notes}"
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Section 2: Sleep Preparation */}
                        {entry.sleepAids && (entry.sleepAids.checklist?.length || entry.sleepAids.soundsPlayed?.length || entry.sleepAids.breathingExercises?.length || entry.sleepAids.sound || entry.sleepAids.relaxation || entry.sleepAids.totalPrepTime) && (
                            <div className="p-4 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 border-b border-day-border dark:border-night-border">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                    <span className="text-sm font-medium uppercase tracking-wide">Sleep Preparation</span>
                                    {entry.sleepAids.totalPrepTime && entry.sleepAids.totalPrepTime > 0 && (
                                        <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-800/40 text-indigo-600 dark:text-indigo-300 rounded-full">
                                            {Math.floor(entry.sleepAids.totalPrepTime / 60)} min
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {/* Checklist */}
                                    {entry.sleepAids.checklist && entry.sleepAids.checklist.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {entry.sleepAids.checklist.map((item, idx) => (
                                                <span key={idx} className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Sounds Played */}
                                    {entry.sleepAids.soundsPlayed && entry.sleepAids.soundsPlayed.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {entry.sleepAids.soundsPlayed.map((sound, idx) => (
                                                <span key={idx} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                                    </svg>
                                                    {sound.name} ({sound.duration && sound.duration >= 60 ? Math.floor(sound.duration / 60) + 'm' : (sound.duration || 0) + 's'})
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Legacy sound field */}
                                    {entry.sleepAids.sound && !entry.sleepAids.soundsPlayed?.length && (
                                        <span className="text-xs px-2 py-1 inline-flex bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                                            </svg>
                                            {entry.sleepAids.sound}
                                        </span>
                                    )}

                                    {/* Breathing Exercises */}
                                    {entry.sleepAids.breathingExercises && entry.sleepAids.breathingExercises.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {entry.sleepAids.breathingExercises.map((exercise, idx) => (
                                                <span key={idx} className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                    </svg>
                                                    {exercise.name} ({exercise.duration && exercise.duration >= 60 ? Math.floor(exercise.duration / 60) + 'm' : (exercise.duration || 0) + 's'})
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Legacy relaxation field */}
                                    {entry.sleepAids.relaxation && !entry.sleepAids.breathingExercises?.length && (
                                        <span className="text-xs px-2 py-1 inline-flex bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                            {entry.sleepAids.relaxation}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Section 3: Dreams */}
                        <div className="border-b border-day-border dark:border-night-border">
                            <div className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    <span className="text-sm font-medium uppercase tracking-wide">Dreams</span>
                                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-full">
                                        {dreamCount}
                                    </span>
                                </div>
                            </div>

                            {entryDreams.length > 0 ? (
                                <div className="divide-y divide-day-border/50 dark:divide-night-border/50">
                                    {entryDreams.map(dream => (
                                        <div
                                            key={dream.id}
                                            className="px-4 py-3 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 cursor-pointer transition-colors"
                                            onClick={(e) => { e.stopPropagation(); onDreamClick(dream.id); }}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDreamClick(dream.id); } }}
                                        >
                                            <div className="flex items-start gap-3">
                                                {dream.imageUrl ? (
                                                    <img src={dream.imageUrl} alt="" loading="lazy" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 shadow-sm" />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex-shrink-0 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{dream.title || 'Untitled Dream'}</p>
                                                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary line-clamp-2 mt-0.5">
                                                        {dream.dreamText}
                                                    </p>
                                                    {dream.mood && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 mt-1">
                                                            {MOOD_ICONS[dream.mood]} {MOOD_LABELS[dream.mood]}
                                                        </span>
                                                    )}
                                                </div>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="px-4 pb-4 text-center text-day-text-secondary dark:text-night-text-secondary">
                                    <p className="text-sm">No dreams recorded for this night</p>
                                </div>
                            )}

                            {/* Add Dream Button */}
                            <div className="px-4 pb-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAddDream(entry.id); }}
                                    className="w-full py-2 flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors border border-dashed border-purple-200 dark:border-purple-800"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Dream
                                </button>
                            </div>
                        </div>

                        {/* Section 4: Wake Up */}
                        {(entry.wakeData || entry.alarmTime) && (
                            <div className="p-4 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 border-b border-day-border dark:border-night-border">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <span className="text-sm font-medium uppercase tracking-wide">Wake Up</span>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {entry.alarmTime && (
                                        <span className="text-sm flex items-center gap-1 text-green-700 dark:text-green-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Alarm at {formatAlarmTime(entry.alarmTime)}
                                        </span>
                                    )}

                                    {entry.wakeData && (
                                        <>
                                            <span className="text-sm flex items-center gap-1 text-green-700 dark:text-green-300">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                {Math.floor(entry.wakeData.timeToSilence / 60)}m {entry.wakeData.timeToSilence % 60}s to wake
                                            </span>

                                            {entry.wakeData.snoozeCount > 0 && (
                                                <span className="text-sm flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    {entry.wakeData.snoozeCount} snooze{entry.wakeData.snoozeCount !== 1 ? 's' : ''}
                                                </span>
                                            )}

                                            {entry.wakeData.alertnessBoostUsed && (
                                                <span className="text-sm flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                                                    </svg>
                                                    Wake boost used
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Actions Footer */}
                        <div className="p-3 flex items-center justify-end">
                            {!showDeleteConfirm ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Entry
                                </button>
                            ) : (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-xs text-gray-500 mr-2">Delete this entry?</span>
                                    <button
                                        onClick={() => { onDeleteEntry(entry.id); }}
                                        className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
