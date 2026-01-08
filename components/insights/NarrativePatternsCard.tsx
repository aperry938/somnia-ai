import React, { useState } from 'react';
import { Dream, NarrativePattern } from '../../types';
import { detectNarrativePatterns } from '../../services/mlAnalyticsService';
import { isPremium } from '../../services/secureSubscriptionService';
import { PremiumBadge } from '../shared/PremiumBadge';

interface NarrativePatternsCardProps {
    dreams: Dream[];
    onDreamSelect?: (id: number) => void;
}

// Pattern type icons and colors
const PATTERN_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
    recurring_character: { icon: '👤', color: 'from-blue-500 to-cyan-500', label: 'Character' },
    location_theme: { icon: '🏠', color: 'from-green-500 to-emerald-500', label: 'Location' },
    emotional_arc: { icon: '💭', color: 'from-purple-500 to-pink-500', label: 'Emotional' },
    symbol_chain: { icon: '🔗', color: 'from-amber-500 to-orange-500', label: 'Symbol' },
    unresolved_conflict: { icon: '⚡', color: 'from-red-500 to-rose-500', label: 'Conflict' },
};

export const NarrativePatternsCard: React.FC<NarrativePatternsCardProps> = ({ dreams, onDreamSelect }) => {
    const [patterns, setPatterns] = useState<NarrativePattern[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPattern, setSelectedPattern] = useState<NarrativePattern | null>(null);
    const userIsPremium = isPremium();

    const handleDetect = async () => {
        if (!userIsPremium || dreams.length < 5) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await detectNarrativePatterns(dreams);
            setPatterns(result);
        } catch (e) {
            setError('Failed to detect patterns');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-serif text-xl">Narrative Patterns</h3>
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                        Recurring story elements across your dreams
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

            {patterns && patterns.length > 0 ? (
                <div className="space-y-4 animate-fadeIn">
                    {/* Pattern type filter pills */}
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(PATTERN_CONFIG).map(([type, config]) => {
                            const count = patterns.filter(p => p.type === type).length;
                            if (count === 0) return null;
                            return (
                                <span
                                    key={type}
                                    className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${config.color} bg-opacity-20 text-white/80`}
                                >
                                    {config.icon} {config.label} ({count})
                                </span>
                            );
                        })}
                    </div>

                    {/* Patterns list */}
                    <div className="space-y-2">
                        {patterns.map((pattern, i) => {
                            const config = PATTERN_CONFIG[pattern.type] || PATTERN_CONFIG.symbol_chain;
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedPattern(selectedPattern?.name === pattern.name ? null : pattern)}
                                    className="w-full text-left p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{config.icon}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{pattern.name}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded bg-gradient-to-r ${config.color} text-white`}>
                                                    ×{pattern.frequency}
                                                </span>
                                            </div>
                                            <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                                {formatDate(pattern.firstSeen)} → {formatDate(pattern.lastSeen)}
                                            </div>
                                        </div>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className={`h-4 w-4 transition-transform ${selectedPattern?.name === pattern.name ? 'rotate-180' : ''}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>

                                    {/* Expanded details */}
                                    {selectedPattern?.name === pattern.name && (
                                        <div className="mt-3 pt-3 border-t border-white/10 animate-fadeIn" onClick={e => e.stopPropagation()}>
                                            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-2">
                                                {pattern.description}
                                            </p>

                                            {pattern.evolution && (
                                                <p className="text-xs text-purple-400 italic mb-2">
                                                    Evolution: {pattern.evolution}
                                                </p>
                                            )}

                                            {/* Dream links */}
                                            {onDreamSelect && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {pattern.dreamIds.slice(0, 6).map(id => (
                                                        <button
                                                            key={id}
                                                            onClick={() => onDreamSelect(id)}
                                                            className="text-xs px-2 py-1 bg-day-accent/20 dark:bg-night-accent/20 text-day-accent dark:text-night-accent rounded hover:bg-day-accent/30 dark:hover:bg-night-accent/30 transition-colors"
                                                        >
                                                            #{id}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : error ? (
                <div className="text-center py-4">
                    <p className="text-red-400 mb-2">{error}</p>
                    <button
                        onClick={handleDetect}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <PremiumBadge feature="narrative_patterns" className="w-full">
                    <div className="space-y-3">
                        {dreams.length < 5 && (
                            <p className="text-sm text-center text-day-text-secondary dark:text-night-text-secondary">
                                Log at least 5 dreams to detect patterns
                            </p>
                        )}
                        <button
                            onClick={handleDetect}
                            disabled={isLoading || !userIsPremium || dreams.length < 5}
                            className="w-full py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Detecting Patterns...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Detect Patterns
                                </>
                            )}
                        </button>
                    </div>
                </PremiumBadge>
            )}
        </div>
    );
};
