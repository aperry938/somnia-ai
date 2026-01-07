import React, { useState, useEffect } from 'react';
import { GUIDED_RELAXATIONS, SLEEP_CHECKLIST_ITEMS, SOUNDSCAPES } from '../../constants';
import { GuidedRelaxation, Soundscape, SleepAids } from '../../types';
import { AICoachModal } from '../modals/AICoachModal';
import { SoundscapeModal } from '../modals/SoundscapeModal';
import { GuidedRelaxationModal } from '../modals/GuidedRelaxationModal';
import { HardwareSyncModal } from '../modals/HardwareSyncModal';
import { TechniqueInfoModal } from '../modals/TechniqueInfoModal';
import { RealityCheckInfoModal } from '../modals/RealityCheckInfoModal';
import { useAppContext } from '../../contexts/AppContext';
import { setLiveVolume, stopSleepSound } from '../../services/audioService';
import { REALITY_CHECKS, LUCID_TECHNIQUES, LucidDreamTechnique } from '../../constants/lucidDreaming';
import { predictSleepQuality, SleepPrediction } from '../../services/sleepPredictionService';
import { useWakeWindow } from '../../hooks/useWakeWindow';
import { WakeWindowViz } from '../WakeWindowViz';
import { PremiumBadge } from '../shared/PremiumBadge';
import { isPremium } from '../../services/secureSubscriptionService';
import { SleepDetectionSettingsCard } from '../settings/SleepDetectionSettingsCard';
import haptics from '../../services/hapticsService';
import { sanitizeText, INPUT_LIMITS } from '../../services/validationService';

const DAY_RATING_LABELS = ['Terrible', 'Poor', 'Okay', 'Good', 'Great'];

