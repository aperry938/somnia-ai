import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Alarm, AlarmPurpose } from '../../types';
import { DailyBriefingWidget } from '../widgets/DailyBriefingWidget';
import { toggleAlarmPreview, stopAlarmPreview, isPreviewPlaying as _isPreviewPlaying } from '../../services/audioService';
import { isPremium } from '../../services/secureSubscriptionService';
import haptics from '../../services/hapticsService';

// Helper to format alarm repetition text
const formatRepeatText = (days: number[]): string => {
    if (!days || days.length === 0) return 'Ring once';
    if (days.length === 7) return 'Every day';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (days.length === 5 && days.every((d, i) => d === i + 1)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return days.map(d => dayNames[d]).join(', ');
};

// Helper to get alarm sound display name
const getSoundName = (soundId: string | undefined): string => {
    const soundMap: Record<string, string> = {
        'somnia': 'Somnia',
        'classic': 'Classic',
        'prism': 'Prism',
        'aether': 'Aether',
        'cyber-dawn': 'Cyber-Dawn',
        'solar-ascent': 'Solar Ascent'
    };
    return soundMap[soundId || 'somnia'] || 'Somnia';
};

// Memoized component for a single alarm item - fully clickable with dynamic styling
const AlarmItem: React.FC<{ alarm: Alarm; onEdit: (alarm: Alarm) => void }> = React.memo(({ alarm, onEdit }) => {
    const { toggleAlarmActive, deleteAlarm } = useAppContext();
    const id = `toggle-${alarm.id}`;
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPress = React.useRef(false);

    // Format time in 12h format
    const [hourStr, minuteStr] = alarm.time.split(':');
    const hour = parseInt(hourStr ?? '0', 10);
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayTime = `${String(displayHour).padStart(2, '0')}:${minuteStr ?? '00'}`;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        toggleAlarmActive(alarm.id);
    };

    // Long press handlers
    const handleTouchStart = () => {
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            haptics.medium();
            setShowDeleteConfirm(true);
        }, 500); // 500ms for long press
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleClick = () => {
        if (!isLongPress.current && !showDeleteConfirm) {
            onEdit(alarm);
        }
    };

    const handleDelete = () => {
        haptics.warning();
        deleteAlarm(alarm.id);
        setShowDeleteConfirm(false);
    };

    return (
        <>
            <div
                onClick={handleClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                onContextMenu={(e) => { e.preventDefault(); haptics.medium(); setShowDeleteConfirm(true); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(alarm); } }}
                aria-label={`Alarm at ${displayTime} ${period}${alarm.label ? `, ${alarm.label}` : ''}, ${formatRepeatText(alarm.days)}, ${alarm.isActive ? 'enabled' : 'disabled'}. Long press to delete.`}
                className={`group relative bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border shadow-lg rounded-2xl p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between h-32 hover:shadow-xl hover:scale-[1.02] hover:border-day-accent dark:hover:border-night-accent active:scale-[0.98] ${alarm.isActive
                    ? 'ring-2 ring-day-accent/30 dark:ring-night-accent/30'
                    : 'opacity-80 hover:opacity-100'
                    }`}
            >
                {/* Active indicator glow */}
                {alarm.isActive && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-day-accent/5 to-purple-500/5 dark:from-night-accent/10 dark:to-purple-500/10 pointer-events-none" />
                )}

                <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-baseline gap-2">
                        <p className={`text-4xl font-light transition-colors ${alarm.isActive ? 'text-day-text dark:text-night-text' : 'text-gray-400'}`}>
                            {displayTime}
                        </p>
                        <span className={`text-sm font-medium ${alarm.isActive ? 'text-day-accent dark:text-night-accent' : 'text-gray-400'}`}>
                            {period}
                        </span>
                    </div>
                    <div
                        className="relative inline-block w-11 align-middle select-none"
                        onClick={handleToggle}
                        role="switch"
                        aria-checked={alarm.isActive}
                        aria-label={`${alarm.isActive ? 'Disable' : 'Enable'} alarm`}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(e as unknown as React.MouseEvent); } }}
                    >
                        <input
                            type="checkbox"
                            id={id}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                            checked={alarm.isActive}
                            readOnly
                            aria-hidden="true"
                            tabIndex={-1}
                        />
                        <label htmlFor={id} className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer transition-colors" aria-hidden="true"></label>
                    </div>
                </div>
                <div className="flex items-end justify-between relative z-10 mt-auto">
                    <div className="flex flex-col gap-0.5 min-h-[3.5rem]">
                        {/* Label for reminders */}
                        {alarm.label && (
                            <p className={`text-sm font-medium ${alarm.isActive ? 'text-day-text dark:text-night-text' : 'text-gray-400'}`}>
                                {alarm.label}
                            </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm ${alarm.isActive ? 'text-day-text-secondary dark:text-night-text-secondary' : 'text-gray-400'}`}>
                                {formatRepeatText(alarm.days)}
                            </p>
                            {/* Type badge */}
                            <span className={`text-xs px-1.5 py-0.5 rounded ${alarm.purpose === 'reminder'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                }`}>
                                {alarm.purpose === 'reminder' ? 'Reminder' : 'Sleep'}
                            </span>
                        </div>
                        {/* Sound name display */}
                        <div className={`flex items-center gap-1 text-xs ${alarm.isActive ? 'text-day-accent/70 dark:text-night-accent/70' : 'text-gray-400'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                            <span>{getSoundName(alarm.soundId)}</span>
                        </div>
                    </div>
                    {/* Edit hint on hover */}
                    <div className="text-xs text-day-text-secondary dark:text-night-text-secondary opacity-0 group-hover:opacity-100 transition-opacity self-end">
                        Tap to edit
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Popup */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-xs animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-serif text-lg text-center mb-2">Delete Alarm?</h3>
                        <p className="text-sm text-center text-day-text-secondary dark:text-night-text-secondary mb-4">
                            {displayTime} {period}{alarm.label ? ` - ${alarm.label}` : ''}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 min-h-[48px] bg-gray-200 dark:bg-gray-700 rounded-xl font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-3 min-h-[48px] bg-red-500 text-white rounded-xl font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});


// Mobile-optimized Drum/Scroll Time Picker
const DrumTimePicker: React.FC<{ initialTime: string; onChange: (time: string) => void }> = ({ initialTime, onChange }) => {
    const [hour, setHour] = useState(() => {
        const h = parseInt(initialTime.split(':')[0] ?? '0', 10);
        return h === 0 ? 12 : h > 12 ? h - 12 : h;
    });
    const [minute, setMinute] = useState(() => parseInt(initialTime.split(':')[1] ?? '0', 10));
    const [period, setPeriod] = useState(() => parseInt(initialTime.split(':')[0] ?? '0', 10) >= 12 ? 'PM' : 'AM');

    const hourRef = React.useRef<HTMLDivElement>(null);
    const minuteRef = React.useRef<HTMLDivElement>(null);
    const periodRef = React.useRef<HTMLDivElement>(null);

    const ITEM_HEIGHT = 56; // Height of each item in pixels

    useEffect(() => {
        const finalHour = period === 'PM' && hour !== 12 ? hour + 12 : period === 'AM' && hour === 12 ? 0 : hour;
        const timeString = `${String(finalHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        onChange(timeString);
    }, [hour, minute, period, onChange]);

    // Scroll to selected values on mount - use requestAnimationFrame for reliable timing
    useEffect(() => {
        const scrollToInitialValues = () => {
            if (hourRef.current) {
                hourRef.current.scrollTop = (hour - 1) * ITEM_HEIGHT;
            }
            if (minuteRef.current) {
                minuteRef.current.scrollTop = minute * ITEM_HEIGHT;
            }
            if (periodRef.current) {
                periodRef.current.scrollTop = period === 'AM' ? 0 : ITEM_HEIGHT;
            }
        };

        // Use double requestAnimationFrame to ensure layout is complete
        // First RAF waits for next frame, second RAF ensures paint is done
        let rafId: number;
        rafId = requestAnimationFrame(() => {
            rafId = requestAnimationFrame(scrollToInitialValues);
        });

        return () => cancelAnimationFrame(rafId);
    }, [hour, minute, period]);

    // Scroll handler for number-based time picker wheels (hours, minutes)
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

    // Scroll handler for string-based time picker wheels (AM/PM)
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

    const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    const periods = ['AM', 'PM'];

    const scrollToValue = (ref: React.RefObject<HTMLDivElement | null>, index: number) => {
        if (ref.current) {
            ref.current.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' });
        }
    };

    return (
        <div className="flex flex-col items-center">
            {/* Large time display */}
            <div className="text-5xl font-light mb-4 text-day-text dark:text-night-text">
                {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} <span className="text-3xl">{period}</span>
            </div>

            {/* Drum picker container */}
            <div className="relative flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4">
                {/* Selection highlight bar */}
                <div className="absolute left-4 right-4 h-14 bg-day-accent/20 dark:bg-night-accent/20 rounded-xl pointer-events-none border-2 border-day-accent/40 dark:border-night-accent/40" style={{ top: '50%', transform: 'translateY(-50%)' }} />

                {/* Hour drum */}
                <div className="relative">
                    <div
                        ref={hourRef}
                        className="h-44 w-20 overflow-y-auto scroll-snap-y scroll-snap-mandatory hide-scrollbar"
                        onScroll={() => handleNumberScroll(hourRef, setHour, hours)}
                        style={{ scrollSnapType: 'y mandatory' }}
                    >
                        <div className="h-[calc(50%-28px)]" /> {/* Top padding */}
                        {hours.map((h) => (
                            <div
                                key={h}
                                onClick={() => { setHour(h); scrollToValue(hourRef, h - 1); }}
                                className={`h-14 flex items-center justify-center text-3xl font-medium cursor-pointer transition-all scroll-snap-align-center ${hour === h
                                    ? 'text-day-accent dark:text-night-accent scale-110'
                                    : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                style={{ scrollSnapAlign: 'center' }}
                            >
                                {String(h).padStart(2, '0')}
                            </div>
                        ))}
                        <div className="h-[calc(50%-28px)]" /> {/* Bottom padding */}
                    </div>
                </div>

                <span className="text-4xl font-light text-day-text dark:text-night-text">:</span>

                {/* Minute drum */}
                <div className="relative">
                    <div
                        ref={minuteRef}
                        className="h-44 w-20 overflow-y-auto scroll-snap-y scroll-snap-mandatory hide-scrollbar"
                        onScroll={() => handleNumberScroll(minuteRef, setMinute, minutes)}
                        style={{ scrollSnapType: 'y mandatory' }}
                    >
                        <div className="h-[calc(50%-28px)]" />
                        {minutes.map((m) => (
                            <div
                                key={m}
                                onClick={() => { setMinute(m); scrollToValue(minuteRef, m); }}
                                className={`h-14 flex items-center justify-center text-3xl font-medium cursor-pointer transition-all scroll-snap-align-center ${minute === m
                                    ? 'text-day-accent dark:text-night-accent scale-110'
                                    : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                style={{ scrollSnapAlign: 'center' }}
                            >
                                {String(m).padStart(2, '0')}
                            </div>
                        ))}
                        <div className="h-[calc(50%-28px)]" />
                    </div>
                </div>

                {/* AM/PM drum */}
                <div className="relative">
                    <div
                        ref={periodRef}
                        className="h-44 w-16 overflow-y-auto scroll-snap-y scroll-snap-mandatory hide-scrollbar"
                        onScroll={() => handleStringScroll(periodRef, setPeriod, periods)}
                        style={{ scrollSnapType: 'y mandatory' }}
                    >
                        <div className="h-[calc(50%-28px)]" />
                        {periods.map((p) => (
                            <div
                                key={p}
                                onClick={() => { setPeriod(p); scrollToValue(periodRef, p === 'AM' ? 0 : 1); }}
                                className={`h-14 flex items-center justify-center text-2xl font-medium cursor-pointer transition-all scroll-snap-align-center ${period === p
                                    ? 'text-day-accent dark:text-night-accent scale-110'
                                    : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                style={{ scrollSnapAlign: 'center' }}
                            >
                                {p}
                            </div>
                        ))}
                        <div className="h-[calc(50%-28px)]" />
                    </div>
                </div>
            </div>

            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-3">Scroll or tap to select time</p>

            {/* CSS for hiding scrollbar but keeping functionality */}
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

// Alarm sound options
const ALARM_SOUNDS = [
    { id: 'classic', name: 'Classic', description: 'Traditional alarm beeps' },
    { id: 'aether', name: 'Aether', description: 'Cinematic sunrise drone' },
    { id: 'somnia', name: 'Somnia', description: 'Very slow crescendo tone' },
    { id: 'prism', name: 'Prism', description: 'Ethereal glass chimes' },
    { id: 'cyber-dawn', name: 'Cyber-Dawn', description: 'FM synthesis bird chorus', isPremium: true },
    { id: 'solar-ascent', name: 'Solar Ascent', description: 'Harmonic sunrise bloom', isPremium: true },
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helper to get current time in HH:MM format
const getCurrentTimeString = (): string => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

// AlarmModal component
const AlarmModal: React.FC<{ alarmToEdit: Alarm | null; onClose: () => void; onSaveSuccess?: () => void; onConfigureSleepGateway?: (alarmId: number) => void }> = ({ alarmToEdit, onClose, onSaveSuccess, onConfigureSleepGateway }) => {
    const { addAlarm, updateAlarm, deleteAlarm, startSleepSession } = useAppContext();
    // Use current time for new alarms, existing time for edits
    const [time, setTime] = useState(alarmToEdit?.time || getCurrentTimeString());
    const [selectedSound, setSelectedSound] = useState(alarmToEdit?.soundId || 'somnia');
    const [showSmartWakeInfo, setShowSmartWakeInfo] = useState(false);
    const [savedAlarmId, setSavedAlarmId] = useState<number | null>(null);
    const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);

    // Alarm purpose - sleep alarms trigger dream flow, reminder alarms just dismiss
    const [purpose, setPurpose] = useState<AlarmPurpose>(alarmToEdit?.purpose || 'sleep');
    const [label, setLabel] = useState(alarmToEdit?.label || '');

    // Repetition state
    const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly'>(() => {
        const days = alarmToEdit?.days ?? [];
        if (days.length === 0) return 'once';
        if (days.length === 7) return 'daily';
        return 'weekly';
    });
    const [selectedDays, setSelectedDays] = useState<number[]>(alarmToEdit?.days ?? []);

    // Update selected days based on frequency change
    useEffect(() => {
        if (frequency === 'daily') {
            setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
        } else if (frequency === 'once') {
            setSelectedDays([]);
        }
        // If switching to weekly, keep existing selection or default to M-F if empty
        else if (frequency === 'weekly' && selectedDays.length === 0) {
            setSelectedDays([1, 2, 3, 4, 5]);
        }
    }, [frequency]);

    const toggleDay = (dayIndex: number) => {
        if (frequency !== 'weekly') setFrequency('weekly');

        setSelectedDays(prev => {
            if (prev.includes(dayIndex)) {
                return prev.filter(d => d !== dayIndex);
            } else {
                return [...prev, dayIndex].sort();
            }
        });
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                stopAlarmPreview();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Cleanup preview on unmount
    useEffect(() => {
        return () => stopAlarmPreview();
    }, []);

    const handleSave = () => {
        stopAlarmPreview();

        // Finalize days based on frequency
        let finalDays = selectedDays;
        if (frequency === 'once') finalDays = [];
        if (frequency === 'daily') finalDays = [0, 1, 2, 3, 4, 5, 6];

        let alarmId: number;
        if (alarmToEdit) {
            updateAlarm(alarmToEdit.id, time, false, finalDays, selectedSound, purpose, label || undefined);
            alarmId = alarmToEdit.id;
        } else {
            alarmId = addAlarm(time, false, finalDays, selectedSound, purpose, label || undefined);
        }

        if (onSaveSuccess) onSaveSuccess();

        // Show confirmation - only offer Sleep Gateway for sleep alarms
        setSavedAlarmId(alarmId);
        setShowSavedConfirmation(true);
    };

    const handleConfigureSleepGateway = () => {
        if (savedAlarmId) {
            startSleepSession(savedAlarmId);
            if (onConfigureSleepGateway) {
                onConfigureSleepGateway(savedAlarmId);
            }
        }
        onClose();
    };

    const handleDismissConfirmation = () => {
        setShowSavedConfirmation(false);
        onClose();
    };

    const handleDelete = () => {
        stopAlarmPreview();
        if (alarmToEdit) deleteAlarm(alarmToEdit.id);
        onClose();
    };

    // Show saved confirmation - only offer Sleep Gateway for sleep alarms
    if (showSavedConfirmation) {
        return (
            <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={handleDismissConfirmation} role="dialog" aria-modal="true" aria-labelledby="alarm-saved-title">
                <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-sm animate-fadeIn text-center" onClick={(e) => e.stopPropagation()}>
                    {/* Success checkmark */}
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 id="alarm-saved-title" className="font-serif text-2xl mb-2">{purpose === 'sleep' ? 'Alarm Saved!' : 'Reminder Set!'}</h2>
                    <p className="text-day-text-secondary dark:text-night-text-secondary mb-6">
                        {label && <span className="block font-medium mb-1">{label}</span>}
                        Your {purpose === 'sleep' ? 'alarm' : 'reminder'} is set for <span className="font-medium text-day-accent dark:text-night-accent">{time}</span>
                    </p>

                    {/* Sleep Gateway link - only for sleep alarms */}
                    {purpose === 'sleep' && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <h3 className="font-medium text-sm">Configure Sleep Gateway?</h3>
                                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Log pre-sleep activities to track with this alarm</p>
                                </div>
                            </div>
                            <button
                                onClick={handleConfigureSleepGateway}
                                className="w-full py-3 min-h-[48px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center"
                            >
                                Open Sleep Gateway
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleDismissConfirmation}
                        className={`${purpose === 'sleep' ? 'min-h-[44px] px-4 py-2 text-day-text-secondary dark:text-night-text-secondary hover:text-day-text dark:hover:text-night-text' : 'w-full py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-medium rounded-xl flex items-center justify-center'} transition-colors`}
                    >
                        {purpose === 'sleep' ? 'Skip for now' : 'Done'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={() => { stopAlarmPreview(); onClose(); }} role="dialog" aria-modal="true" aria-labelledby="alarm-modal-title">
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-sm animate-fadeIn max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 id="alarm-modal-title" className="font-serif text-2xl text-center mb-6">{alarmToEdit ? "Edit Alarm" : "Set Alarm"}</h2>
                <DrumTimePicker initialTime={time} onChange={setTime} />

                {/* Alarm Purpose Selector */}
                <div className="mt-6 mb-4">
                    <label className="text-sm font-medium block mb-2">Alarm Type</label>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1" role="group" aria-label="Alarm type options">
                        <button
                            onClick={() => setPurpose('sleep')}
                            aria-pressed={purpose === 'sleep'}
                            className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 min-h-[44px] rounded-md transition-all ${purpose === 'sleep'
                                ? 'bg-white dark:bg-gray-700 shadow-sm font-medium text-day-accent dark:text-night-accent'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                            Sleep
                        </button>
                        <button
                            onClick={() => setPurpose('reminder')}
                            aria-pressed={purpose === 'reminder'}
                            className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 min-h-[44px] rounded-md transition-all ${purpose === 'reminder'
                                ? 'bg-white dark:bg-gray-700 shadow-sm font-medium text-day-accent dark:text-night-accent'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            Reminder
                        </button>
                    </div>
                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-2">
                        {purpose === 'sleep' ? 'Opens dream journal when alarm rings' : 'Simple notification - no dream prompts'}
                    </p>
                </div>

                {/* Label for reminders */}
                {purpose === 'reminder' && (
                    <div className="mb-4">
                        <label className="text-sm font-medium block mb-2">Label (optional)</label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="e.g., Take medication, Meeting..."
                            className="w-full p-3 min-h-[48px] text-base bg-gray-100 dark:bg-gray-800 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
                        />
                    </div>
                )}

                {/* Repetition Frequency */}
                <div className="mt-6 mb-4">
                    <label className="text-sm font-medium block mb-2">Repeat</label>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-3" role="group" aria-label="Repeat frequency options">
                        {(['once', 'daily', 'weekly'] as const).map((freq) => (
                            <button
                                key={freq}
                                onClick={() => setFrequency(freq)}
                                aria-pressed={frequency === freq}
                                className={`flex-1 text-sm py-2 min-h-[44px] rounded-md capitalize transition-all flex items-center justify-center ${frequency === freq
                                    ? 'bg-white dark:bg-gray-700 shadow-sm font-medium text-day-accent dark:text-night-accent'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {freq}
                            </button>
                        ))}
                    </div>

                    {/* Weekly Day Selector */}
                    {frequency === 'weekly' && (
                        <div className="flex justify-between gap-1 mt-2" role="group" aria-label="Select days of week">
                            {DAYS.map((day, index) => (
                                <button
                                    key={index}
                                    onClick={() => toggleDay(index)}
                                    aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]}
                                    aria-pressed={selectedDays.includes(index)}
                                    className={`w-10 h-10 min-w-[44px] min-h-[44px] rounded-full text-xs font-medium transition-all flex items-center justify-center ${selectedDays.includes(index)
                                        ? 'bg-day-accent text-white dark:bg-night-accent'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Alarm Sound Selector */}
                <div className="mt-6">
                    <label className="text-sm font-medium block mb-2">Alarm Sound <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">(tap to preview)</span></label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {ALARM_SOUNDS.map(sound => {
                            const showProBadge = (sound as { isPremium?: boolean }).isPremium && !isPremium();
                            return (
                                <button
                                    key={sound.id}
                                    onClick={() => {
                                        // Only allow selection if user is premium or sound is not premium
                                        if (!showProBadge) {
                                            setSelectedSound(sound.id);
                                        }
                                        // Preview is allowed for all users (demo purposes)
                                        toggleAlarmPreview(sound.id);
                                    }}
                                    className={`p-4 rounded-xl text-center transition-all relative ${selectedSound === sound.id
                                        ? 'bg-day-accent/20 dark:bg-night-accent/20 border-2 border-day-accent dark:border-night-accent'
                                        : 'bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border hover:border-day-accent/50'
                                        } ${showProBadge ? 'opacity-75' : ''}`}
                                >
                                    {showProBadge && (
                                        <span className="absolute top-1 right-1 text-[9px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            PRO
                                        </span>
                                    )}
                                    <span className="text-sm font-medium block">{sound.name}</span>
                                    <span className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-1 block">{sound.description}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Smart Wake - Coming Soon */}
                <div className="mt-4 px-2 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Smart Wake</span>
                            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">Coming Soon</span>
                        </div>
                        <button
                            onClick={() => setShowSmartWakeInfo(!showSmartWakeInfo)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    </div>
                    {showSmartWakeInfo && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Smart Wake will use health app data to wake you during light sleep phases within a 30-minute window before your alarm. Requires Apple Health or Google Fit connection.
                        </p>
                    )}
                </div>

                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={onClose} aria-label="Cancel" className="py-3 px-6 min-h-[48px] bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">Cancel</button>
                    <button onClick={handleSave} aria-label="Save alarm" className="py-3 px-6 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-bold rounded-full flex items-center justify-center">Save</button>
                </div>
                {alarmToEdit && <button onClick={handleDelete} aria-label="Delete alarm" className="w-full mt-4 py-3 min-h-[48px] text-red-500">Delete Alarm</button>}
            </div>
        </div>
    );
};

// Tonight's Sleep Quick Card - helps recurring alarm users log pre-sleep data
const TonightsSleepCard: React.FC<{
    nextSleepAlarm: Alarm | null;
    onOpenFullGateway: () => void;
}> = ({ nextSleepAlarm, onOpenFullGateway }) => {
    const { activeSleepSession, startSleepSession, updateSleepSessionData } = useAppContext();
    const [isExpanded, setIsExpanded] = useState(false);
    const [dayRating, setDayRating] = useState<number | null>(activeSleepSession?.sleepGatewayData?.dayRating ?? null);
    const [dayNotes, setDayNotes] = useState(activeSleepSession?.sleepGatewayData?.dayNotes ?? '');
    const [saved, setSaved] = useState(false);

    // Check if it's evening time (after 6 PM) or within 6 hours of alarm
    const shouldShow = useMemo(() => {
        if (!nextSleepAlarm || nextSleepAlarm.purpose === 'reminder') return false;

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Parse alarm time
        const [alarmH, alarmM] = nextSleepAlarm.time.split(':').map(Number);
        const alarmMinutes = (alarmH ?? 0) * 60 + (alarmM ?? 0);

        // Calculate time until alarm (could be today or tomorrow)
        let minutesUntilAlarm: number;
        if (alarmMinutes > currentMinutes) {
            minutesUntilAlarm = alarmMinutes - currentMinutes;
        } else {
            minutesUntilAlarm = (24 * 60 - currentMinutes) + alarmMinutes;
        }

        // Show if: it's evening (6 PM - 11:59 PM) OR within 8 hours of alarm
        const isEvening = currentHour >= 18;
        const isWithin8Hours = minutesUntilAlarm <= 8 * 60;

        return isEvening || isWithin8Hours;
    }, [nextSleepAlarm]);

    // Sync state with active session when it changes
    useEffect(() => {
        if (activeSleepSession?.sleepGatewayData) {
            setDayRating(activeSleepSession.sleepGatewayData.dayRating ?? null);
            setDayNotes(activeSleepSession.sleepGatewayData.dayNotes ?? '');
        }
    }, [activeSleepSession]);

    // Don't show if there's already an active session (user already completed Sleep Gateway)
    // This card is only for users who skipped the gateway and need to log pre-sleep data
    if (activeSleepSession) return null;
    if (!shouldShow || !nextSleepAlarm) return null;

    // Format alarm time for display
    const [hourStr, minuteStr] = nextSleepAlarm.time.split(':');
    const hour = parseInt(hourStr ?? '0', 10);
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    const alarmTimeDisplay = `${displayHour}:${minuteStr ?? '00'} ${period}`;

    const handleExpand = () => {
        haptics.light();
        // Navigate to full Sleep Gateway instead of expanding inline
        if (!activeSleepSession) {
            startSleepSession(nextSleepAlarm.id);
        }
        onOpenFullGateway();
    };

    const handleRatingSelect = (rating: number) => {
        haptics.medium();
        setDayRating(rating);
        setSaved(false);
        // Immediately save to session
        updateSleepSessionData({ dayRating: rating });
    };

    const handleSaveNotes = () => {
        haptics.success();
        updateSleepSessionData({ dayNotes: dayNotes.trim() || undefined });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleOpenFullGateway = () => {
        haptics.medium();
        // Save any current data first
        if (dayRating !== null || dayNotes.trim()) {
            updateSleepSessionData({
                dayRating: dayRating ?? undefined,
                dayNotes: dayNotes.trim() || undefined
            });
        }
        onOpenFullGateway();
    };

    // Quick rating icons - moon phases for a sleep theme
    const ratingLabels = ['Rough', 'Meh', 'Okay', 'Good', 'Great'];

    return (
        <div className="mb-6 w-full max-w-2xl mx-auto">
            <div
                className={`bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-200 dark:border-indigo-700/50 rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-lg' : 'shadow-md hover:shadow-lg'}`}
            >
                {/* Header - always visible */}
                <div
                    className={`px-4 py-3 flex items-center justify-between ${!isExpanded ? 'cursor-pointer' : ''}`}
                    onClick={!isExpanded ? handleExpand : undefined}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800/60 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-medium text-sm text-day-text dark:text-night-text">Tonight's Sleep</h3>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                Alarm at {alarmTimeDisplay}
                            </p>
                        </div>
                    </div>
                    {!isExpanded ? (
                        <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400">
                            <span className="text-xs">Log your day</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsExpanded(false)}
                            aria-label="Collapse tonight's sleep card"
                            className="text-day-text-secondary dark:text-night-text-secondary p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                    <div className="px-4 pb-4 animate-fadeIn">
                        {/* Day Rating */}
                        <div className="mb-4">
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mb-2">How was your day?</p>
                            <div className="flex justify-between gap-2">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                        key={rating}
                                        onClick={() => handleRatingSelect(rating)}
                                        className={`flex-1 py-2 px-1 rounded-lg flex flex-col items-center gap-1 transition-all ${dayRating === rating
                                            ? 'bg-indigo-500 dark:bg-indigo-600 text-white scale-105 shadow-md'
                                            : 'bg-white/50 dark:bg-gray-800/50 text-day-text-secondary dark:text-night-text-secondary hover:bg-white dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <span className="w-6 h-6">
                                            {rating === 1 ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            ) : rating === 2 ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            ) : rating === 3 ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h8M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            ) : rating === 4 ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                                            )}
                                        </span>
                                        <span className="text-[10px]">{ratingLabels[rating - 1]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Notes */}
                        <div className="mb-3">
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mb-2">Quick notes (optional)</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={dayNotes}
                                    onChange={(e) => { setDayNotes(e.target.value); setSaved(false); }}
                                    onBlur={handleSaveNotes}
                                    placeholder="Stressful meeting, exercised, late coffee..."
                                    className="flex-1 px-3 py-2 min-h-[48px] text-base bg-white/70 dark:bg-gray-800/70 border border-indigo-200 dark:border-indigo-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                                {saved && (
                                    <div className="flex items-center text-green-500 text-xs">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Active session indicator */}
                        {activeSleepSession && dayRating && (
                            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 mb-3">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span>Session linked to your {alarmTimeDisplay} alarm</span>
                            </div>
                        )}

                        {/* More options link */}
                        <button
                            onClick={handleOpenFullGateway}
                            className="w-full py-3 min-h-[48px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all text-sm flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Full Sleep Gateway
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export const AlarmsPage: React.FC<{ timeString: string, dateString: string, onNavigateToSleep?: () => void }> = ({ timeString, dateString, onNavigateToSleep }) => {
    const { alarms, getNextActiveAlarm } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [alarmToEdit, setAlarmToEdit] = useState<Alarm | null>(null);

    // Get the next active sleep alarm for the Tonight's Sleep card
    const nextSleepAlarm = useMemo(() => {
        const next = getNextActiveAlarm();
        // Only return if it's a sleep alarm
        return next && next.purpose !== 'reminder' ? next : null;
    }, [getNextActiveAlarm]);

    const openModal = (alarm: Alarm | null = null) => {
        setAlarmToEdit(alarm);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        stopAlarmPreview(); // Stop any playing preview when modal closes
        setIsModalOpen(false);
        setAlarmToEdit(null);
    };

    const handleConfigureSleepGateway = () => {
        if (onNavigateToSleep) {
            onNavigateToSleep();
        }
    };

    return (
        <>
            <div className="flex flex-col h-full">
                <header className="text-center mb-6 pt-16">
                    <h1 className="font-serif text-6xl md:text-8xl font-bold tracking-tight">{timeString}</h1>
                    <p className="text-md mt-2 tracking-wide">{dateString}</p>
                    <div className="mt-10">
                        <DailyBriefingWidget />
                    </div>
                </header>

                {/* Tonight's Sleep Quick Card - appears for recurring alarm users in evening */}
                <TonightsSleepCard
                    nextSleepAlarm={nextSleepAlarm}
                    onOpenFullGateway={handleConfigureSleepGateway}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                    {alarms.length > 0 ? (
                        alarms.map(alarm => <AlarmItem key={alarm.id} alarm={alarm} onEdit={openModal} />)
                    ) : (
                        <p className="text-center text-day-text-secondary dark:text-night-text-secondary md:col-span-2">No alarms set.</p>
                    )}
                </div>
            </div>
            <button onClick={() => openModal()} aria-label="Add new alarm" className="fixed bottom-24 right-6 bg-day-accent dark:bg-night-accent text-white rounded-full p-4 shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </button>
            {isModalOpen && <AlarmModal alarmToEdit={alarmToEdit} onClose={closeModal} onConfigureSleepGateway={handleConfigureSleepGateway} />}
            {/* Styles for toggle switch */}
            <style>{`
                .toggle-checkbox {
                    left: 2px;
                    top: 0;
                    transition: transform 0.2s ease-in-out;
                }
                .toggle-checkbox:checked {
                    transform: translateX(1.25rem);
                    border-color: #6366F1;
                }
                .dark .toggle-checkbox:checked {
                    border-color: #818CF8;
                }
                .toggle-checkbox:checked + .toggle-label {
                    background-color: #6366F1;
                }
                .dark .toggle-checkbox:checked + .toggle-label {
                    background-color: #818CF8;
                }
            `}</style>
        </>
    );
};