import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Alarm } from '../../types';
import { DailyBriefingWidget } from '../widgets/DailyBriefingWidget';
import { playAlarmPreview, stopAlarmPreview } from '../../services/audioService';

// Helper to format alarm repetition text
const formatRepeatText = (days: number[]): string => {
    if (!days || days.length === 0) return 'Ring once';
    if (days.length === 7) return 'Every day';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (days.length === 5 && days.every((d, i) => d === i + 1)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return days.map(d => dayNames[d]).join(', ');
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
                <p className={`text-sm ${alarm.isActive ? 'text-day-text-secondary dark:text-night-text-secondary' : 'text-gray-400'}`}>
                    {formatRepeatText(alarm.days)}
                </p>
                {/* Sound indicator */}
                <div className="flex items-center gap-1 text-xs text-day-text-secondary dark:text-night-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <span>Tap to edit</span>
                </div>
            </div>
        </div>
    );
});

// Custom Analog Clock Picker with clock arms and manual input
const AnalogClock: React.FC<{ initialTime: string; onChange: (time: string) => void }> = ({ initialTime, onChange }) => {
    const [hour, setHour] = useState(() => parseInt(initialTime.split(':')[0], 10));
    const [minute, setMinute] = useState(() => parseInt(initialTime.split(':')[1], 10));
    const [period, setPeriod] = useState(() => hour >= 12 ? 'PM' : 'AM');
    const [selecting, setSelecting] = useState<'hour' | 'minute'>('hour');
    const [editingHour, setEditingHour] = useState(false);
    const [editingMinute, setEditingMinute] = useState(false);

    useEffect(() => {
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const finalHour = period === 'PM' && displayHour !== 12 ? displayHour + 12 : period === 'AM' && displayHour === 12 ? 0 : displayHour;
        const timeString = `${String(finalHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        onChange(timeString);
    }, [hour, minute, period, onChange]);

    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

    const handleHourSelect = (h: number) => {
        setHour(h);
        setSelecting('minute');
    };

    const handleMinuteSelect = (m: number) => {
        setMinute(m);
    };

    // Calculate clock hand angles
    // With bottom:50% positioning, hands naturally point UP (12 o'clock), so no offset needed
    const hourAngle = (displayHour % 12) * 30 + (minute / 60) * 30; // 30 degrees per hour + minute offset
    const minuteAngle = minute * 6; // 6 degrees per minute

    const handleManualHourChange = (value: string) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 1 && num <= 12) {
            const h = period === 'PM' && num !== 12 ? num + 12 : period === 'AM' && num === 12 ? 0 : num;
            setHour(h);
        }
    };

    const handleManualMinuteChange = (value: string) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 0 && num <= 59) {
            setMinute(num);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div className="flex items-end gap-2 mb-6">
                {/* Hour - click to edit */}
                {editingHour ? (
                    <input
                        type="number"
                        min="1" max="12"
                        className="text-6xl font-light w-24 text-center bg-transparent border-b-2 border-day-accent dark:border-night-accent focus:outline-none"
                        defaultValue={displayHour}
                        autoFocus
                        onBlur={(e) => { handleManualHourChange(e.target.value); setEditingHour(false); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { handleManualHourChange((e.target as HTMLInputElement).value); setEditingHour(false); } }}
                    />
                ) : (
                    <span
                        onClick={() => { setSelecting('hour'); setEditingHour(true); }}
                        className={`text-6xl font-light cursor-pointer ${selecting === 'hour' ? 'text-day-accent dark:text-night-accent' : ''}`}
                    >
                        {String(displayHour).padStart(2, '0')}
                    </span>
                )}
                <span className="text-6xl font-light pb-1">:</span>
                {/* Minute - click to edit for exact input */}
                {editingMinute ? (
                    <input
                        type="number"
                        min="0" max="59"
                        className="text-6xl font-light w-24 text-center bg-transparent border-b-2 border-day-accent dark:border-night-accent focus:outline-none"
                        defaultValue={minute}
                        autoFocus
                        onBlur={(e) => { handleManualMinuteChange(e.target.value); setEditingMinute(false); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { handleManualMinuteChange((e.target as HTMLInputElement).value); setEditingMinute(false); } }}
                    />
                ) : (
                    <span
                        onClick={() => { setSelecting('minute'); setEditingMinute(true); }}
                        className={`text-6xl font-light cursor-pointer ${selecting === 'minute' ? 'text-day-accent dark:text-night-accent' : ''}`}
                    >
                        {String(minute).padStart(2, '0')}
                    </span>
                )}
                <div className="flex flex-col text-lg font-medium ml-2">
                    <button onClick={() => setPeriod('AM')} className={`px-2 rounded ${period === 'AM' ? 'bg-day-accent/20 text-day-accent dark:bg-night-accent/20 dark:text-night-accent' : ''}`}>AM</button>
                    <button onClick={() => setPeriod('PM')} className={`px-2 rounded ${period === 'PM' ? 'bg-day-accent/20 text-day-accent dark:bg-night-accent/20 dark:text-night-accent' : ''}`}>PM</button>
                </div>
            </div>
            <div className="relative w-64 h-64">
                {/* Clock face circle */}
                <div className="absolute inset-0 rounded-full border-2 border-day-border dark:border-night-border"></div>

                {/* Hour hand - pointer-events disabled to not intercept clicks */}
                <div
                    className="absolute w-1.5 bg-day-text dark:bg-night-text rounded-full pointer-events-none"
                    style={{
                        height: '50px',
                        bottom: '50%',
                        left: '50%',
                        transformOrigin: 'bottom center',
                        transform: `translateX(-50%) rotate(${hourAngle}deg)`,
                    }}
                />
                {/* Minute hand - pointer-events disabled to not intercept clicks */}
                <div
                    className="absolute w-1 bg-day-accent dark:bg-night-accent rounded-full pointer-events-none"
                    style={{
                        height: '70px',
                        bottom: '50%',
                        left: '50%',
                        transformOrigin: 'bottom center',
                        transform: `translateX(-50%) rotate(${minuteAngle}deg)`,
                    }}
                />

                {/* Hour/minute numbers */}
                {selecting === 'hour' && Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                    <div key={h} style={{ transform: `rotate(${-90 + h * 30}deg) translate(90px) rotate(-${-90 + h * 30}deg)` }} className="absolute top-1/2 left-1/2 -m-4 w-8 h-8 z-10">
                        <button onClick={() => handleHourSelect(period === 'PM' && h !== 12 ? h + 12 : period === 'AM' && h === 12 ? 0 : h)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${displayHour === h ? 'bg-day-accent text-white dark:bg-night-accent' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{h}</button>
                    </div>
                ))}
                {selecting === 'minute' && Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                    <div key={m} style={{ transform: `rotate(${-90 + m * 6}deg) translate(90px) rotate(-${-90 + m * 6}deg)` }} className="absolute top-1/2 left-1/2 -m-4 w-8 h-8 z-10">
                        <button onClick={() => handleMinuteSelect(m)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${minute === m ? 'bg-day-accent text-white dark:bg-night-accent' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{String(m).padStart(2, '0')}</button>
                    </div>
                ))}

                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-day-accent dark:bg-night-accent rounded-full -m-1.5"></div>
            </div>
            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-2">Tap digits to edit or switch view</p>
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

// AlarmModal component
const AlarmModal: React.FC<{ alarmToEdit: Alarm | null; onClose: () => void; onSaveSuccess?: () => void }> = ({ alarmToEdit, onClose, onSaveSuccess }) => {
    const { addAlarm, updateAlarm, deleteAlarm } = useAppContext();
    const [time, setTime] = useState(alarmToEdit?.time || '07:00');
    const [selectedSound, setSelectedSound] = useState(alarmToEdit?.soundId || 'somnia');
    const [showSmartWakeInfo, setShowSmartWakeInfo] = useState(false);

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
        const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSave = () => {
        stopAlarmPreview();

        // Finalize days based on frequency
        let finalDays = selectedDays;
        if (frequency === 'once') finalDays = [];
        if (frequency === 'daily') finalDays = [0, 1, 2, 3, 4, 5, 6];

        if (alarmToEdit) {
            updateAlarm(alarmToEdit.id, time, false, finalDays, selectedSound);
        } else {
            addAlarm(time, false, finalDays, selectedSound);
        }

        if (onSaveSuccess) onSaveSuccess();
        onClose();
    };

    const handleDelete = () => {
        stopAlarmPreview();
        if (alarmToEdit) deleteAlarm(alarmToEdit.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-sm animate-fadeIn max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="font-serif text-2xl text-center mb-6">{alarmToEdit ? "Edit Alarm" : "Set Alarm"}</h2>
                <AnalogClock initialTime={time} onChange={setTime} />

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
                                    playAlarmPreview(sound.id);
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


export const AlarmsPage: React.FC<{ timeString: string, dateString: string }> = ({ timeString, dateString }) => {
    const { alarms } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [alarmToEdit, setAlarmToEdit] = useState<Alarm | null>(null);

    const openModal = (alarm: Alarm | null = null) => {
        setAlarmToEdit(alarm);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setAlarmToEdit(null);
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
            {isModalOpen && <AlarmModal alarmToEdit={alarmToEdit} onClose={closeModal} />}
            {/* Styles for toggle switch */}
            <style>{`.toggle-checkbox:checked + .toggle-label { background-color: #6366F1; } .dark .toggle-checkbox:checked + .toggle-label { background-color: #818CF8; } .toggle-checkbox:checked { transform: translateX(1.25rem); border-color: #6366F1; } .dark .toggle-checkbox:checked { border-color: #818CF8; } .toggle-checkbox { transition: transform 0.2s ease-in-out; }`}</style>
        </>
    );
};