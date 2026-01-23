// components/shared/TagInput.tsx
import React, { useState, KeyboardEvent, useCallback, useRef, useEffect } from 'react';
import { validateTags, INPUT_LIMITS, sanitizeText } from '../../services/validationService';
import haptics from '../../services/hapticsService';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    suggestions?: string[];
    placeholder?: string;
    disabled?: boolean;
}

export const TagInput: React.FC<TagInputProps> = ({
    tags,
    onChange,
    suggestions = [],
    placeholder = 'Add tag...',
    disabled = false
}) => {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    const addTag = useCallback((tag: string) => {
        if (disabled) return;
        // Sanitize and validate tag
        const sanitized = sanitizeText(tag).toLowerCase();
        const normalizedTag = sanitized.slice(0, INPUT_LIMITS.tags);

        if (normalizedTag && !tags.includes(normalizedTag) && tags.length < INPUT_LIMITS.maxTags) {
            haptics.light();
            // Validate the full tag list
            const newTags = validateTags([...tags, normalizedTag]);
            onChange(newTags);
        }
        setInputValue('');
        setShowSuggestions(false);
    }, [disabled, tags, onChange]);

    const removeTag = useCallback((tagToRemove: string) => {
        if (disabled) return;
        haptics.light();
        onChange(tags.filter(tag => tag !== tagToRemove));
    }, [disabled, tags, onChange]);

    const filteredSuggestions = suggestions.filter(
        s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
    ).slice(0, 5);

    // Reset highlighted index when suggestions change
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [inputValue]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && suggestionsRef.current) {
            const items = suggestionsRef.current.querySelectorAll('[role="option"]');
            const item = items[highlightedIndex];
            if (item) {
                item.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        const suggestionsVisible = showSuggestions && inputValue && filteredSuggestions.length > 0;

        if (e.key === 'ArrowDown' && suggestionsVisible) {
            e.preventDefault();
            haptics.selection();
            setHighlightedIndex(prev =>
                prev < filteredSuggestions.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === 'ArrowUp' && suggestionsVisible) {
            e.preventDefault();
            haptics.selection();
            setHighlightedIndex(prev =>
                prev > 0 ? prev - 1 : filteredSuggestions.length - 1
            );
        } else if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
                // Add highlighted suggestion
                const suggestion = filteredSuggestions[highlightedIndex];
                if (suggestion) addTag(suggestion);
            } else {
                // Add typed text
                addTag(inputValue);
            }
            setHighlightedIndex(-1);
        } else if (e.key === 'Escape' && suggestionsVisible) {
            e.preventDefault();
            setShowSuggestions(false);
            setHighlightedIndex(-1);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            const lastTag = tags[tags.length - 1];
            if (lastTag) removeTag(lastTag);
        }
    };

    return (
        <div className={`relative ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="flex flex-wrap gap-2 p-2 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-lg min-h-[44px]">
                {tags.map(tag => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-day-accent/20 dark:bg-night-accent/20 text-day-accent dark:text-night-accent rounded-full text-sm"
                    >
                        <span>#{tag}</span>
                        {!disabled && (
                            <button
                                onClick={() => removeTag(tag)}
                                aria-label={`Remove tag ${tag}`}
                                className="p-2 -mr-1 min-h-[44px] min-w-[44px] flex items-center justify-center active:text-red-500 active:bg-red-200 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 dark:active:bg-red-800/50 transition-colors rounded-full active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        if (disabled) return;
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => !disabled && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => { setShowSuggestions(false); setHighlightedIndex(-1); }, 200)}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    aria-label="Add tag"
                    aria-autocomplete="list"
                    aria-controls={showSuggestions && inputValue && filteredSuggestions.length > 0 ? 'tag-suggestions' : undefined}
                    aria-expanded={showSuggestions && inputValue && filteredSuggestions.length > 0}
                    aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined}
                    role="combobox"
                    disabled={disabled}
                    className={`flex-1 min-w-[100px] bg-transparent outline-none text-base ${disabled ? 'cursor-not-allowed' : ''}`}
                />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
                <div
                    id="tag-suggestions"
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-lg shadow-lg z-10 overflow-hidden max-h-[220px] overflow-y-auto"
                    role="listbox"
                    aria-label="Tag suggestions"
                >
                    {filteredSuggestions.map((suggestion, index) => (
                        <button
                            key={suggestion}
                            id={`suggestion-${index}`}
                            onClick={() => addTag(suggestion)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            role="option"
                            aria-selected={highlightedIndex === index}
                            aria-label={`Add tag ${suggestion}`}
                            className={`w-full text-left px-3 py-3 min-h-[44px] text-sm transition-colors ${
                                highlightedIndex === index
                                    ? 'bg-day-accent/20 dark:bg-night-accent/20 text-day-accent dark:text-night-accent'
                                    : 'hover:bg-day-accent/10 dark:hover:bg-night-accent/10 active:bg-day-accent/20 dark:active:bg-night-accent/20'
                            }`}
                        >
                            #{suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Predefined common dream tags for suggestions
// eslint-disable-next-line react-refresh/only-export-components
export const COMMON_DREAM_TAGS = [
    'flying', 'falling', 'chase', 'water', 'lucid',
    'nightmare', 'recurring', 'prophetic', 'vivid',
    'family', 'work', 'school', 'death', 'animals',
    'travel', 'love', 'fear', 'adventure', 'transformation'
];
