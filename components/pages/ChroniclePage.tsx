
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Dream, DreamMood } from '../../types';
import { exportDreamsAsJSON, exportDreamJournalToPDF, exportDreamsEncrypted, importDreamsEncrypted } from '../../services/exportService';
import { MOOD_ICONS, MOOD_LABELS } from '../../constants/uiIcons';
import { AchievementsCard } from '../insights/AchievementsCard';

const DreamItem: React.FC<{ dream: Dream; onSelect: (id: number) => void; onTagClick: (tag: string) => void }> = React.memo(({ dream, onSelect, onTagClick }) => {
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

// Tag filter pill component
const TagFilter: React.FC<{
    tag: string;
    isActive: boolean;
    onClick: () => void;
    onRemove: () => void;
}> = ({ tag, isActive, onClick, onRemove }) => (
    <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${isActive
            ? 'bg-day-accent dark:bg-night-accent text-white'
            : 'bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border hover:border-day-accent dark:hover:border-night-accent'
            }`}
    >
        <span>#{tag}</span>
        {isActive && (
            <span
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="hover:text-red-200 ml-1"
            >
                ×
            </span>
        )}
    </button>
);


export const ChroniclePage: React.FC<{ onDreamSelect: (id: number) => void }> = ({ onDreamSelect }) => {
    const { dreams, importDreams } = useAppContext();
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search query for performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Extract all unique tags from dreams with frequency count
    const allTags = useMemo(() => {
        const tagCounts = new Map<string, number>();
        dreams.forEach(dream => {
            dream.tags?.forEach(tag => {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            });
        });
        // Sort by frequency (most used first), then alphabetically
        return Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([tag]) => tag);
    }, [dreams]);

    // Filter dreams by active tag and search query
    const filteredDreams = useMemo(() => {
        let result = dreams;

        // Filter by tag first
        if (activeTagFilter) {
            result = result.filter(dream => dream.tags?.includes(activeTagFilter));
        }

        // Then filter by debounced search query
        if (debouncedSearch.trim()) {
            const query = debouncedSearch.toLowerCase();
            result = result.filter(dream =>
                dream.title?.toLowerCase().includes(query) ||
                dream.dreamText.toLowerCase().includes(query) ||
                dream.tags?.some(tag => tag.includes(query))
            );
        }

        return result;
    }, [dreams, activeTagFilter, debouncedSearch]);

    const handleTagClick = (tag: string) => {
        setActiveTagFilter(tag === activeTagFilter ? null : tag);
    };

    const clearFilters = () => {
        setActiveTagFilter(null);
        setSearchQuery('');
    };

    const hasFilters = activeTagFilter || searchQuery.trim();

    // Group dreams by time period
    const groupedDreams = useMemo(() => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const groups: { label: string; dreams: typeof filteredDreams }[] = [];
        const thisWeek = filteredDreams.filter(d => new Date(d.timestamp) >= oneWeekAgo);
        const thisMonth = filteredDreams.filter(d => {
            const date = new Date(d.timestamp);
            return date < oneWeekAgo && date >= oneMonthAgo;
        });
        const older = filteredDreams.filter(d => new Date(d.timestamp) < oneMonthAgo);

        if (thisWeek.length > 0) groups.push({ label: 'This Week', dreams: thisWeek });
        if (thisMonth.length > 0) groups.push({ label: 'Earlier This Month', dreams: thisMonth });
        if (older.length > 0) groups.push({ label: 'Older', dreams: older });

        return groups;
    }, [filteredDreams]);

    const [showExportMenu, setShowExportMenu] = useState(false);

    return (
        <div>
            <div className="relative mb-6">
                <h1 className="font-serif page-title text-4xl text-center">The Chronicle</h1>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 mr-2">
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="p-2 text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent transition-colors"
                        title="Export options"
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
                                                const imported = await importDreamsEncrypted(e.target.files[0], dreams);
                                                importDreams(imported);
                                                alert(`Successfully restored ${imported.length} dreams!`);
                                            } catch (err) {
                                                alert(`Restore failed: ${(err as Error).message}`);
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

            {/* Search bar */}
            <div className="max-w-2xl mx-auto mb-4">
                <div className="relative">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-day-text-secondary dark:text-night-text-secondary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search dreams..."
                        className="w-full pl-10 pr-10 py-2 bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-full focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Tag filter bar */}
            {allTags.length > 0 && (
                <div className="max-w-2xl mx-auto mb-6">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {allTags.slice(0, 10).map(tag => (
                            <TagFilter
                                key={tag}
                                tag={tag}
                                isActive={activeTagFilter === tag}
                                onClick={() => handleTagClick(tag)}
                                onRemove={() => setActiveTagFilter(null)}
                            />
                        ))}
                        {allTags.length > 10 && (
                            <span className="text-xs text-day-text-secondary dark:text-night-text-secondary self-center">
                                +{allTags.length - 10} more
                            </span>
                        )}
                    </div>
                    {activeTagFilter && (
                        <p className="text-center text-sm text-day-text-secondary dark:text-night-text-secondary mt-3">
                            Showing {filteredDreams.length} dream{filteredDreams.length !== 1 ? 's' : ''} with #{activeTagFilter}
                            <button
                                onClick={() => setActiveTagFilter(null)}
                                className="ml-2 text-day-accent dark:text-night-accent hover:underline"
                            >
                                Clear
                            </button>
                        </p>
                    )}
                </div>
            )}

            <div className="space-y-6 max-w-2xl mx-auto">
                {filteredDreams.length > 0 ? (
                    groupedDreams.map(group => (
                        <div key={group.label}>
                            <h2 className="font-serif text-lg text-day-text-secondary dark:text-night-text-secondary mb-3 border-b border-day-border dark:border-night-border pb-2">
                                {group.label}
                            </h2>
                            <div className="space-y-4">
                                {group.dreams.map(dream => (
                                    <DreamItem
                                        key={dream.id}
                                        dream={dream}
                                        onSelect={onDreamSelect}
                                        onTagClick={handleTagClick}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                ) : hasFilters ? (
                    <div className="text-center py-8">
                        <p className="text-day-text-secondary dark:text-night-text-secondary mb-2">
                            No dreams match your filters
                        </p>
                        <button
                            onClick={clearFilters}
                            className="text-day-accent dark:text-night-accent hover:underline text-sm"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-day-text-secondary/30 dark:text-night-text-secondary/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v11.494m-9-5.747h18" />
                        </svg>
                        <h3 className="font-serif text-xl mb-2">Your Dream Journal Awaits</h3>
                        <p className="text-day-text-secondary dark:text-night-text-secondary mb-6 max-w-xs mx-auto">
                            Begin your journey into the subconscious. Set an alarm and record your first dream upon waking.
                        </p>
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('openDreamScribe'))}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-day-accent dark:bg-night-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Log Your First Dream
                        </button>
                    </div>
                )}
            </div>

            {/* Floating Action Button - Always visible for manual dream logging */}
            <button
                onClick={() => window.dispatchEvent(new CustomEvent('openDreamScribe'))}
                className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-40"
                title="Log a dream"
                aria-label="Log a new dream"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    );
};