const DayRating: React.FC<{ rating: number | null; onRate: (rating: number) => void; }> = ({ rating, onRate }) => {
    return (
        <div className="flex justify-center gap-2" role="group" aria-label="Rate your day">
            {[1, 2, 3, 4, 5].map(value => (
                <button
                    key={value}
                    onClick={() => onRate(value)}
                    aria-label={`Rate day ${value} out of 5 - ${DAY_RATING_LABELS[value - 1]}`}
                    aria-pressed={rating === value}
                    className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border transition-colors flex items-center justify-center ${rating === value ? 'bg-day-accent text-white border-day-accent' : 'bg-transparent border-day-border dark:border-night-border'}`}
                >
                    {value}
                </button>
            ))}
        </div>
    );
};



export const SleepPage: React.FC<{ onNavigateToAlarms?: () => void }> = ({ onNavigateToAlarms }) => {
    const [activeModal, setActiveModal] = useState<'coach' | 'soundscape' | 'relaxation' | 'sync' | null>(null);
    const [selectedSound, setSelectedSound] = useState<Soundscape | null>(null);
    const [selectedRelaxation, setSelectedRelaxation] = useState<GuidedRelaxation | null>(null);
    const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
    const [soundStartTime, setSoundStartTime] = useState<number | null>(null);
    const [totalSoundDuration, setTotalSoundDuration] = useState<number>(0);
    const [isSleeping, setIsSleeping] = useState(false);
    const [dayRating, setDayRating] = useState<number | null>(null);
    const [dayNotes, setDayNotes] = useState('');
    const [prediction, setPrediction] = useState<SleepPrediction | null>(null);
    const [selectedTechnique, setSelectedTechnique] = useState<LucidDreamTechnique | null>(null);
    const [showRealityCheckModal, setShowRealityCheckModal] = useState(false);
    const [lucidExpanded, setLucidExpanded] = useState(false);

    // Wake Window Hook
    const { isSupported: motionSupported, movementLog, requestPermission } = useWakeWindow(isSleeping);

    const { setActiveSleepAid, activeSleepAids, setPendingSleepData, dreams, volume, activeSleepSession, updateSleepSessionData, startSleepSession, getNextActiveAlarm, alarms } = useAppContext();

    // Check if user has an active alarm set
    const nextAlarm = getNextActiveAlarm();
    const hasActiveAlarm = alarms.some(a => a.isActive);

    // Initialize session data from existing session if present
    useEffect(() => {
        if (activeSleepSession) {
            if (activeSleepSession.sleepGatewayData.dayRating !== undefined) {
                setDayRating(activeSleepSession.sleepGatewayData.dayRating);
            }
            if (activeSleepSession.sleepGatewayData.dayNotes !== undefined) {
                setDayNotes(activeSleepSession.sleepGatewayData.dayNotes || '');
            }
        }
    }, []);

    // Update session data whenever dayRating or dayNotes change
    useEffect(() => {
        if (activeSleepSession) {
            updateSleepSessionData({ dayRating, dayNotes });
        }
    }, [dayRating, dayNotes, activeSleepSession, updateSleepSessionData]);

    // Update prediction when dayRating or activeSleepAids change
    useEffect(() => {
        const currentContext: SleepAids = {
            ...activeSleepAids,
            dayRating,
            dayNotes
        };
        const result = predictSleepQuality(currentContext, dreams);
        setPrediction(result);
    }, [dayRating, dayNotes, activeSleepAids, dreams]);

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

        // Compile sleep data
        const sleepData: SleepAids = {
            ...activeSleepAids,
            dayRating,
            dayNotes,
            checklist: checklistItems,
            soundDuration: finalDuration > 0 ? finalDuration : undefined,
            volume: volume
        };

        // If no active session, start one now (for users who skipped the alarm link)
        if (!activeSleepSession) {
            startSleepSession();
        }

        // Update session with final data
        updateSleepSessionData(sleepData);

        // Also set pending data for backwards compatibility
        setPendingSleepData(sleepData);

        setIsSleeping(true);
    };

    // Format alarm time for display
    const formatAlarmTime = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const period = h >= 12 ? 'PM' : 'AM';
        return `${hour}:${String(m).padStart(2, '0')} ${period}`;
    };

    return (
        <>
            {/* Header with Sync Wearable Button */}
            <div className="relative max-w-2xl mx-auto mb-8">
                <h1 className="font-serif page-title text-4xl text-center">Sleep Gateway</h1>
                <button
                    onClick={() => setActiveModal('sync')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-400/30 rounded-full text-sm text-indigo-300 transition-all"
                    title="Sync Wearable (Coming Soon)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Sync Wearable</span>
                </button>
            </div>

            {/* No Alarm Set Banner */}
            {!hasActiveAlarm && !isSleeping && (
                <div className="max-w-2xl mx-auto mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-grow">
                            <h3 className="font-medium text-amber-800 dark:text-amber-200">Set an Alarm First</h3>
                            <p className="text-sm text-amber-700 dark:text-amber-300/80">Your sleep data will be linked to your alarm for better tracking</p>
                        </div>
                        <button
                            onClick={onNavigateToAlarms}
                            aria-label="Set an alarm"
                            className="px-4 py-2 min-h-[44px] bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors flex-shrink-0 flex items-center"
                        >
                            Set Alarm
                        </button>
                    </div>
                </div>
            )}

            {/* Active Session Info Banner */}
            {activeSleepSession && !isSleeping && (
                <div className="max-w-2xl mx-auto mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800/50 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        </div>
                        <div className="flex-grow">
                            <h3 className="font-medium text-indigo-800 dark:text-indigo-200">Sleep Session Active</h3>
                            <p className="text-sm text-indigo-700 dark:text-indigo-300/80">
                                {activeSleepSession.alarmTime
                                    ? `Linked to alarm at ${formatAlarmTime(activeSleepSession.alarmTime)}`
                                    : 'Your sleep data will be saved with your next dream log'}
                            </p>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                    </div>
                </div>
            )}

            {isSleeping ? (
                <div className="max-w-2xl mx-auto space-y-8 bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border rounded-xl text-center p-8 animate-fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-day-accent dark:text-night-accent mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                    <h2 className="font-serif text-2xl text-day-accent dark:text-night-accent">Sweet Dreams</h2>
                    <p className="mt-2 text-day-text-secondary dark:text-night-text-secondary">Your sleep settings are logged. Rest well.</p>

                    {/* Wake Window Viz */}
                    {motionSupported && (
                        <WakeWindowViz events={movementLog} />
                    )}

                    <button onClick={() => setIsSleeping(false)} aria-label="Go back to sleep settings" className="mt-4 py-3 px-6 min-h-[48px] bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">Back</button>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto space-y-8">
                    <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl cursor-pointer hover:shadow-xl transition-shadow focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent" onClick={openCoach} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCoach(); } }} aria-label="Open AI Sleep Coach">
                        <div className="flex items-center gap-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
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
                                <label htmlFor="day-notes" className="block text-center text-day-text-secondary dark:text-night-text-secondary mb-3">Any thoughts or notable events?</label>
                                <textarea
                                    id="day-notes"
                                    value={dayNotes}
                                    onChange={(e) => setDayNotes(sanitizeText(e.target.value).slice(0, INPUT_LIMITS.notes))}
                                    rows={2}
                                    maxLength={INPUT_LIMITS.notes}
                                    aria-label="Evening reflection notes"
                                    className="w-full p-3 min-h-[48px] text-base bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md custom-scrollbar"
                                    placeholder="e.g., A stressful meeting at work..."
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-center gap-4 my-6">
                            <h2 className="font-serif text-2xl text-center">Soundscapes</h2>
                            {isPremium() && (
                                <button
                                    onClick={() => {
                                        haptics.light();
                                        const randomIndex = Math.floor(Math.random() * SOUNDSCAPES.length);
                                        openSoundscapeModal(SOUNDSCAPES[randomIndex]);
                                    }}
                                    className="px-4 py-2 min-h-[44px] text-sm bg-day-accent/10 dark:bg-night-accent/10 text-day-accent dark:text-night-accent rounded-full hover:bg-day-accent/20 dark:hover:bg-night-accent/20 transition-colors flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Surprise Me
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {SOUNDSCAPES.map(sound => {
                                const showProBadge = sound.isPremium && !isPremium();
                                const cardClasses = `sound-card bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border p-4 rounded-xl text-center cursor-pointer transition-all hover:border-day-accent dark:hover:border-night-accent h-[120px] flex flex-col justify-center relative ${playingSoundId === sound.id ? 'border-day-accent dark:border-night-accent shadow-lg' : 'border-day-border dark:border-night-border'}`;

                                if (showProBadge) {
                                    return (
                                        <PremiumBadge key={sound.id} feature="binaural_beats" className="h-[120px] w-full" hideBadge>
                                            <div className={`${cardClasses} text-gray-400 h-full`}>
                                                {/* PRO badge inside card */}
                                                <span className="absolute top-2 right-2 text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                    PRO
                                                </span>
                                                <div className="flex justify-center items-center h-12 w-12 mx-auto">{sound.icon}</div>
                                                <p className="mt-2 font-medium text-gray-500">{sound.name}</p>
                                            </div>
                                        </PremiumBadge>
                                    );
                                }

                                return (
                                    <div key={sound.id} onClick={() => openSoundscapeModal(sound)} className={`${cardClasses} text-day-accent dark:text-night-accent`}>
                                        <div className="flex justify-center items-center h-12 w-12 mx-auto">{sound.icon}</div>
                                        <p className="mt-2 font-medium text-day-text-primary dark:text-night-text-primary">{sound.name}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <h2 className="font-serif text-2xl text-center my-8">Guided Relaxation</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {GUIDED_RELAXATIONS.map(item => (
                                <div key={item.id} onClick={() => openRelaxationModal(item)} className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-xl cursor-pointer transition-all hover:border-day-accent dark:hover:border-night-accent">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="text-day-accent dark:text-night-accent w-12 h-12 flex items-center justify-center">{item.icon}</div>
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

                    {/* Sleep Quality Prediction */}
                    {prediction && (
                        <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 p-4 rounded-xl mb-4 animate-fadeIn">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl text-indigo-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </span>
                                <div>
                                    <h3 className="font-serif font-bold text-lg text-indigo-300">Sleep Forecast</h3>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-sm opacity-80">Predicted Quality:</span>
                                        <div className="flex text-yellow-400 gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${i < prediction.predictedQuality ? 'fill-current' : 'text-gray-400/30 fill-current'}`} viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-sm mt-2 italic opacity-90">"{prediction.recommendation}"</p>
                                    {prediction.factors.length > 0 && (
                                        <ul className="mt-2 text-xs opacity-70 space-y-1 list-disc pl-4">
                                            {prediction.factors.map((f, i) => <li key={i}>{f}</li>)}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sleep Detection Settings */}
                    <SleepDetectionSettingsCard />

                    {/* Lucid Dreaming - Collapsible Card */}
                    <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4 mt-4">
                        <button
                            onClick={() => setLucidExpanded(!lucidExpanded)}
                            aria-expanded={lucidExpanded}
                            className="w-full flex items-center justify-between min-h-[56px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-day-accent dark:focus:ring-night-accent rounded-lg"
                        >
                            <div>
                                <h3 className="font-serif text-lg text-left">Lucid Dreaming</h3>
                                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary text-left">
                                    Reality checks & induction techniques
                                </p>
                            </div>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-5 w-5 text-day-text-secondary dark:text-night-text-secondary transition-transform ${lucidExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {lucidExpanded && (
                            <div className="mt-4 space-y-3 animate-fadeIn">
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Tonight's Reality Check</h4>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowRealityCheckModal(true); } }}
                                        className="p-3 min-h-[56px] bg-day-accent/10 dark:bg-night-accent/10 rounded-lg cursor-pointer hover:bg-day-accent/20 dark:hover:bg-night-accent/20 transition-colors focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
                                        onClick={() => setShowRealityCheckModal(true)}
                                    >
                                        <p className="font-medium text-day-accent dark:text-night-accent text-sm">{REALITY_CHECKS[new Date().getDay()].check}</p>
                                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-1">{REALITY_CHECKS[new Date().getDay()].description}</p>
                                        <p className="text-xs text-day-accent/70 dark:text-night-accent/70 mt-2">Tap for all reality checks →</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Induction Techniques</h4>
                                    <div className="space-y-2">
                                        {LUCID_TECHNIQUES.slice(0, 2).map(t => (
                                            <div
                                                key={t.id}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTechnique(t); } }}
                                                className="p-3 min-h-[56px] bg-white/50 dark:bg-black/20 rounded-lg cursor-pointer hover:bg-white/70 dark:hover:bg-black/30 transition-colors focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
                                                onClick={() => setSelectedTechnique(t)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className="font-medium text-sm">{t.name}</span>
                                                    <span className="text-xs px-2 py-0.5 bg-day-accent/20 dark:bg-night-accent/20 text-day-accent dark:text-night-accent rounded-full">{t.difficulty}</span>
                                                </div>
                                                <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-1">{t.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 pb-8">
                        <button
                            onClick={handleBeginSleep}
                            className="w-full py-4 min-h-[56px] bg-day-accent dark:bg-night-accent text-white font-bold rounded-full text-lg shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-500 transition-all transform hover:scale-105 flex items-center justify-center"
                        >
                            Initiate Sleep Gateway
                        </button>
                    </div>
                </div >
            )}
            {activeModal === 'coach' && <AICoachModal onClose={closeModal} />}
            {
                activeModal === 'soundscape' && selectedSound && (
                    <SoundscapeModal
                        sound={selectedSound}
                        onClose={closeModal}
                        onPlay={handlePlaySound}
                        onStop={handleStopSound}
                        isPlaying={playingSoundId === selectedSound.id}
                    />
                )
            }
            {
                activeModal === 'relaxation' && selectedRelaxation && (
                    <GuidedRelaxationModal
                        relaxation={selectedRelaxation}
                        onClose={closeModal}
                    />
                )
            }
            {activeModal === 'sync' && <HardwareSyncModal onClose={closeModal} />}
            <TechniqueInfoModal
                technique={selectedTechnique}
                onClose={() => setSelectedTechnique(null)}
            />
            <RealityCheckInfoModal
                isOpen={showRealityCheckModal}
                onClose={() => setShowRealityCheckModal(false)}
            />
        </>
    );
};