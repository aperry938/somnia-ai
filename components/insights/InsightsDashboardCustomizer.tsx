import React, { useState, useCallback, useEffect } from 'react';
import haptics from '../../services/hapticsService';
import { logger } from '../../services/logger';

const LAYOUT_STORAGE_KEY = 'somnia_insights_layout';

/**
 * Defines all available insight cards on the InsightsPage "My Dreams" tab.
 * Each card has a stable ID (matching the component name used to render it),
 * a human-readable label, and the tab group it belongs to.
 */
export interface InsightCardConfig {
    id: string;
    label: string;
    group: 'QuickStats' | 'Content' | 'Temporal' | 'Emotions' | 'Themes' | 'People';
}

export const DEFAULT_INSIGHT_CARDS: InsightCardConfig[] = [
    { id: 'WeeklyDigest', label: 'Weekly Digest', group: 'QuickStats' },
    { id: 'DreamCalendar', label: 'Dream Calendar', group: 'Temporal' },
    { id: 'DreamWordCloud', label: 'Word Cloud', group: 'Content' },
    { id: 'DreamMoodTracker', label: 'Mood Tracker', group: 'Emotions' },
    { id: 'DreamStreakCalendar', label: 'Streak Calendar', group: 'Temporal' },
    { id: 'RecurringThemes', label: 'Recurring Themes', group: 'Themes' },
    { id: 'RecurringPatterns', label: 'Recurring Patterns', group: 'Themes' },
];

export interface InsightCardLayout {
    id: string;
    visible: boolean;
    order: number;
}

export interface InsightsLayoutData {
    cards: InsightCardLayout[];
}

const GROUP_LABELS: Record<InsightCardConfig['group'], string> = {
    QuickStats: 'Quick Stats',
    Content: 'Content',
    Temporal: 'Temporal',
    Emotions: 'Emotions',
    Themes: 'Themes',
    People: 'People',
};

/**
 * Load the saved layout from localStorage, or return the default layout.
 */
export function loadInsightsLayout(): InsightsLayoutData {
    try {
        const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (!raw) return getDefaultLayout();

        const parsed: unknown = JSON.parse(raw);
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'cards' in parsed &&
            Array.isArray((parsed as InsightsLayoutData).cards)
        ) {
            const layout = parsed as InsightsLayoutData;

            // Reconcile: add any new cards that don't exist in saved layout
            const savedIds = new Set(layout.cards.map(c => c.id));
            let maxOrder = Math.max(0, ...layout.cards.map(c => c.order));
            for (const def of DEFAULT_INSIGHT_CARDS) {
                if (!savedIds.has(def.id)) {
                    maxOrder++;
                    layout.cards.push({ id: def.id, visible: true, order: maxOrder });
                }
            }

            return layout;
        }
    } catch (e) {
        logger.error('[InsightsLayout] Failed to load layout:', e);
    }
    return getDefaultLayout();
}

function getDefaultLayout(): InsightsLayoutData {
    return {
        cards: DEFAULT_INSIGHT_CARDS.map((card, i) => ({
            id: card.id,
            visible: true,
            order: i,
        })),
    };
}

function saveInsightsLayout(layout: InsightsLayoutData): void {
    try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch (e) {
        logger.error('[InsightsLayout] Failed to save layout:', e);
    }
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (layout: InsightsLayoutData) => void;
}

