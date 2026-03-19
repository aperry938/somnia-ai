import React, { useState, useEffect, useCallback, useRef } from 'react';
import haptics from '../services/hapticsService';

// Minimum touch target size for mobile accessibility (Apple HIG / Material Design)
const MIN_TOUCH_TARGET = 44;
const ITEM_HEIGHT = 56;

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ['AM', 'PM'] as const;

export const DrumTimePicker: React.FC<{ initialTime: string; onChange: (time: string) => void }> = ({ initialTime, onChange }) => {
    const [hour, setHour] = useState(() => {
        const h = parseInt(initialTime.split(':')[0] ?? '0', 10);
        return h === 0 ? 12 : h > 12 ? h - 12 : h;
    });
    const [minute, setMinute] = useState(() => parseInt(initialTime.split(':')[1] ?? '0', 10));
    const [period, setPeriod] = useState(() => parseInt(initialTime.split(':')[0] ?? '0', 10) >= 12 ? 'PM' : 'AM');

    const hourRef = useRef<HTMLDivElement>(null);
    const minuteRef = useRef<HTMLDivElement>(null);
    const periodRef = useRef<HTMLDivElement>(null);
    const isInitialMount = useRef(true);

    const handleTimeChange = useCallback((h: number, m: number, p: string) => {
        const finalHour = p === 'PM' && h !== 12 ? h + 12 : p === 'AM' && h === 12 ? 0 : h;
        const timeString = `${String(finalHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        onChange(timeString);
    }, [onChange]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            haptics.selection();
        }
        handleTimeChange(hour, minute, period);
    }, [hour, minute, period, handleTimeChange]);

    // Scroll to selected values on mount
    useEffect(() => {
        const scrollToInitialValues = () => {
            if (hourRef.current) hourRef.current.scrollTop = (hour - 1) * ITEM_HEIGHT;
            if (minuteRef.current) minuteRef.current.scrollTop = minute * ITEM_HEIGHT;
            if (periodRef.current) periodRef.current.scrollTop = period === 'AM' ? 0 : ITEM_HEIGHT;
        };

        let rafId2: number | undefined;
        const rafId1 = requestAnimationFrame(() => {
            rafId2 = requestAnimationFrame(scrollToInitialValues);
        });

        return () => {
            cancelAnimationFrame(rafId1);
            if (rafId2 !== undefined) cancelAnimationFrame(rafId2);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleNumberScroll = (
        ref: React.RefObject<HTMLDivElement | null>,
        setter: React.Dispatch<React.SetStateAction<number>>,
        values: readonly number[]
    ) => {
        if (!ref.current) return;
        const scrollTop = ref.current.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
        setter(values[clampedIndex] ?? 0);
    };

    const handleStringScroll = (
        ref: React.RefObject<HTMLDivElement | null>,
        setter: React.Dispatch<React.SetStateAction<string>>,
        values: readonly string[]
    ) => {
        if (!ref.current) return;
        const scrollTop = ref.current.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
        setter(values[clampedIndex] ?? '');
    };

    const scrollToValue = (ref: React.RefObject<HTMLDivElement | null>, index: number) => {
        if (ref.current) {
            ref.current.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' });
        }
    };

    return (
        <div className="flex flex-col items-center" role="group" aria-label="Time picker">
            <div
                className="text-5xl font-light mb-4 text-day-text dark:text-night-text"
                aria-live="polite"
                aria-atomic="true"
            >
                <span aria-label={`Selected time: ${String(hour).padStart(2, '0')} ${String(minute).padStart(2, '0')} ${period}`}>
                    {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} <span className="text-3xl">{period}</span>
                </span>
            </div>

            <div className="relative flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4">
                <div className="absolute left-4 right-4 h-14 bg-day-accent/20 dark:bg-night-accent/20 rounded-xl pointer-events-none border-2 border-day-accent/40 dark:border-night-accent/40" style={{ top: '50%', transform: 'translateY(-50%)' }} aria-hidden="true" />

                {/* Hour drum */}
                <div className="relative" role="listbox" aria-label="Hour">
                    <div
                        ref={hourRef}
                        className="h-44 w-20 overflow-y-auto scroll-snap-y scroll-snap-mandatory hide-scrollbar overscroll-contain"
                        onScroll={() => handleNumberScroll(hourRef, setHour, HOURS_12)}
                        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
                        tabIndex={0}
                        aria-activedescendant={`hour-${hour}`}
                    >
                        <div className="h-[calc(50%-28px)]" aria-hidden="true" />
                        {HOURS_12.map((h) => (
                            <div
                                key={h}
                                id={`hour-${h}`}
                                role="option"
                                aria-selected={hour === h}
                                onClick={() => { setHour(h); scrollToValue(hourRef, h - 1); haptics.tick(); }}
                                className={`h-14 min-h-[${MIN_TOUCH_TARGET}px] flex items-center justify-center text-3xl font-medium cursor-pointer transition-all scroll-snap-align-center ${hour === h
                                    ? 'text-day-accent dark:text-night-accent scale-110'
                                    : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                style={{ scrollSnapAlign: 'center' }}
                            >
                                {String(h).padStart(2, '0')}
                            </div>
                        ))}
                        <div className="h-[calc(50%-28px)]" aria-hidden="true" />
                    </div>
                </div>

                <span className="text-4xl font-light text-day-text dark:text-night-text">:</span>

                {/* Minute drum */}
                <div className="relative" role="listbox" aria-label="Minute">
                    <div
                        ref={minuteRef}
                        className="h-44 w-20 overflow-y-auto scroll-snap-y scroll-snap-mandatory hide-scrollbar overscroll-contain"
                        onScroll={() => handleNumberScroll(minuteRef, setMinute, MINUTES_60)}
                        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
                        tabIndex={0}
                        aria-activedescendant={`minute-${minute}`}
                    >
                        <div className="h-[calc(50%-28px)]" aria-hidden="true" />
                        {MINUTES_60.map((m) => (
                            <div
                                key={m}
                                id={`minute-${m}`}
                                role="option"
                                aria-selected={minute === m}
                                onClick={() => { setMinute(m); scrollToValue(minuteRef, m); haptics.tick(); }}
                                className={`h-14 min-h-[${MIN_TOUCH_TARGET}px] flex items-center justify-center text-3xl font-medium cursor-pointer transition-all scroll-snap-align-center ${minute === m
                                    ? 'text-day-accent dark:text-night-accent scale-110'
                                    : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                style={{ scrollSnapAlign: 'center' }}
                            >
                                {String(m).padStart(2, '0')}
                            </div>
                        ))}
                        <div className="h-[calc(50%-28px)]" aria-hidden="true" />
                    </div>
                </div>

                {/* AM/PM drum */}
                <div className="relative" role="listbox" aria-label="AM or PM">
                    <div
                        ref={periodRef}
                        className="h-44 w-16 overflow-y-auto scroll-snap-y scroll-snap-mandatory hide-scrollbar overscroll-contain"
                        onScroll={() => handleStringScroll(periodRef, setPeriod, PERIODS)}
                        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
                        tabIndex={0}
                        aria-activedescendant={`period-${period}`}
                    >
                        <div className="h-[calc(50%-28px)]" aria-hidden="true" />
                        {PERIODS.map((p) => (
                            <div
                                key={p}
                                id={`period-${p}`}
                                role="option"
                                aria-selected={period === p}
                                onClick={() => { setPeriod(p); scrollToValue(periodRef, p === 'AM' ? 0 : 1); haptics.tick(); }}
                                className={`h-14 min-h-[${MIN_TOUCH_TARGET}px] flex items-center justify-center text-2xl font-medium cursor-pointer transition-all scroll-snap-align-center ${period === p
                                    ? 'text-day-accent dark:text-night-accent scale-110'
                                    : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                style={{ scrollSnapAlign: 'center' }}
                            >
                                {p}
                            </div>
                        ))}
                        <div className="h-[calc(50%-28px)]" aria-hidden="true" />
                    </div>
                </div>
            </div>

            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-3" aria-hidden="true">Scroll or tap to select time</p>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
            `}</style>
        </div>
    );
};
