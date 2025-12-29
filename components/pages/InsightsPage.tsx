import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { analyzeSleepHabits, synthesizeDreamThemes } from '../../services/geminiService';
import { exportDreamJournalToPDF, exportDreamsAsJSON } from '../../services/exportService';
import { Biometrics, DreamSynthesis, SleepHabitAnalysis } from '../../types';
import { SleepQualityChart } from '../charts/SleepQualityChart';

const AnalysisCard: React.FC<{ title: string; description: string; buttonText: string; onAnalyze: () => void; isLoading: boolean; children: React.ReactNode; }> =
    ({ title, description, buttonText, onAnalyze, isLoading, children }) => (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
            <h2 className="font-serif text-2xl">{title}</h2>
            <p className="text-day-text-secondary dark:text-night-text-secondary mt-1 mb-4">{description}</p>
            {children}
        </div>
    );

const BiometricsCard: React.FC = () => {
    const { biometrics, setBiometrics } = useAppContext();
    const [localBiometrics, setLocalBiometrics] = useState<Biometrics>(biometrics);
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        setBiometrics(localBiometrics);
        setIsEditing(false);
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalBiometrics(prev => ({ ...prev, [name]: name === 'age' || name === 'avgSleep' ? (value === '' ? null : parseInt(value)) : value }));
    };

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-2xl">Biometrics</h2>
                {!isEditing && <button onClick={() => setIsEditing(true)} className="text-sm text-day-accent dark:text-night-accent">Edit</button>}
            </div>
            {isEditing ? (
                <div className="space-y-3">
                    <div>
                        <label className="text-sm">Age</label>
                        <input type="number" name="age" value={localBiometrics.age || ''} onChange={handleChange} className="w-full p-2 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md" />
                    </div>
                    <div>
                        <label className="text-sm">Gender</label>
                        <input type="text" name="gender" value={localBiometrics.gender} onChange={handleChange} className="w-full p-2 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md" />
                    </div>
                    <div>
                        <label className="text-sm">Avg. Sleep (hours)</label>
                        <input type="number" name="avgSleep" value={localBiometrics.avgSleep || ''} onChange={handleChange} className="w-full p-2 bg-white/50 dark:bg-black/20 border border-day-border dark:border-night-border rounded-md" />
                    </div>
                    <button onClick={handleSave} className="w-full py-2 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full">Save</button>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold">{biometrics.age || '--'}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Age</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{biometrics.gender || '--'}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Gender</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{biometrics.avgSleep ? `${biometrics.avgSleep}h` : '--'}</p>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Avg. Sleep</p>
                    </div>
                </div>
            )}
        </div>
    );
};


