
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Dream, DreamMood, SleepEntry, SleepAids } from '../../types';
import { exportDreamsAsJSON, exportDreamJournalToPDF, exportDreamsEncrypted, importDreamsEncrypted } from '../../services/exportService';
import { MOOD_ICONS, MOOD_LABELS } from '../../constants/uiIcons';
import { validateSearchQuery } from '../../services/validationService';
import { AchievementsCard } from '../insights/AchievementsCard';
import { SleepEntryCard } from '../chronicle/SleepEntryCard';
import { AddSleepEntryModal } from '../modals/AddSleepEntryModal';
import { AddDreamToEntryModal } from '../modals/AddDreamToEntryModal';

// Legacy DreamItem for backwards compatibility (dreams without sleepEntryId)
const LegacyDreamItem: React.FC<{ dream: Dream; onSelect: (id: number) => void; onTagClick: (tag: string) => void }> = React.memo(({ dream, onSelect, onTagClick }) => {
    return (
        <div
            className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-lg cursor-pointer hover:shadow-xl transition-shadow flex gap-4"
            onClick={() => onSelect(dream.id)}
        >
            {dream.imageUrl ? (
                <img src={dream.imageUrl} alt={dream.title} className="w-20 h-20 object-cover rounded-md flex-shrink-0" />
            ) : (
                <div className="w-20 h-20 rounded-md bg-gray-200 dark:bg-gray-700 flex-shrink-0 animate-pulse"></div>
            )}
            <div className="overflow-hidden flex-1">
                <p className="font-serif text-lg font-bold truncate">{dream.title || 'Untitled Dream'}</p>
                <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-1">
                    {new Date(dream.timestamp).toLocaleDateString([], { month: 'long', day: 'numeric' })}
                    {dream.mood && <span className="ml-2 text-day-accent dark:text-night-accent" title={MOOD_LABELS[dream.mood]}>{MOOD_ICONS[dream.mood]}</span>}
                </p>
                <p className="text-sm line-clamp-2 mb-2">{dream.dreamText}</p>
                {dream.tags && dream.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {dream.tags.slice(0, 3).map(tag => (
                            <button
                                key={tag}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTagClick(tag);
                                }}
                                className="text-xs px-2 py-0.5 bg-day-accent/10 dark:bg-night-accent/10 text-day-accent dark:text-night-accent rounded-full hover:bg-day-accent/20 dark:hover:bg-night-accent/20 transition-colors"
                            >
                                #{tag}
                            </button>
                        ))}
                        {dream.tags.length > 3 && (
                            <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                +{dream.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});


export const ChroniclePage: React.FC<{ onDreamSelect: (id: number) => void }> = ({ onDreamSelect }) => {
    const {
        dreams,
        importDreams,
        sleepEntries,
        addSleepEntry,
        deleteSleepEntry,
        addDreamToSleepEntry,
        getSleepEntryById
    } = useAppContext();

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isAddSleepModalOpen, setIsAddSleepModalOpen] = useState(false);
    const [addDreamToEntryId, setAddDreamToEntryId] = useState<number | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Get legacy dreams (those not linked to a sleep entry)
    const legacyDreams = useMemo(() => {
        return dreams.filter(d => !d.sleepEntryId);
    }, [dreams]);

    // Sort sleep entries by date (newest first)
    const sortedSleepEntries = useMemo(() => {
        return [...sleepEntries].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [sleepEntries]);

    // Filter sleep entries based on search
    const filteredEntries = useMemo(() => {
        if (!debouncedSearch.trim()) return sortedSleepEntries;

        const search = debouncedSearch.toLowerCase();
        return sortedSleepEntries.filter(entry => {
            // Check notes
            if (entry.notes?.toLowerCase().includes(search)) return true;

            // Check associated dreams
            const entryDreams = dreams.filter(d => entry.dreamIds.includes(d.id));
            return entryDreams.some(d =>
                d.dreamText.toLowerCase().includes(search) ||
                d.title?.toLowerCase().includes(search) ||
                d.tags?.some(t => t.toLowerCase().includes(search))
            );
        });
    }, [sortedSleepEntries, debouncedSearch, dreams]);

    // Filter legacy dreams based on search
    const filteredLegacyDreams = useMemo(() => {
        if (!debouncedSearch.trim()) return legacyDreams;

        const search = debouncedSearch.toLowerCase();
        return legacyDreams.filter(d =>
            d.dreamText.toLowerCase().includes(search) ||
            d.title?.toLowerCase().includes(search) ||
            d.tags?.some(t => t.toLowerCase().includes(search))
        );
    }, [legacyDreams, debouncedSearch]);

    const handleAddSleepEntry = useCallback((date: string, quality: number | null, notes?: string, sleepAids?: SleepAids) => {
        return addSleepEntry(date, quality, notes, sleepAids);
    }, [addSleepEntry]);

    const handleSaveWithDream = useCallback((entryId: number) => {
        setIsAddSleepModalOpen(false);
        setAddDreamToEntryId(entryId);
    }, []);

    const handleAddDreamToEntry = useCallback((sleepEntryId: number, dreamText: string, mood?: DreamMood) => {
        addDreamToSleepEntry(sleepEntryId, dreamText, mood);
        setAddDreamToEntryId(null);
    }, [addDreamToSleepEntry]);

    const currentEntryForModal = addDreamToEntryId ? getSleepEntryById(addDreamToEntryId) : null;

    const hasContent = sleepEntries.length > 0 || legacyDreams.length > 0;

    return (
        <div>
            <div className="relative mb-6">
                <h1 className="font-serif page-title text-4xl text-center">The Chronicle</h1>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 mr-2">
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="p-2 text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent transition-colors"
                        title="Export options"
                        aria-label="Export options"
                        aria-expanded={showExportMenu}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                    {showExportMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-lg shadow-xl z-10 overflow-hidden animate-fadeIn">
                            <button
                                onClick={() => { exportDreamsAsJSON(dreams); setShowExportMenu(false); }}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Backup (JSON)
                            </button>
                            <button
                                onClick={() => { exportDreamJournalToPDF(dreams); setShowExportMenu(false); }}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-t border-day-border dark:border-night-border"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Print Journal
                            </button>
                            <button
                                onClick={() => { exportDreamsEncrypted(dreams); setShowExportMenu(false); }}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-t border-day-border dark:border-night-border text-indigo-500"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                Secure Backup
                            </button>
                            <label className="w-full text-left px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-t border-day-border dark:border-night-border cursor-pointer text-green-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Restore Encrypted
                                <input
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={async (e) => {
                                        if (e.target.files?.[0]) {
                                            try {
                                                const restored = await importDreamsEncrypted(e.target.files[0], dreams);
                                                importDreams(restored);
                                                alert(`Successfully restored ${restored.length} dreams!`);
                                            } catch (error) {
                                                const message = error instanceof Error ? error.message : 'Unknown error';
                                                alert(`Restore failed: ${message}`);
                                            }
                                            setShowExportMenu(false);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* Achievements */}
            <div className="max-w-2xl mx-auto mb-6">
                <AchievementsCard dreams={dreams} />
            </div>

            {/* Search */}
            <div className="max-w-2xl mx-auto mb-4">
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-day-text-secondary dark:text-night-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(validateSearchQuery(e.target.value))}
                        placeholder="Search sleep entries & dreams..."
                        aria-label="Search sleep entries and dreams"
                        className="w-full pl-10 pr-10 py-2 bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-full focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear search"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="space-y-4 max-w-2xl mx-auto">
                {hasContent ? (
                    <>
                        {/* Sleep Entries */}
                        {filteredEntries.map(entry => (
                            <SleepEntryCard
                                key={entry.id}
                                entry={entry}
                                dreams={dreams}
                                onEntryClick={() => { }}
                                onDreamClick={onDreamSelect}
                                onAddDream={(entryId) => setAddDreamToEntryId(entryId)}
                                onDeleteEntry={deleteSleepEntry}
                            />
                        ))}

                        {/* Legacy Dreams (not linked to sleep entries) */}
                        {filteredLegacyDreams.length > 0 && (
                            <>
                                {sleepEntries.length > 0 && (
                                    <div className="flex items-center gap-3 py-2">
                                        <div className="flex-1 h-px bg-day-border dark:bg-night-border"></div>
                                        <span className="text-xs text-day-text-secondary dark:text-night-text-secondary uppercase tracking-wider">
                                            Legacy Dreams
                                        </span>
                                        <div className="flex-1 h-px bg-day-border dark:bg-night-border"></div>
                                    </div>
                                )}
                                {filteredLegacyDreams.map(dream => (
                                    <LegacyDreamItem
                                        key={dream.id}
                                        dream={dream}
                                        onSelect={onDreamSelect}
                                        onTagClick={() => { }}
                                    />
                                ))}
                            </>
                        )}

                        {/* No results message */}
                        {filteredEntries.length === 0 && filteredLegacyDreams.length === 0 && debouncedSearch && (
                            <div className="text-center py-8">
                                <p className="text-day-text-secondary dark:text-night-text-secondary mb-2">No results found</p>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="text-day-accent dark:text-night-accent hover:underline text-sm"
                                >
                                    Clear search
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    // Empty state
                    <div className="text-center py-12">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-day-text-secondary/30 dark:text-night-text-secondary/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        <h3 className="font-serif text-xl mb-2">Your Sleep Journal Awaits</h3>
                        <p className="text-day-text-secondary dark:text-night-text-secondary mb-6 max-w-xs mx-auto">
                            Log your sleep to track patterns and record the dreams that follow.
                        </p>
                        <button
                            onClick={() => setIsAddSleepModalOpen(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-day-accent dark:bg-night-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Log Your First Sleep
                        </button>
                    </div>
                )}
            </div>

            {/* Floating Action Button */}
            <button
                onClick={() => setIsAddSleepModalOpen(true)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-40"
                title="Log sleep"
                aria-label="Log sleep"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            </button>

            {/* Add Sleep Entry Modal */}
            {isAddSleepModalOpen && (
                <AddSleepEntryModal
                    onSave={handleAddSleepEntry}
                    onSaveWithDream={handleSaveWithDream}
                    onClose={() => setIsAddSleepModalOpen(false)}
                />
            )}

            {/* Add Dream to Entry Modal */}
            {addDreamToEntryId && currentEntryForModal && (
                <AddDreamToEntryModal
                    sleepEntryId={addDreamToEntryId}
                    sleepDate={currentEntryForModal.date}
                    onSave={handleAddDreamToEntry}
                    onClose={() => setAddDreamToEntryId(null)}
                />
            )}
        </div>
    );
};
