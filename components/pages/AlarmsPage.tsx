import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Alarm } from '../../types';
import { DailyBriefingWidget } from '../widgets/DailyBriefingWidget';
import { toggleAlarmPreview, stopAlarmPreview, isPreviewPlaying } from '../../services/audioService';

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
        'progressive': 'Progressive',
        'gentle': 'Gentle Rise',
        'chimes': 'Chimes',
        'nature': 'Nature',
        'classic': 'Classic'
    };
    return soundMap[soundId || 'somnia'] || 'Somnia';
};

// Memoized component for a single alarm item - fully clickable with dynamic styling
const AlarmItem: React.FC<{ alarm: Alarm; onEdit: (alarm: Alarm) => void }> = React.memo(({ alarm, onEdit }) => {
    const { toggleAlarmActive } = useAppContext();
    const id = `toggle-${alarm.id}`;

    // Format time in 12h format
    const [hourStr, minuteStr] = alarm.time.split(':');
    const hour = parseInt(hourStr, 10);
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayTime = `${String(displayHour).padStart(2, '0')}:${minuteStr}`;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        toggleAlarmActive(alarm.id);
    };

    return (
        <div
            onClick={() => onEdit(alarm)}
            className={`group relative bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border shadow-lg rounded-2xl p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between h-32 hover:shadow-xl hover:scale-[1.02] hover:border-day-accent dark:hover:border-night-accent active:scale-[0.98] ${alarm.isActive
                ? 'ring-2 ring-day-accent/30 dark:ring-night-accent/30'
                : 'opacity-60 hover:opacity-100'
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
                >
                    <input
                        type="checkbox"
                        id={id}
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        checked={alarm.isActive}
                        readOnly
                    />
                    <label htmlFor={id} className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer transition-colors"></label>
                </div>
            </div>
            <div className="flex items-center justify-between relative z-10">
                <div className="flex flex-col gap-0.5">
                    <p className={`text-sm ${alarm.isActive ? 'text-day-text-secondary dark:text-night-text-secondary' : 'text-gray-400'}`}>
                        {formatRepeatText(alarm.days)}
                    </p>
                    {/* Sound name display */}
                    <div className={`flex items-center gap-1 text-xs ${alarm.isActive ? 'text-day-accent/70 dark:text-night-accent/70' : 'text-gray-400'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        <span>{getSoundName(alarm.soundId)}</span>
                    </div>
                </div>
                {/* Edit hint on hover */}
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    Tap to edit
                </div>
            </div>
        </div>
    );
});

// Mobile-optimized Drum/Scroll Time Picker
const DrumTimePicker: React.FC<{ initialTime: string; onChange: (time: string) => void }> = ({ initialTime, onChange }) => {
    const [hour, setHour] = useState(() => {
        const h = parseInt(initialTime.split(':')[0], 10);
        return h === 0 ? 12 : h > 12 ? h - 12 : h;
    });
    const [minute, setMinute] = useState(() => parseInt(initialTime.split(':')[1], 10));
    const [period, setPeriod] = useState(() => parseInt(initialTime.split(':')[0], 10) >= 12 ? 'PM' : 'AM');

    const hourRef = React.useRef<HTMLDivElement>(null);
    const minuteRef = React.useRef<HTMLDivElement>(null);
    const periodRef = React.useRef<HTMLDivElement>(null);

    const ITEM_HEIGHT = 56; // Height of each item in pixels

    useEffect(() => {
        const finalHour = period === 'PM' && hour !== 12 ? hour + 12 : period === 'AM' && hour === 12 ? 0 : hour;
        const timeString = `${String(finalHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        onChange(timeString);
    }, [hour, minute, period, onChange]);

    // Scroll to selected values on mount
    useEffect(() => {
        if (hourRef.current) {
            hourRef.current.scrollTop = (hour - 1) * ITEM_HEIGHT;
        }
        if (minuteRef.current) {
            minuteRef.current.scrollTop = minute * ITEM_HEIGHT;
        }
        if (periodRef.current) {
            periodRef.current.scrollTop = period === 'AM' ? 0 : ITEM_HEIGHT;
        }
    }, []);

    const handleScroll = (ref: React.RefObject<HTMLDivElement>, setter: (val: any) => void, values: any[]) => {
        if (!ref.current) return;
        const scrollTop = ref.current.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
        setter(values[clampedIndex]);
    };

    const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    const periods = ['AM', 'PM'];

    const scrollToValue = (ref: React.RefObject<HTMLDivElement>, index: number) => {
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
                        onScroll={() => handleScroll(hourRef, setHour, hours)}
                        style={{ scrollSnapType: 'y mandatory' }}
                    >
                        <div className="h-[calc(50%-28px)]" /> {/* Top padding */}
                        {hours.map((h) => (
                            <div
                                key={h}
                                onClick={() => { setHour(h); scrollToValue(hourRef, h - 1); }}
                                className={`h-14 flex items-center justify-center text-3xl font-medium cursor-pointer transition-all scroll-snap-align-center ${
                                    hour === h
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
                        onScroll={() => handleScroll(minuteRef, setMinute, minutes)}
                        style={{ scrollSnapType: 'y mandatory' }}
                    >
                        <div className="h-[calc(50%-28px)]" />
                        {minutes.map((m) => (
                            <div
                                key={m}
                                onClick={() => { setMinute(m); scrollToValue(minuteRef, m); }}
                                className={`h-14 flex items-center justify-center text-3xl font-medium cursor-pointer transition-all scroll-snap-align-center ${
                                    minute === m
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
                        onScroll={() => handleScroll(periodRef, setPeriod, periods)}
                        style={{ scrollSnapType: 'y mandatory' }}
                    >
                        <div className="h-[calc(50%-28px)]" />
                        {periods.map((p) => (
                            <div
                                key={p}
                                onClick={() => { setPeriod(p); scrollToValue(periodRef, p === 'AM' ? 0 : 1); }}
                                className={`h-14 flex items-center justify-center text-2xl font-medium cursor-pointer transition-all scroll-snap-align-center ${
                                    period === p
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
    { id: 'somnia', name: 'Somnia', description: 'Very slow & growing - our signature alarm (Default)' },
    { id: 'progressive', name: 'Progressive Dream', description: 'Gently builds volume & pitch' },
    { id: 'gentle', name: 'Gentle Rise', description: 'Soft, gradual wake-up' },
    { id: 'chimes', name: 'Wind Chimes', description: 'Peaceful chime melody' },
    { id: 'nature', name: 'Nature Dawn', description: 'Birds and morning sounds' },
    { id: 'classic', name: 'Classic Alarm', description: 'Traditional alarm tone' },
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
            updateAlarm(alarmToEdit.id, time, false, finalDays, selectedSound);
            alarmId = alarmToEdit.id;
        } else {
            alarmId = addAlarm(time, false, finalDays, selectedSound);
        }

        if (onSaveSuccess) onSaveSuccess();

        // Show confirmation with Sleep Gateway option
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

    // Show saved confirmation with Sleep Gateway option
    if (showSavedConfirmation) {
        return (
            <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={handleDismissConfirmation}>
                <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-sm animate-fadeIn text-center" onClick={(e) => e.stopPropagation()}>
                    {/* Success checkmark */}
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="font-serif text-2xl mb-2">Alarm Saved!</h2>
                    <p className="text-day-text-secondary dark:text-night-text-secondary mb-6">
                        Your alarm is set for <span className="font-medium text-day-accent dark:text-night-accent">{time}</span>
                    </p>

                    {/* Sleep Gateway link */}
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
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all"
                        >
                            Open Sleep Gateway
                        </button>
                    </div>

                    <button
                        onClick={handleDismissConfirmation}
                        className="text-day-text-secondary dark:text-night-text-secondary hover:text-day-text dark:hover:text-night-text transition-colors"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={() => { stopAlarmPreview(); onClose(); }}>
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-sm animate-fadeIn max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="font-serif text-2xl text-center mb-6">{alarmToEdit ? "Edit Alarm" : "Set Alarm"}</h2>
                <DrumTimePicker initialTime={time} onChange={setTime} />

                {/* Repetition Frequency */}
                <div className="mt-6 mb-4">
                    <label className="text-sm font-medium block mb-2">Repeat</label>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-3">
                        {(['once', 'daily', 'weekly'] as const).map((freq) => (
                            <button
                                key={freq}
                                onClick={() => setFrequency(freq)}
                                className={`flex-1 text-sm py-1.5 rounded-md capitalize transition-all ${frequency === freq
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
                        <div className="flex justify-between gap-1 mt-2">
                            {DAYS.map((day, index) => (
                                <button
                                    key={index}
                                    onClick={() => toggleDay(index)}
                                    className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${selectedDays.includes(index)
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
                        {ALARM_SOUNDS.map(sound => (
                            <button
                                key={sound.id}
                                onClick={() => {
                                    setSelectedSound(sound.id);
                                    toggleAlarmPreview(sound.id);
                                }}
                                className={`p-4 rounded-xl text-center transition-all ${selectedSound === sound.id
                                    ? 'bg-day-accent/20 dark:bg-night-accent/20 border-2 border-day-accent dark:border-night-accent'
                                    : 'bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border hover:border-day-accent/50'
                                    }`}
                            >
                                <span className="text-sm font-medium block">{sound.name} {sound.id === 'somnia' && '⭐'}</span>
                                <span className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-1 block">{sound.description}</span>
                            </button>
                        ))}
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
                            Smart Wake will use wearable data to wake you during light sleep phases within a 30-minute window before your alarm. Requires wearable sync integration.
                        </p>
                    )}
                </div>

                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={onClose} className="py-2 px-6 bg-gray-200 dark:bg-gray-700 rounded-full">Cancel</button>
                    <button onClick={handleSave} className="py-2 px-6 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full">Save</button>
                </div>
                {alarmToEdit && <button onClick={handleDelete} className="w-full mt-4 py-2 text-red-500">Delete Alarm</button>}
            </div>
        </div>
    );
};


export const AlarmsPage: React.FC<{ timeString: string, dateString: string, onNavigateToSleep?: () => void }> = ({ timeString, dateString, onNavigateToSleep }) => {
    const { alarms } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [alarmToEdit, setAlarmToEdit] = useState<Alarm | null>(null);

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
                <header className="text-center mb-8 pt-8">
                    <h1 className="font-serif text-6xl md:text-8xl font-bold tracking-tight">{timeString}</h1>
                    <p className="text-md mt-2 tracking-wide">{dateString}</p>
                    <div className="mt-6">
                        <DailyBriefingWidget />
                    </div>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                    {alarms.length > 0 ? (
                        alarms.map(alarm => <AlarmItem key={alarm.id} alarm={alarm} onEdit={openModal} />)
                    ) : (
                        <p className="text-center text-day-text-secondary dark:text-night-text-secondary md:col-span-2">No alarms set.</p>
                    )}
                </div>
            </div>
            <button onClick={() => openModal()} className="fixed bottom-24 right-6 bg-day-accent dark:bg-night-accent text-white rounded-full p-4 shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </button>
            {isModalOpen && <AlarmModal alarmToEdit={alarmToEdit} onClose={closeModal} onConfigureSleepGateway={handleConfigureSleepGateway} />}
            {/* Styles for toggle switch */}
            <style>{`.toggle-checkbox:checked + .toggle-label { background-color: #6366F1; } .dark .toggle-checkbox:checked + .toggle-label { background-color: #818CF8; } .toggle-checkbox:checked { transform: translateX(1.25rem); border-color: #6366F1; } .dark .toggle-checkbox:checked { border-color: #818CF8; } .toggle-checkbox { transition: transform 0.2s ease-in-out; }`}</style>
        </>
    );
};