export const InsightsPage: React.FC<{ onDreamSelect: (id: number) => void }> = ({ onDreamSelect }) => {
    const { dreams } = useAppContext();
    const [dreamSynthesis, setDreamSynthesis] = useState<DreamSynthesis | null>(null);
    const [isDreamSynthLoading, setIsDreamSynthLoading] = useState(false);
    const [dreamSynthError, setDreamSynthError] = useState<string | null>(null);

    const [habitAnalysis, setHabitAnalysis] = useState<SleepHabitAnalysis | null>(null);
    const [isHabitLoading, setIsHabitLoading] = useState(false);
    const [habitError, setHabitError] = useState<string | null>(null);

    const chartData = useMemo(() => {
        return dreams
            .filter(d => d.sleepQuality !== null)
            .map(d => ({
                date: new Date(d.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                quality: d.sleepQuality,
            }))
            .reverse(); // Show oldest to newest
    }, [dreams]);

    const handleSynthesizeDreams = async () => {
        setIsDreamSynthLoading(true);
        setDreamSynthError(null);
        try {
            const result = await synthesizeDreamThemes(dreams);
            setDreamSynthesis(result);
        } catch (e) {
            setDreamSynthError("Failed to synthesize dream themes. Please try again.");
        } finally {
            setIsDreamSynthLoading(false);
        }
    };

    const handleAnalyzeHabits = async () => {
        setIsHabitLoading(true);
        setHabitError(null);
        try {
            const result = await analyzeSleepHabits(dreams);
            setHabitAnalysis(result);
        } catch (e) {
            setHabitError("Failed to analyze sleep habits. Please try again.");
        } finally {
            setIsHabitLoading(false);
        }
    };

    const dreamerLevel = Math.floor(dreams.length / 5) + 1;

    // Calculate dream streak (consecutive days with logged dreams)
    const calculateStreak = useMemo(() => {
        if (dreams.length === 0) return { current: 0, best: 0 };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get unique days with dreams (sorted newest first)
        const dreamDates = [...new Set(
            dreams.map(d => {
                const date = new Date(d.timestamp);
                date.setHours(0, 0, 0, 0);
                return date.getTime();
            })
        )].sort((a, b) => b - a);

        // Calculate current streak
        let currentStreak = 0;
        const oneDayMs = 24 * 60 * 60 * 1000;
        let expectedDate = today.getTime();

        for (const dateTime of dreamDates) {
            if (dateTime === expectedDate || dateTime === expectedDate - oneDayMs) {
                currentStreak++;
                expectedDate = dateTime - oneDayMs;
            } else if (dateTime < expectedDate - oneDayMs) {
                break;
            }
        }

        // Calculate best streak
        let bestStreak = 0;
        let tempStreak = 1;
        for (let i = 0; i < dreamDates.length - 1; i++) {
            if (dreamDates[i] - dreamDates[i + 1] === oneDayMs) {
                tempStreak++;
            } else {
                bestStreak = Math.max(bestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        bestStreak = Math.max(bestStreak, tempStreak);

        return { current: currentStreak, best: bestStreak };
    }, [dreams]);

    return (
        <div>
            <h1 className="font-serif page-title text-4xl text-center mb-8">Insights</h1>
            <div className="space-y-8 max-w-2xl mx-auto">
                {/* Stats Card */}
                <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-xl">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-3xl font-bold text-day-accent dark:text-night-accent">{dreamerLevel}</p>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Somnia Level</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold">{calculateStreak.current}</p>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Day Streak 🔥</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold">{calculateStreak.best}</p>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Best Streak</p>
                        </div>
                    </div>
                    <p className="text-center text-sm text-day-text-secondary dark:text-night-text-secondary mt-3">
                        {dreams.length} Dream{dreams.length !== 1 ? 's' : ''} Logged
                    </p>
                </div>

                <BiometricsCard />

                {chartData.length > 1 && (
                    <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
                        <h2 className="font-serif text-2xl mb-4">Sleep Quality Trends</h2>
                        <div className="w-full h-48">
                            <SleepQualityChart data={chartData} />
                        </div>
                    </div>
                )}

                <AnalysisCard title="Dream Weaving" description="Uncover recurring themes and symbols across your entire dream journal." buttonText="Synthesize Dream Themes" onAnalyze={handleSynthesizeDreams} isLoading={isDreamSynthLoading}>
                    {dreamSynthesis ? (
                        <div className="space-y-4 pt-2 animate-fadeIn">
                            <p className="italic text-day-text-secondary dark:text-night-text-secondary">{dreamSynthesis.overallSummary}</p>
                            {dreamSynthesis.recurringThemes.map(item => (
                                <div key={item.theme}>
                                    <h4 className="font-bold font-serif text-lg">{item.theme}</h4>
                                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">{item.description}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {item.exampleDreamIds.map(id => <button onClick={() => onDreamSelect(id)} key={id} className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-md">Dream #{id}</button>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : dreamSynthError ? (
                        <div className="text-center">
                            <p className="text-red-500 py-4">{dreamSynthError}</p>
                            <button onClick={handleSynthesizeDreams} className="px-4 py-1 bg-red-500 text-white text-sm rounded-full">Retry</button>
                        </div>
                    ) : (
                        <button onClick={handleSynthesizeDreams} disabled={isDreamSynthLoading || dreams.length < 3} className="w-full py-2 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed">
                            {isDreamSynthLoading ? 'Analyzing...' : 'Synthesize Dream Themes'}
                        </button>
                    )}
                    {dreams.length < 3 && !dreamSynthesis && <p className="text-xs text-center mt-2 text-day-text-secondary dark:text-night-text-secondary">Requires at least 3 logged dreams.</p>}
                </AnalysisCard>

                <AnalysisCard title="Sleep Science" description="Discover how your nightly routines correlate with your sleep quality." buttonText="Analyze Sleep Habits" onAnalyze={handleAnalyzeHabits} isLoading={isHabitLoading}>
                    {habitAnalysis ? (
                        <div className="space-y-4 pt-2 animate-fadeIn">
                            <div>
                                <h4 className="font-bold font-serif text-lg text-emerald-600 dark:text-emerald-400">Positive Correlations</h4>
                                {habitAnalysis.positiveCorrelations.map(item => <p key={item.habit} className="text-sm text-day-text-secondary dark:text-night-text-secondary"><strong>{item.habit}:</strong> {item.insight}</p>)}
                            </div>
                            <div>
                                <h4 className="font-bold font-serif text-lg text-rose-600 dark:text-rose-400">Negative Correlations</h4>
                                {habitAnalysis.negativeCorrelations.map(item => <p key={item.habit} className="text-sm text-day-text-secondary dark:text-night-text-secondary"><strong>{item.habit}:</strong> {item.insight}</p>)}
                            </div>
                            <div>
                                <h4 className="font-bold font-serif text-lg">Recommendations</h4>
                                <ul className="list-disc list-inside text-sm text-day-text-secondary dark:text-night-text-secondary">
                                    {habitAnalysis.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                                </ul>
                            </div>
                        </div>
                    ) : habitError ? (
                        <div className="text-center">
                            <p className="text-red-500 py-4">{habitError}</p>
                            <button onClick={handleAnalyzeHabits} className="px-4 py-1 bg-red-500 text-white text-sm rounded-full">Retry</button>
                        </div>
                    ) : (
                        <button onClick={handleAnalyzeHabits} disabled={isHabitLoading || dreams.filter(d => d.sleepQuality).length < 3} className="w-full py-2 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed">
                            {isHabitLoading ? 'Analyzing...' : 'Analyze Sleep Habits'}
                        </button>
                    )}
                    {dreams.filter(d => d.sleepQuality).length < 3 && !habitAnalysis && <p className="text-xs text-center mt-2 text-day-text-secondary dark:text-night-text-secondary">Requires at least 3 nights with sleep quality ratings.</p>}
                </AnalysisCard>

                {/* Export Section */}
                <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
                    <h2 className="font-serif text-2xl mb-2">Export Journal</h2>
                    <p className="text-day-text-secondary dark:text-night-text-secondary text-sm mb-4">Save your dream journal for safekeeping or printing.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => exportDreamJournalToPDF(dreams)}
                            disabled={dreams.length === 0}
                            className="flex-1 py-2 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print / PDF
                        </button>
                        <button
                            onClick={() => exportDreamsAsJSON(dreams)}
                            disabled={dreams.length === 0}
                            className="flex-1 py-2 border-2 border-day-accent dark:border-night-accent text-day-accent dark:text-night-accent font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            JSON Backup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};