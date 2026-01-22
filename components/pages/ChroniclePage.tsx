
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
import { CALIBRATION_DREAM } from '../../constants/demoDreams';


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
    const [isExportImportLoading, setIsExportImportLoading] = useState(false);

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

    // Group entries by month for collapsible sections
    const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

    const entriesByMonth = useMemo(() => {
        const grouped: Record<string, typeof filteredEntries> = {};
        filteredEntries.forEach(entry => {
            const date = new Date(entry.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!grouped[monthKey]) grouped[monthKey] = [];
            grouped[monthKey].push(entry);
        });
        // Sort months newest first
        return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
    }, [filteredEntries]);

    const toggleMonth = useCallback((monthKey: string) => {
        setCollapsedMonths(prev => {
            const next = new Set(prev);
            if (next.has(monthKey)) {
                next.delete(monthKey);
            } else {
                next.add(monthKey);
            }
            return next;
        });
    }, []);

    const formatMonthHeader = (monthKey: string) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year ?? '2024'), parseInt(month ?? '1') - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };



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
        setIsExportImportLoading(true);
        try {
            const isEncrypted = await isEncryptedBackup(file);
            if (isEncrypted) {
                setPendingImportFile(file);
                setPasswordMode('enter');
                setPasswordError(undefined);
                setPasswordModalOpen(true);
            } else {
                // Non-encrypted file, try regular import
                const restored = await importDreamsEncrypted(file, dreams, '');
                importDreams(restored);
                showToast(`Successfully restored ${restored.length} dreams!`, 'success');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            showToast(`Restore failed: ${message}`, 'error');
        } finally {
            setIsExportImportLoading(false);
        }
        setShowExportMenu(false);
    }, [dreams, importDreams, showToast]);

    // Handle password submission
    const handlePasswordSubmit = useCallback(async (password: string) => {
        setIsExportImportLoading(true);
        try {
            if (passwordMode === 'set') {
                // Exporting
                await exportDreamsEncrypted(dreams, password);
                setPasswordModalOpen(false);
                showToast('Backup exported successfully!', 'success');
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
        } finally {
            setIsExportImportLoading(false);
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
                                            e.target.value = ''; // Reset to allow re-importing same file
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
                        {/* Sleep Entries grouped by month */}
                        {entriesByMonth.map(([monthKey, entries]) => (
                            <div key={monthKey} className="mb-4">
                                {/* Month Header - Collapsible */}
                                <button
                                    onClick={() => toggleMonth(monthKey)}
                                    className="w-full flex items-center justify-between p-3 bg-day-card-bg/50 dark:bg-night-card-bg/50 rounded-lg border border-day-border dark:border-night-border hover:bg-day-card-bg dark:hover:bg-night-card-bg transition-colors mb-2"
                                    aria-expanded={!collapsedMonths.has(monthKey)}
                                    aria-controls={`month-${monthKey}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-serif text-lg font-semibold text-day-text-primary dark:text-night-text-primary">
                                            {formatMonthHeader(monthKey)}
                                        </span>
                                        <span className="text-sm text-day-text-secondary dark:text-night-text-secondary bg-day-border dark:bg-night-border px-2 py-0.5 rounded-full">
                                            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                                        </span>
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-5 w-5 text-day-text-secondary dark:text-night-text-secondary transition-transform ${collapsedMonths.has(monthKey) ? '' : 'rotate-180'}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Entries for this month */}
                                {!collapsedMonths.has(monthKey) && (
                                    <div id={`month-${monthKey}`} className="space-y-3 pl-2">
                                        {entries.map(entry => (
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
                                    </div>
                                )}
                            </div>
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
                    // Calibration Dream - Show AI capabilities before first entry
                    <div className="space-y-6">
                        {/* Intro Banner */}
                        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-xl p-4 border border-indigo-500/20">
                            <div className="flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                <div>
                                    <h3 className="font-medium text-day-text-primary dark:text-night-text-primary mb-1">
                                        See How Somnia Analyzes Dreams
                                    </h3>
                                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                                        Tap this sample dream to explore AI-powered insights. Then record your own!
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Calibration Dream Card */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => onDreamSelect(CALIBRATION_DREAM.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDreamSelect(CALIBRATION_DREAM.id); } }}
                            aria-label={`View sample dream: ${CALIBRATION_DREAM.title}`}
                            className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4 cursor-pointer hover:border-day-accent dark:hover:border-night-accent transition-colors focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                        Sample Dream
                                    </span>
                                    <h4 className="font-serif text-lg text-day-text-primary dark:text-night-text-primary">
                                        {CALIBRATION_DREAM.title}
                                    </h4>
                                </div>
                                <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>AI Analyzed
                                </span>
                            </div>
                            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary line-clamp-2 mb-3">
                                {CALIBRATION_DREAM.dreamText}
                            </p>
                            {CALIBRATION_DREAM.aiAnalysis && (
                                <div className="bg-day-bg-start/50 dark:bg-night-bg-start/50 rounded-lg p-3 mb-3">
                                    <p className="text-sm font-medium text-day-accent dark:text-night-accent mb-1">
                                        {CALIBRATION_DREAM.aiAnalysis.title}
                                    </p>
                                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary line-clamp-2">
                                        {CALIBRATION_DREAM.aiAnalysis.analysis[0]?.content}
                                    </p>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <div className="flex gap-1">
                                    {CALIBRATION_DREAM.tags?.slice(0, 3).map(tag => (
                                        <span key={tag} className="px-2 py-0.5 bg-day-border/50 dark:bg-night-border/50 text-xs rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <span className="text-day-accent dark:text-night-accent text-sm font-medium">
                                    Tap to explore →
                                </span>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="text-center pt-4">
                            <button
                                onClick={() => setIsAddSleepModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Record Your First Dream
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Action Button */}
            <button
                onClick={() => setIsAddSleepModalOpen(true)}
                className="fixed bottom-[calc(6rem+var(--safe-area-inset-bottom))] right-6 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-40"
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
                isLoading={isExportImportLoading}
            />
        </div>
    );
};
