
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Dream } from '../../types';

const DreamItem: React.FC<{ dream: Dream; onSelect: (id: number) => void; onTagClick: (tag: string) => void }> = ({ dream, onSelect, onTagClick }) => {
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
};

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
    const { dreams } = useAppContext();
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

    // Extract all unique tags from dreams
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        dreams.forEach(dream => {
            dream.tags?.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
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

    return (
        <div>
            <h1 className="font-serif page-title text-4xl text-center mb-6">The Chronicle</h1>

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

            <div className="space-y-4 max-w-2xl mx-auto">
                {filteredDreams.length > 0 ? (
                    filteredDreams.map(dream => (
                        <DreamItem
                            key={dream.id}
                            dream={dream}
                            onSelect={onDreamSelect}
                            onTagClick={handleTagClick}
                        />
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
                    <p className="text-center text-day-text-secondary dark:text-night-text-secondary">Your dream journal is empty.</p>
                )}
            </div>
        </div>
    );
};
