// components/shared/TagInput.tsx
import React, { useState, KeyboardEvent } from 'react';
import { validateTags, INPUT_LIMITS, sanitizeText } from '../../services/validationService';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    suggestions?: string[];
    placeholder?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
    tags,
    onChange,
    suggestions = [],
    placeholder = 'Add tag...'
}) => {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const addTag = (tag: string) => {
        // Sanitize and validate tag
        const sanitized = sanitizeText(tag).toLowerCase();
        const normalizedTag = sanitized.slice(0, INPUT_LIMITS.tags);

        if (normalizedTag && !tags.includes(normalizedTag) && tags.length < INPUT_LIMITS.maxTags) {
            // Validate the full tag list
            const newTags = validateTags([...tags, normalizedTag]);
            onChange(newTags);
        }
        setInputValue('');
        setShowSuggestions(false);
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            const lastTag = tags[tags.length - 1];
            if (lastTag) removeTag(lastTag);
        }
    };

    const filteredSuggestions = suggestions.filter(
        s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
    ).slice(0, 5);

    return (
        <div className="relative">
            <div className="flex flex-wrap gap-2 p-2 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-lg min-h-[44px]">
                {tags.map(tag => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-day-accent/20 dark:bg-night-accent/20 text-day-accent dark:text-night-accent rounded-full text-sm"
                    >
                        <span>#{tag}</span>
                        <button
                            onClick={() => removeTag(tag)}
                            aria-label={`Remove tag ${tag}`}
                            className="p-1 min-h-[24px] min-w-[24px] flex items-center justify-center hover:text-red-500 transition-colors rounded-full"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    aria-label="Add tag"
                    className="flex-1 min-w-[100px] bg-transparent outline-none text-base"
                />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-lg shadow-lg z-10 overflow-hidden" role="listbox" aria-label="Tag suggestions">
                    {filteredSuggestions.map(suggestion => (
                        <button
                            key={suggestion}
                            onClick={() => addTag(suggestion)}
                            role="option"
                            aria-label={`Add tag ${suggestion}`}
                            className="w-full text-left px-3 py-3 min-h-[44px] text-sm hover:bg-day-accent/10 dark:hover:bg-night-accent/10 transition-colors"
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
export const COMMON_DREAM_TAGS = [
    'flying', 'falling', 'chase', 'water', 'lucid',
    'nightmare', 'recurring', 'prophetic', 'vivid',
    'family', 'work', 'school', 'death', 'animals',
    'travel', 'love', 'fear', 'adventure', 'transformation'
];