export const InsightsDashboardCustomizer: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
    const [cards, setCards] = useState<InsightCardLayout[]>([]);

    // Load layout when modal opens
    useEffect(() => {
        if (isOpen) {
            const layout = loadInsightsLayout();
            setCards([...layout.cards].sort((a, b) => a.order - b.order));
        }
    }, [isOpen]);

    const toggleVisibility = useCallback((id: string) => {
        haptics.light();
        setCards(prev =>
            prev.map(c => (c.id === id ? { ...c, visible: !c.visible } : c))
        );
    }, []);

    const moveUp = useCallback((index: number) => {
        if (index <= 0) return;
        haptics.light();
        setCards(prev => {
            const next = [...prev];
            const above = next[index - 1];
            const current = next[index];
            if (!above || !current) return prev;

            // Swap orders
            const tempOrder = above.order;
            above.order = current.order;
            current.order = tempOrder;

            // Swap positions in array
            next[index - 1] = current;
            next[index] = above;
            return next;
        });
    }, []);

    const moveDown = useCallback((index: number) => {
        haptics.light();
        setCards(prev => {
            if (index >= prev.length - 1) return prev;
            const next = [...prev];
            const below = next[index + 1];
            const current = next[index];
            if (!below || !current) return prev;

            // Swap orders
            const tempOrder = below.order;
            below.order = current.order;
            current.order = tempOrder;

            // Swap positions in array
            next[index + 1] = current;
            next[index] = below;
            return next;
        });
    }, []);

    const handleReset = useCallback(() => {
        haptics.medium();
        const defaultLayout = getDefaultLayout();
        setCards([...defaultLayout.cards].sort((a, b) => a.order - b.order));
    }, []);

    const handleSave = useCallback(() => {
        haptics.medium();
        const layout: InsightsLayoutData = { cards };
        saveInsightsLayout(layout);
        onSave(layout);
        onClose();
    }, [cards, onSave, onClose]);

    if (!isOpen) return null;

    // Group cards for display
    const groupedCards: Record<string, { card: InsightCardLayout; config: InsightCardConfig; index: number }[]> = {};
    cards.forEach((card, index) => {
        const config = DEFAULT_INSIGHT_CARDS.find(c => c.id === card.id);
        if (!config) return;
        const group = config.group;
        if (!groupedCards[group]) groupedCards[group] = [];
        groupedCards[group]!.push({ card, config, index });
    });

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-4 pb-[calc(6.5rem+var(--safe-area-inset-bottom))] sm:pb-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="customizer-title"
        >
            <div
                className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 id="customizer-title" className="font-serif text-xl">Customize Dashboard</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-day-border/30 dark:hover:bg-night-border/30 transition-colors"
                        aria-label="Close customizer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-4">
                    Toggle cards on or off and reorder them with the arrow buttons.
                </p>

                {/* Card list - scrollable */}
                <div className="overflow-y-auto flex-1 space-y-4 pr-1">
                    {cards.map((card, index) => {
                        const config = DEFAULT_INSIGHT_CARDS.find(c => c.id === card.id);
                        if (!config) return null;

                        return (
                            <div
                                key={card.id}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                    card.visible
                                        ? 'bg-day-accent/5 dark:bg-night-accent/5 border-day-accent/20 dark:border-night-accent/20'
                                        : 'bg-day-card-bg/50 dark:bg-night-card-bg/50 border-day-border dark:border-night-border opacity-60'
                                }`}
                            >
                                {/* Toggle */}
                                <button
                                    onClick={() => toggleVisibility(card.id)}
                                    className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${
                                        card.visible
                                            ? 'bg-day-accent dark:bg-night-accent'
                                            : 'bg-day-border dark:bg-night-border'
                                    }`}
                                    role="switch"
                                    aria-checked={card.visible}
                                    aria-label={`Toggle ${config.label}`}
                                >
                                    <span
                                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                            card.visible ? 'translate-x-[18px]' : 'translate-x-0.5'
                                        }`}
                                    />
                                </button>

                                {/* Label + group */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{config.label}</p>
                                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                        {GROUP_LABELS[config.group]}
                                    </p>
                                </div>

                                {/* Reorder buttons */}
                                <div className="flex flex-col gap-0.5 flex-shrink-0">
                                    <button
                                        onClick={() => moveUp(index)}
                                        disabled={index === 0}
                                        className="w-7 h-7 rounded flex items-center justify-center hover:bg-day-border/30 dark:hover:bg-night-border/30 transition-colors disabled:opacity-30"
                                        aria-label={`Move ${config.label} up`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => moveDown(index)}
                                        disabled={index === cards.length - 1}
                                        className="w-7 h-7 rounded flex items-center justify-center hover:bg-day-border/30 dark:hover:bg-night-border/30 transition-colors disabled:opacity-30"
                                        aria-label={`Move ${config.label} down`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer actions */}
                <div className="flex gap-3 mt-4 pt-4 border-t border-day-border dark:border-night-border">
                    <button
                        onClick={handleReset}
                        className="flex-1 py-3 min-h-[48px] rounded-xl font-medium text-sm border border-day-border dark:border-night-border hover:bg-day-border/20 dark:hover:bg-night-border/20 transition-colors"
                    >
                        Reset to Default
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-3 min-h-[48px] rounded-xl font-medium text-sm bg-day-accent dark:bg-night-accent text-white hover:opacity-90 transition-opacity"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
