import React, { useMemo, useState } from 'react';
import { Dream, DreamTelemetry } from '../../types';

interface TelemetryScatterPlotProps {
    dreams: Dream[];
    onDreamSelect?: (id: number) => void;
}

// Russell's Circumplex Model quadrant labels
const QUADRANT_LABELS = {
    highEnergyPositive: { label: 'Excited', sublabel: 'Alert, Elated, Happy', color: 'text-amber-500' },
    highEnergyNegative: { label: 'Tense', sublabel: 'Nervous, Stressed, Upset', color: 'text-red-500' },
    lowEnergyPositive: { label: 'Content', sublabel: 'Serene, Relaxed, Calm', color: 'text-emerald-500' },
    lowEnergyNegative: { label: 'Depressed', sublabel: 'Sad, Lethargic, Fatigued', color: 'text-indigo-500' }
};

// Map valence/arousal to quadrant
const getQuadrant = (valence: number, arousal: number): keyof typeof QUADRANT_LABELS => {
    if (arousal > 0.5) {
        return valence > 0 ? 'highEnergyPositive' : 'highEnergyNegative';
    }
    return valence > 0 ? 'lowEnergyPositive' : 'lowEnergyNegative';
};

// Get point color based on valence/arousal
const getPointColor = (valence: number, arousal: number): string => {
    const quadrant = getQuadrant(valence, arousal);
    const colors = {
        highEnergyPositive: '#f59e0b', // amber
        highEnergyNegative: '#ef4444', // red
        lowEnergyPositive: '#10b981', // emerald
        lowEnergyNegative: '#6366f1'  // indigo
    };
    return colors[quadrant];
};

