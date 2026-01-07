import React, { useState, useEffect } from 'react';
import { SleepQualityRating } from '../shared/SleepQualityRating';
import { SleepAids } from '../../types';
import haptics from '../../services/hapticsService';
import { sanitizeText, INPUT_LIMITS } from '../../services/validationService';

interface AddSleepEntryModalProps {
    onSave: (date: string, sleepQuality: number | null, notes?: string, sleepAids?: SleepAids) => number;
    onSaveWithDream: (entryId: number) => void;
    onClose: () => void;
}

export const AddSleepEntryModal: React.FC<AddSleepEntryModalProps> = ({
    onSave,
    onSaveWithDream,
    onClose
}) => {
    // Handle Escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);
    const [sleepDate, setSleepDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [sleepQuality, setSleepQuality] = useState<number | null>(null);
    const [notes, setNotes] = useState('');
    const [dayRating, setDayRating] = useState<number | null>(null);

    const handleSave = (addDream: boolean) => {
        haptics.success();
        const sleepAids: SleepAids | undefined = dayRating ? { dayRating } : undefined;
        const entryId = onSave(sleepDate, sleepQuality, notes.trim() || undefined, sleepAids);

        if (addDream && entryId > 0) {
            onSaveWithDream(entryId);
        } else {
            onClose();
        }
    };

    const dayLabels = ['Rough', 'Meh', 'Okay', 'Good', 'Great'];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="log-sleep-title">
            <div
                className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-lg animate-fadeIn max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="log-sleep-title" className="font-serif text-2xl text-center mb-4">Log Sleep</h2>

                {/* Date Picker */}
                <div className="mb-4">
                    <label className="block text-sm text-day-text-secondary dark:text-night-text-secondary mb-2">
                        When did you sleep?
                    </label>
                    <input
                        type="date"
                        value={sleepDate}
                        onChange={(e) => setSleepDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        aria-label="Sleep date"
                        className="w-full p-3 min-h-[48px] text-base bg-white/50 dark:bg-black/30 border border-day-border dark:border-night-border rounded-lg focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent focus:outline-none"
                    />
                </div>

                {/* Sleep Quality */}
                <div className="mb-4">
                    <p className="text-center text-day-text-secondary dark:text-night-text-secondary mb-2">
                        How was your sleep?
                    </p>
                    <SleepQualityRating rating={sleepQuality} onRate={setSleepQuality} />
                </div>

                {/* Day Rating (How was your day before sleep) */}
                <div className="mb-4">
                    <p className="text-center text-day-text-secondary dark:text-night-text-secondary mb-2">
                        How was your day? (optional)
                    </p>
                    <div className="flex justify-center gap-2" role="group" aria-label="Rate your day">
                        {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                                key={rating}
                                onClick={() => { haptics.selection(); setDayRating(dayRating === rating ? null : rating); }}
                                aria-label={`Rate day ${rating} out of 5 - ${dayLabels[rating - 1]}`}
                                aria-pressed={dayRating === rating}
                                className={`flex-1 py-2 px-1 min-h-[56px] rounded-lg flex flex-col items-center justify-center gap-1 transition-all max-w-[60px] ${dayRating === rating
                                        ? 'bg-day-accent dark:bg-night-accent text-white scale-105'
                                        : 'bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border'
                                    }`}
                            >
                                <span className="text-lg" aria-hidden="true">
                                    {rating === 1 ? '😓' : rating === 2 ? '😐' : rating === 3 ? '🙂' : rating === 4 ? '😊' : '🌟'}
                                </span>
                                <span className="text-[10px]">{dayLabels[rating - 1]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                    <label className="block text-sm text-day-text-secondary dark:text-night-text-secondary mb-2">
                        Notes (optional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(sanitizeText(e.target.value).slice(0, INPUT_LIMITS.notes))}
                        maxLength={INPUT_LIMITS.notes}
                        placeholder="Late coffee, stressful day, exercised..."
                        aria-label="Sleep notes"
                        className="w-full h-20 p-3 text-base bg-white/50 dark:bg-black/30 border border-day-border dark:border-night-border rounded-lg focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent focus:outline-none resize-none"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => handleSave(true)}
                        className="w-full py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-bold rounded-full transition-all flex items-center justify-center"
                    >
                        Save & Add Dream
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        className="w-full py-3 min-h-[48px] bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full transition-all flex items-center justify-center"
                    >
                        Save (No Dreams)
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 min-h-[44px] text-day-text-secondary dark:text-night-text-secondary hover:text-day-text dark:hover:text-night-text transition-colors text-sm flex items-center justify-center"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
