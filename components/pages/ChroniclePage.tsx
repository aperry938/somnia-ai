
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Dream as _Dream, DreamMood, SleepEntry as _SleepEntry, SleepAids } from '../../types';
import { exportDreamsAsJSON, exportDreamJournalToPDF, exportDreamsEncrypted, importDreamsEncrypted, isEncryptedBackup } from '../../services/exportService';
import { validateSearchQuery } from '../../services/validationService';
import { AchievementsCard } from '../insights/AchievementsCard';
import { SleepEntryCard } from '../chronicle/SleepEntryCard';
import { AddSleepEntryModal } from '../modals/AddSleepEntryModal';
import { AddDreamToEntryModal } from '../modals/AddDreamToEntryModal';
import { PasswordInputModal } from '../modals/PasswordInputModal';
import { useToast } from '../shared/Toast';


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
    const { showToast } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isAddSleepModalOpen, setIsAddSleepModalOpen] = useState(false);
    const [addDreamToEntryId, setAddDreamToEntryId] = useState<number | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Password modal state for secure backup
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordMode, setPasswordMode] = useState<'set' | 'enter'>('set');
    const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
    const [passwordError, setPasswordError] = useState<string | undefined>(undefined);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);



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

    const hasContent = sleepEntries.length > 0;

    // SECURITY FIX: Handle secure export with password modal
    const handleSecureExport = useCallback(() => {
        setPasswordMode('set');
        setPasswordError(undefined);
        setPasswordModalOpen(true);
        setShowExportMenu(false);
    }, []);

    // SECURITY FIX: Handle secure import with password modal
    const handleSecureImportSelect = useCallback(async (file: File) => {
        const isEncrypted = await isEncryptedBackup(file);
        if (isEncrypted) {
            setPendingImportFile(file);
            setPasswordMode('enter');
            setPasswordError(undefined);
            setPasswordModalOpen(true);
        } else {
            // Non-encrypted file, try regular import
            try {
                const restored = await importDreamsEncrypted(file, dreams, '');
                importDreams(restored);
                showToast(`Successfully restored ${restored.length} dreams!`, 'success');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                showToast(`Restore failed: ${message}`, 'error');
            }
        }
        setShowExportMenu(false);
    }, [dreams, importDreams, showToast]);

    // Handle password submission
    const handlePasswordSubmit = useCallback(async (password: string) => {
        try {
            if (passwordMode === 'set') {
                // Exporting
                await exportDreamsEncrypted(dreams, password);
                setPasswordModalOpen(false);
            } else if (pendingImportFile) {
                // Importing
                const restored = await importDreamsEncrypted(pendingImportFile, dreams, password);
                importDreams(restored);
                setPasswordModalOpen(false);
                setPendingImportFile(null);
                showToast(`Successfully restored ${restored.length} dreams!`, 'success');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (message.includes('decrypt') || message.includes('password')) {
                setPasswordError('Incorrect password. Please try again.');
            } else {
                setPasswordError(message);
            }
        }
    }, [passwordMode, dreams, pendingImportFile, importDreams, showToast]);

    // Handle password modal cancel
    const handlePasswordCancel = useCallback(() => {
        setPasswordModalOpen(false);
        setPendingImportFile(null);
        setPasswordError(undefined);
    }, []);

    return (
        <div>
            <div className="relative mb-6">
                <h1 className="font-serif page-title text-4xl text-center">The Chronicle</h1>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 mr-2">
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent transition-colors"
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
                                className="w-full text-left px-4 py-3 min-h-[48px] text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Backup (JSON)
                            </button>
                            <button
                                onClick={() => { exportDreamJournalToPDF(dreams); setShowExportMenu(false); }}
                                className="w-full text-left px-4 py-3 min-h-[48px] text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-t border-day-border dark:border-night-border"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Print Journal
                            </button>
                            <button
                                onClick={handleSecureExport}
                                className="w-full text-left px-4 py-3 min-h-[48px] text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-t border-day-border dark:border-night-border text-indigo-500"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                Secure Backup
                            </button>
                            <label className="w-full text-left px-4 py-3 min-h-[48px] text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-t border-day-border dark:border-night-border cursor-pointer text-green-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Restore Encrypted
                                <input
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            handleSecureImportSelect(e.target.files[0]);
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
                        className="w-full pl-10 pr-10 py-2 min-h-[48px] text-base bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-full focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear search"
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent"
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
                                _onEntryClick={() => { }}
                                onDreamClick={onDreamSelect}
                                onAddDream={(entryId) => setAddDreamToEntryId(entryId)}
                                onDeleteEntry={deleteSleepEntry}
                            />
                        ))}

                        {/* No results message */}
                        {filteredEntries.length === 0 && debouncedSearch && (
                            <div className="text-center py-8">
                                <p className="text-day-text-secondary dark:text-night-text-secondary mb-2">No results found</p>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="text-day-accent dark:text-night-accent hover:underline text-sm min-h-[44px] px-4 py-2"
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
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity"
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

            {/* SECURITY FIX: Password modal for encrypted backup/restore */}
            <PasswordInputModal
                isOpen={passwordModalOpen}
                mode={passwordMode}
                onSubmit={handlePasswordSubmit}
                onCancel={handlePasswordCancel}
                error={passwordError}
            />
        </div>
    );
};