export const TelemetryScatterPlot: React.FC<TelemetryScatterPlotProps> = ({ dreams, onDreamSelect }) => {
    const [hoveredDream, setHoveredDream] = useState<Dream | null>(null);
    const [selectedQuadrant, setSelectedQuadrant] = useState<keyof typeof QUADRANT_LABELS | null>(null);

    // Filter dreams that have telemetry data
    const dreamsWithTelemetry = useMemo(() => {
        return dreams.filter(d =>
            d.aiAnalysis?.telemetry &&
            typeof d.aiAnalysis.telemetry.valence === 'number' &&
            typeof d.aiAnalysis.telemetry.arousal === 'number'
        );
    }, [dreams]);

    // Calculate quadrant stats
    const quadrantStats = useMemo(() => {
        const stats = {
            highEnergyPositive: 0,
            highEnergyNegative: 0,
            lowEnergyPositive: 0,
            lowEnergyNegative: 0
        };

        dreamsWithTelemetry.forEach(d => {
            const telemetry = d.aiAnalysis!.telemetry!;
            const quadrant = getQuadrant(telemetry.valence, telemetry.arousal);
            stats[quadrant]++;
        });

        return stats;
    }, [dreamsWithTelemetry]);

    // Filter by selected quadrant
    const filteredDreams = useMemo(() => {
        if (!selectedQuadrant) return dreamsWithTelemetry;
        return dreamsWithTelemetry.filter(d => {
            const telemetry = d.aiAnalysis!.telemetry!;
            return getQuadrant(telemetry.valence, telemetry.arousal) === selectedQuadrant;
        });
    }, [dreamsWithTelemetry, selectedQuadrant]);

    if (dreamsWithTelemetry.length < 3) {
        return (
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-5">
                <h3 className="font-serif text-xl mb-2">Emotional Landscape</h3>
                <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                    Need at least 3 analyzed dreams to display the emotional scatter plot.
                    Currently have {dreamsWithTelemetry.length} dream{dreamsWithTelemetry.length !== 1 ? 's' : ''} with telemetry.
                </p>
            </div>
        );
    }

    // Convert valence (-1 to 1) and arousal (0 to 1) to plot coordinates
    const toPlotCoords = (valence: number, arousal: number) => ({
        x: ((valence + 1) / 2) * 100, // 0-100%
        y: (1 - arousal) * 100        // 0-100% (inverted so high arousal is at top)
    });

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-serif text-xl">Emotional Landscape</h3>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                        Russell's Circumplex Model of Affect
                    </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-day-text-secondary dark:text-night-text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{filteredDreams.length} dreams</span>
                </div>
            </div>

            {/* Quadrant Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setSelectedQuadrant(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        !selectedQuadrant
                            ? 'bg-day-accent dark:bg-night-accent text-white'
                            : 'bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20'
                    }`}
                >
                    All ({dreamsWithTelemetry.length})
                </button>
                {(Object.keys(QUADRANT_LABELS) as Array<keyof typeof QUADRANT_LABELS>).map(quadrant => (
                    <button
                        key={quadrant}
                        onClick={() => setSelectedQuadrant(selectedQuadrant === quadrant ? null : quadrant)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            selectedQuadrant === quadrant
                                ? 'bg-day-accent dark:bg-night-accent text-white'
                                : 'bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20'
                        }`}
                    >
                        {QUADRANT_LABELS[quadrant].label} ({quadrantStats[quadrant]})
                    </button>
                ))}
            </div>

            {/* Scatter Plot */}
            <div className="relative aspect-square max-w-md mx-auto bg-gradient-to-br from-white/5 to-white/10 dark:from-black/10 dark:to-black/20 rounded-lg overflow-hidden">
                {/* Axis Lines */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-day-border dark:bg-night-border" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-day-border dark:bg-night-border" />

                {/* Quadrant Labels */}
                <div className="absolute top-2 right-2 text-right">
                    <span className={`text-xs font-medium ${QUADRANT_LABELS.highEnergyPositive.color}`}>
                        {QUADRANT_LABELS.highEnergyPositive.label}
                    </span>
                </div>
                <div className="absolute top-2 left-2 text-left">
                    <span className={`text-xs font-medium ${QUADRANT_LABELS.highEnergyNegative.color}`}>
                        {QUADRANT_LABELS.highEnergyNegative.label}
                    </span>
                </div>
                <div className="absolute bottom-2 right-2 text-right">
                    <span className={`text-xs font-medium ${QUADRANT_LABELS.lowEnergyPositive.color}`}>
                        {QUADRANT_LABELS.lowEnergyPositive.label}
                    </span>
                </div>
                <div className="absolute bottom-2 left-2 text-left">
                    <span className={`text-xs font-medium ${QUADRANT_LABELS.lowEnergyNegative.color}`}>
                        {QUADRANT_LABELS.lowEnergyNegative.label}
                    </span>
                </div>

                {/* Axis Labels */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] text-day-text-secondary dark:text-night-text-secondary opacity-60">
                    High Energy
                </div>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-day-text-secondary dark:text-night-text-secondary opacity-60">
                    Low Energy
                </div>
                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-day-text-secondary dark:text-night-text-secondary opacity-60 writing-mode-vertical">
                    Unpleasant
                </div>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-day-text-secondary dark:text-night-text-secondary opacity-60 writing-mode-vertical">
                    Pleasant
                </div>

                {/* Data Points */}
                {filteredDreams.map(dream => {
                    const telemetry = dream.aiAnalysis!.telemetry!;
                    const coords = toPlotCoords(telemetry.valence, telemetry.arousal);
                    const color = getPointColor(telemetry.valence, telemetry.arousal);
                    const isHovered = hoveredDream?.id === dream.id;

                    return (
                        <button
                            key={dream.id}
                            className={`absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all cursor-pointer
                                ${isHovered ? 'scale-150 z-10 ring-2 ring-white/50' : 'hover:scale-125'}`}
                            style={{
                                left: `${coords.x}%`,
                                top: `${coords.y}%`,
                                backgroundColor: color,
                                opacity: isHovered ? 1 : 0.7
                            }}
                            onMouseEnter={() => setHoveredDream(dream)}
                            onMouseLeave={() => setHoveredDream(null)}
                            onClick={() => onDreamSelect?.(dream.id)}
                            aria-label={`Dream: ${dream.title || 'Untitled'}`}
                        />
                    );
                })}

                {/* Hover Tooltip */}
                {hoveredDream && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-lg p-3 shadow-lg z-20 min-w-[200px] max-w-[280px]">
                        <h4 className="font-medium text-sm truncate">{hoveredDream.title || 'Untitled Dream'}</h4>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-1">
                            {new Date(hoveredDream.timestamp).toLocaleDateString()}
                        </p>
                        {hoveredDream.aiAnalysis?.telemetry && (
                            <div className="flex gap-3 mt-2 text-xs">
                                <span>
                                    Valence: <strong>{hoveredDream.aiAnalysis.telemetry.valence.toFixed(2)}</strong>
                                </span>
                                <span>
                                    Arousal: <strong>{hoveredDream.aiAnalysis.telemetry.arousal.toFixed(2)}</strong>
                                </span>
                            </div>
                        )}
                        {hoveredDream.aiAnalysis?.telemetry?.tags && hoveredDream.aiAnalysis.telemetry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {hoveredDream.aiAnalysis.telemetry.tags.slice(0, 3).map((tag, i) => (
                                    <span
                                        key={i}
                                        className="text-[10px] px-1.5 py-0.5 bg-white/10 dark:bg-black/20 rounded"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 mt-4">
                {(Object.entries(QUADRANT_LABELS) as Array<[keyof typeof QUADRANT_LABELS, typeof QUADRANT_LABELS[keyof typeof QUADRANT_LABELS]]>).map(([key, value]) => {
                    const count = quadrantStats[key];
                    const percentage = dreamsWithTelemetry.length > 0
                        ? Math.round((count / dreamsWithTelemetry.length) * 100)
                        : 0;

                    return (
                        <div
                            key={key}
                            className={`p-3 rounded-lg bg-white/5 dark:bg-black/10 ${
                                selectedQuadrant === key ? 'ring-1 ring-day-accent dark:ring-night-accent' : ''
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: getPointColor(
                                        key.includes('Positive') ? 0.5 : -0.5,
                                        key.includes('high') ? 0.75 : 0.25
                                    )}}
                                />
                                <span className={`text-sm font-medium ${value.color}`}>{value.label}</span>
                            </div>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-1">
                                {value.sublabel}
                            </p>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-lg font-bold">{count}</span>
                                <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                    ({percentage}%)
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Interpretation */}
            {dreamsWithTelemetry.length >= 5 && (
                <div className="mt-4 p-3 bg-day-accent/10 dark:bg-night-accent/10 rounded-lg">
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                        {(() => {
                            const dominant = (Object.entries(quadrantStats) as Array<[keyof typeof QUADRANT_LABELS, number]>)
                                .sort((a, b) => b[1] - a[1])[0];
                            const dominantLabel = QUADRANT_LABELS[dominant[0]];
                            const percentage = Math.round((dominant[1] / dreamsWithTelemetry.length) * 100);

                            return (
                                <>
                                    Your dreams tend toward <strong className={dominantLabel.color}>{dominantLabel.label.toLowerCase()}</strong> emotions ({percentage}% of dreams).
                                    {dominant[0].includes('Negative') && (
                                        <> Consider journaling about what's causing stress in your waking life.</>
                                    )}
                                    {dominant[0] === 'lowEnergyPositive' && (
                                        <> Your dreamscape reflects a peaceful, content state of mind.</>
                                    )}
                                    {dominant[0] === 'highEnergyPositive' && (
                                        <> Your dreams are vibrant and energetic - a sign of engagement with life.</>
                                    )}
                                </>
                            );
                        })()}
                    </p>
                </div>
            )}
        </div>
    );
};
