import React, { useMemo } from 'react';

interface WakeEvent {
    timestamp: number;
    magnitude: number;
}

interface WakeWindowVizProps {
    events: WakeEvent[];
    height?: number;
}

export const WakeWindowViz: React.FC<WakeWindowVizProps> = ({ events, height = 120 }) => {
    // Generate SVG path from events
    const { pathD, areaD } = useMemo(() => {
        if (events.length === 0) return { pathD: '', areaD: '' };

        const width = 100; // viewBox width percent
        const maxMag = 8.0; // Scale max magnitude (movements > 8 are extreme)
        const points = events.map((e, i) => {
            const x = (i / (Math.max(events.length - 1, 1))) * width;
            // Clamp magnitude visually
            const y = 100 - (Math.min(e.magnitude, maxMag) / maxMag) * 100;
            return `${x},${y}`;
        });

        // Add start/end for area
        const linePath = `M ${points.join(' L ')}`;
        const areaPath = `M ${points[0]} L ${points.join(' L ')} L ${points[points.length - 1].split(',')[0]},100 L 0,100 Z`;

        return { pathD: linePath, areaD: areaPath };
    }, [events]);

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-6 bg-black/10 dark:bg-white/5 rounded-xl border border-dashed border-day-border dark:border-night-border h-[120px]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-day-accent dark:text-night-accent animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-2">Monitoring sleep levels...</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-day-card-bg/50 dark:bg-night-card-bg/50 rounded-xl overflow-hidden border border-day-border dark:border-night-border relative">
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                preserveAspectRatio="none"
                style={{ height: `${height}px` }}
            >
                {/* Gradient Definition */}
                <defs>
                    <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                    </linearGradient>
                </defs>

                {/* Grid Lines (Subtle) */}
                <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
                <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />

                {/* Area Fill */}
                <path d={areaD} fill="url(#sleepGradient)" />

                {/* Line Stroke */}
                <path
                    d={pathD}
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>

            {/* Live Indicator */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 bg-black/20 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/80">Live</span>
            </div>

            {/* Last event magnitude display */}
            <div className="absolute bottom-2 left-2 text-xs font-mono opacity-50">
                {events[events.length - 1]?.magnitude.toFixed(1)} m/s²
            </div>
        </div>
    );
};
