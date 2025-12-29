import React, { useState, useEffect } from 'react';
import { GUIDED_RELAXATIONS, SLEEP_CHECKLIST_ITEMS, SOUNDSCAPES } from '../../constants';
import { GuidedRelaxation, Soundscape, SleepAids } from '../../types';
import { AICoachModal } from '../modals/AICoachModal';
import { SoundscapeModal } from '../modals/SoundscapeModal';
import { GuidedRelaxationModal } from '../modals/GuidedRelaxationModal';
import { useAppContext } from '../../contexts/AppContext';
import { stopSleepSound } from '../../services/audioService';

const DayRating: React.FC<{ rating: number | null; onRate: (rating: number) => void; }> = ({ rating, onRate }) => {
    return (
        <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(value => (
                <button
                    key={value}
                    onClick={() => onRate(value)}
                    className={`w-10 h-10 rounded-full border transition-colors ${rating === value ? 'bg-day-accent text-white border-day-accent' : 'bg-transparent border-day-border dark:border-night-border'}`}
                >
                    {value}
                </button>
            ))}
        </div>
    );
};

export const SleepPage: React.FC = () => {
    const [activeModal, setActiveModal] = useState<'coach' | 'soundscape' | 'relaxation' | null>(null);
    const [selectedSound, setSelectedSound] = useState<Soundscape | null>(null);
    const [selectedRelaxation, setSelectedRelaxation] = useState<GuidedRelaxation | null>(null);
    const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
    const [soundStartTime, setSoundStartTime] = useState<number | null>(null);
    const [totalSoundDuration, setTotalSoundDuration] = useState<number>(0);
    const [isSleeping, setIsSleeping] = useState(false);
    const [dayRating, setDayRating] = useState<number | null>(null);
    const [dayNotes, setDayNotes] = useState('');

    const { setActiveSleepAid, activeSleepAids, setPendingSleepData } = useAppContext();

    useEffect(() => {
        // Stop any playing sounds when navigating away from the page.
        return () => {
            stopSleepSound();
        };
    }, []);

    const openCoach = () => setActiveModal('coach');

    const openSoundscapeModal = (sound: Soundscape) => {
        setSelectedSound(sound);
        setActiveModal('soundscape');
    };

    const openRelaxationModal = (relaxation: GuidedRelaxation) => {
        setSelectedRelaxation(relaxation);
        setActiveModal('relaxation');
        setActiveSleepAid('relaxation', relaxation.name);
    }

    const closeModal = () => {
        if (selectedRelaxation) {
            setActiveSleepAid('relaxation', null);
        }
        setActiveModal(null);
        setSelectedSound(null);
        setSelectedRelaxation(null);
    };

    const handlePlaySound = (soundId: string) => {
        setPlayingSoundId(soundId);
        setSoundStartTime(Date.now());
        const sound = SOUNDSCAPES.find(s => s.id === soundId);
        if (sound) {
            setActiveSleepAid('sound', sound.name);
        }
    }

    const handleStopSound = () => {
        // Calculate duration and add to total
        if (soundStartTime) {
            const durationMinutes = Math.round((Date.now() - soundStartTime) / 60000);
            setTotalSoundDuration(prev => prev + durationMinutes);
        }
        setPlayingSoundId(null);
        setSoundStartTime(null);
        setActiveSleepAid('sound', null);
    }

    const handleBeginSleep = () => {
        // Calculate final duration if sound is still playing
        let finalDuration = totalSoundDuration;
        if (soundStartTime && playingSoundId) {
            finalDuration += Math.round((Date.now() - soundStartTime) / 60000);
        }

        const checklistItems = Array.from(document.querySelectorAll('#sleep-checklist input:checked'))
            .map(cb => (cb as HTMLInputElement).dataset.key)
            .filter((key): key is string => key !== undefined);

        const sleepDataToLog: SleepAids = {
            ...activeSleepAids,
            soundDuration: finalDuration > 0 ? finalDuration : undefined,
            checklist: checklistItems,
            dayRating: dayRating,
            dayNotes: dayNotes.trim(),
        };

        setPendingSleepData(sleepDataToLog);
        setIsSleeping(true);
    };

    return (
        <>
            <h1 className="font-serif page-title text-4xl text-center mb-8">Sleep Gateway</h1>
            {isSleeping ? (
                <div className="max-w-2xl mx-auto space-y-8 bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border rounded-xl text-center p-8 animate-fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-day-accent dark:text-night-accent mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                    <h2 className="font-serif text-2xl text-day-accent dark:text-night-accent">Sweet Dreams</h2>
                    <p className="mt-2 text-day-text-secondary dark:text-night-text-secondary">Your sleep settings are logged. They will be included with your next dream entry.</p>
                    <button onClick={() => setIsSleeping(false)} className="mt-4 py-2 px-6 bg-gray-200 dark:bg-gray-700 rounded-full">Back</button>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto space-y-8">
                    <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl cursor-pointer hover:shadow-xl transition-shadow" onClick={openCoach}>
                        <div className="flex items-center gap-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                            <div>
                                <h2 className="font-serif text-xl font-bold">AI Sleep Coach</h2>
                                <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">Chat for personalized guidance and relaxation techniques.</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="font-serif text-2xl text-center my-6">Evening Reflection</h2>
                        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl space-y-4">
                            <div>
                                <label className="block text-center text-day-text-secondary dark:text-night-text-secondary mb-3">How was your day overall?</label>
                                <DayRating rating={dayRating} onRate={setDayRating} />
                            </div>
                            <div>
                                <label className="block text-center text-day-text-secondary dark:text-night-text-secondary mb-3">Any thoughts or notable events?</label>
                                <textarea
                                    value={dayNotes}
                                    onChange={(e) => setDayNotes(e.target.value)}
                                    rows={2}
                                    className="w-full p-2 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md custom-scrollbar"
                                    placeholder="e.g., A stressful meeting at work..."
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="font-serif text-2xl text-center my-6">Soundscapes</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {SOUNDSCAPES.map(sound => (
                                <div key={sound.id} onClick={() => openSoundscapeModal(sound)} className={`sound-card bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border  p-4 rounded-xl text-center cursor-pointer transition-all hover:border-day-accent dark:hover:border-night-accent ${playingSoundId === sound.id ? 'border-day-accent dark:border-night-accent shadow-lg' : 'border-day-border dark:border-night-border'}`}>
                                    <div className="flex justify-center items-center h-12 text-day-accent dark:text-night-accent w-12 mx-auto">{sound.icon}</div>
                                    <p className="mt-2 font-medium">{sound.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h2 className="font-serif text-2xl text-center my-8">Guided Relaxation</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {GUIDED_RELAXATIONS.map(item => (
                                <div key={item.id} onClick={() => openRelaxationModal(item)} className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-xl cursor-pointer transition-all hover:border-day-accent dark:hover:border-night-accent">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="text-day-accent dark:text-night-accent w-12 h-12">{item.icon}</div>
                                        <h3 className="font-serif text-lg mt-2">{item.name}</h3>
                                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-1">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h2 className="font-serif text-2xl text-center my-8">Sleep Preparation</h2>
                        <div id="sleep-checklist" className="space-y-3">
                            {SLEEP_CHECKLIST_ITEMS.map(item => (
                                <div key={item.key} className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-lg flex items-center">
                                    <input type="checkbox" id={`check-${item.key}`} data-key={item.key} className="h-5 w-5 rounded text-day-accent focus:ring-day-accent border-gray-300 bg-transparent" />
                                    <label htmlFor={`check-${item.key}`} className="ml-3 text-sm">{item.text}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4 pb-8">
                        <button
                            onClick={handleBeginSleep}
                            className="w-full py-4 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full text-lg shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-500 transition-all transform hover:scale-105"
                        >
                            Initiate Sleep Gateway
                        </button>
                    </div>
                </div>
            )}
            {activeModal === 'coach' && <AICoachModal onClose={closeModal} />}
            {activeModal === 'soundscape' && selectedSound && (
                <SoundscapeModal
                    sound={selectedSound}
                    onClose={closeModal}
                    onPlay={handlePlaySound}
                    onStop={handleStopSound}
                    isPlaying={playingSoundId === selectedSound.id}
                />
            )}
            {activeModal === 'relaxation' && selectedRelaxation && (
                <GuidedRelaxationModal
                    relaxation={selectedRelaxation}
                    onClose={closeModal}
                />
            )}
        </>
    );
};