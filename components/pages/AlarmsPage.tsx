import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Alarm } from '../../types';

// Memoized component for a single alarm item
const AlarmItem: React.FC<{ alarm: Alarm; onEdit: (alarm: Alarm) => void }> = React.memo(({ alarm, onEdit }) => {
    const { toggleAlarmActive } = useAppContext();
    const id = `toggle-${alarm.id}`;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border shadow-lg rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
                <div className="cursor-pointer" onClick={() => onEdit(alarm)}>
                    <p className="text-4xl font-light">{alarm.time}</p>
                </div>
                 <div className="relative inline-block w-11 mr-2 align-middle select-none">
                    <input type="checkbox" id={id} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" checked={alarm.isActive} onChange={() => toggleAlarmActive(alarm.id)}/>
                    <label htmlFor={id} className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer transition-colors"></label>
                </div>
            </div>
            <div className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                 <p>Ring once</p>
            </div>
        </div>
    );
});

// Custom Analog Clock Picker
const AnalogClock: React.FC<{ initialTime: string; onChange: (time: string) => void }> = ({ initialTime, onChange }) => {
    const [hour, setHour] = useState(() => parseInt(initialTime.split(':')[0], 10));
    const [minute, setMinute] = useState(() => parseInt(initialTime.split(':')[1], 10));
    const [period, setPeriod] = useState(() => hour >= 12 ? 'PM' : 'AM');
    const [selecting, setSelecting] = useState<'hour' | 'minute'>('hour');

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

    return (
        <div className="flex flex-col items-center">
            <div className="flex items-end gap-2 mb-6">
                <span onClick={() => setSelecting('hour')} className={`text-6xl font-light cursor-pointer ${selecting === 'hour' ? 'text-day-accent dark:text-night-accent' : ''}`}>{String(displayHour).padStart(2, '0')}</span>
                <span className="text-6xl font-light pb-1">:</span>
                <span onClick={() => setSelecting('minute')} className={`text-6xl font-light cursor-pointer ${selecting === 'minute' ? 'text-day-accent dark:text-night-accent' : ''}`}>{String(minute).padStart(2, '0')}</span>
                <div className="flex flex-col text-lg font-medium ml-2">
                    <button onClick={() => setPeriod('AM')} className={`px-2 rounded ${period === 'AM' ? 'bg-day-accent/20 text-day-accent dark:bg-night-accent/20 dark:text-night-accent' : ''}`}>AM</button>
                    <button onClick={() => setPeriod('PM')} className={`px-2 rounded ${period === 'PM' ? 'bg-day-accent/20 text-day-accent dark:bg-night-accent/20 dark:text-night-accent' : ''}`}>PM</button>
                </div>
            </div>
            <div className="relative w-64 h-64">
                {selecting === 'hour' && Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                    <div key={h} style={{ transform: `rotate(${h * 30}deg) translate(90px) rotate(-${h * 30}deg)` }} className="absolute top-1/2 left-1/2 -m-4 w-8 h-8">
                        <button onClick={() => handleHourSelect(period === 'PM' && h !== 12 ? h + 12 : period === 'AM' && h === 12 ? 0 : h)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${displayHour === h ? 'bg-day-accent text-white dark:bg-night-accent' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{h}</button>
                    </div>
                ))}
                {selecting === 'minute' && Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                     <div key={m} style={{ transform: `rotate(${m * 6}deg) translate(90px) rotate(-${m * 6}deg)` }} className="absolute top-1/2 left-1/2 -m-4 w-8 h-8">
                        <button onClick={() => handleMinuteSelect(m)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${minute === m ? 'bg-day-accent text-white dark:bg-night-accent' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{String(m).padStart(2,'0')}</button>
                    </div>
                ))}
                 <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-day-accent dark:bg-night-accent rounded-full -m-1"></div>
            </div>
        </div>
    );
};

// AlarmModal component
const AlarmModal: React.FC<{ alarmToEdit: Alarm | null; onClose: () => void }> = ({ alarmToEdit, onClose }) => {
    const { addAlarm, updateAlarm, deleteAlarm } = useAppContext();
    const [time, setTime] = useState(alarmToEdit?.time || '07:00');

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSave = () => {
        if (alarmToEdit) {
            updateAlarm(alarmToEdit.id, time);
        } else {
            addAlarm(time);
        }
        onClose();
    };
    
    const handleDelete = () => {
        if (alarmToEdit) deleteAlarm(alarmToEdit.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-sm animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                <h2 className="font-serif text-2xl text-center mb-6">{alarmToEdit ? "Edit Alarm" : "Set Alarm"}</h2>
                <AnalogClock initialTime={time} onChange={setTime} />
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