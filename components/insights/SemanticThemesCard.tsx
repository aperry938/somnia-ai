import React, { useState } from 'react';
import { Dream, SemanticTheme } from '../../types';
import { extractSemanticThemes } from '../../services/mlAnalyticsService';
import { isPremium } from '../../services/secureSubscriptionService';
import { PremiumBadge } from '../shared/PremiumBadge';

interface SemanticThemesCardProps {
    dreams: Dream[];
    onDreamSelect?: (id: number) => void;
}

// Archetype icons
const ARCHETYPE_ICONS: Record<string, string> = {
    'The Hero': '⚔️',
    'The Shadow': '🌑',
    'The Anima': '🌙',
    'The Animus': '☀️',
    'The Self': '🔮',
    'The Wise Old Man': '🧙',
    'The Great Mother': '🌍',
    'The Trickster': '🃏',
    'The Child': '👶',
};

export const SemanticThemesCard: React.FC<SemanticThemesCardProps> = ({ dreams, onDreamSelect }) => {
    const [themes, setThemes] = useState<SemanticTheme[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
    const userIsPremium = isPremium();

    const handleExtract = async () => {
        if (!userIsPremium || dreams.length < 3) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await extractSemanticThemes(dreams);
            setThemes(result);
        } catch (e) {
            setError('Failed to extract themes');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-serif text-xl">Semantic Themes</h3>
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                        AI-discovered patterns across your dreams
                    </p>
                </div>
                {!userIsPremium && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        PRO
                    </span>
                )}
            </div>

            {themes && themes.length > 0 ? (
                <div className="space-y-3 animate-fadeIn">
                    {themes.map((theme, i) => (
                        <div
                            key={i}
                            className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
                        >
                            <button
                                onClick={() => setExpandedTheme(expandedTheme === theme.name ? null : theme.name)}
                                className="w-full p-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
                            >
                                {/* Strength indicator */}
                                <div
                                    className="w-2 h-8 rounded-full bg-gradient-to-t from-indigo-500 to-purple-500"
                                    style={{ opacity: 0.3 + theme.strength * 0.7 }}
                                />

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {theme.archetype && (
                                            <span className="text-lg" title={theme.archetype}>
                                                {ARCHETYPE_ICONS[theme.archetype] || '🔷'}
                                            </span>
                                        )}
                                        <span className="font-medium">{theme.name}</span>
                                        <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                            ({theme.dreamIds.length} dreams)
                                        </span>
                                    </div>

                                    {/* Symbols */}
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {theme.symbols.slice(0, 4).map((symbol, j) => (
                                            <span
                                                key={j}
                                                className="text-xs px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded"
                                            >
                                                {symbol}
                                            </span>
                                        ))}
                                        {theme.symbols.length > 4 && (
                                            <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                                +{theme.symbols.length - 4}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-5 w-5 transition-transform ${expandedTheme === theme.name ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Expanded content */}
                            {expandedTheme === theme.name && (
                                <div className="px-3 pb-3 pt-1 border-t border-white/10 animate-fadeIn">
                                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-3">
                                        {theme.interpretation}
                                    </p>

                                    {theme.archetype && (
                                        <p className="text-xs text-purple-400 mb-2">
                                            Archetype: {theme.archetype}
                                        </p>
                                    )}

                                    {/* Dream links */}
                                    {onDreamSelect && (
                                        <div className="flex flex-wrap gap-1">
                                            {theme.dreamIds.slice(0, 5).map(id => (
                                                <button
                                                    key={id}
                                                    onClick={() => onDreamSelect(id)}
                                                    className="text-xs px-2 py-1 bg-day-accent/20 dark:bg-night-accent/20 text-day-accent dark:text-night-accent rounded hover:bg-day-accent/30 dark:hover:bg-night-accent/30 transition-colors"
                                                >
                                                    Dream #{id}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-4">
                    <p className="text-red-400 mb-2">{error}</p>
                    <button
                        onClick={handleExtract}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <PremiumBadge feature="semantic_themes" className="w-full">
                    <div className="space-y-3">
                        {dreams.length < 3 && (
                            <p className="text-sm text-center text-day-text-secondary dark:text-night-text-secondary">
                                Log at least 3 dreams to discover themes
                            </p>
                        )}
                        <button
                            onClick={handleExtract}
                            disabled={isLoading || !userIsPremium || dreams.length < 3}
                            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Discovering Themes...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                    Discover Themes
                                </>
                            )}
                        </button>
                    </div>
                </PremiumBadge>
            )}
        </div>
    );
};
