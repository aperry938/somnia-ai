import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { analyzeSleepHabits, synthesizeDreamThemes } from '../../services/geminiService';
import { DreamSynthesis, SleepHabitAnalysis } from '../../types';
import { SleepQualityChart } from '../charts/SleepQualityChart';
import { detectRecurringPatterns, formatPatternName } from '../../constants/dreamPatterns';
import { WeeklyDigest } from '../insights/WeeklyDigest';
import { GlobalTrendsCard } from '../insights/GlobalTrendsCard';
import { SentimentChart } from '../insights/SentimentChart';
import { DreamCalendar } from '../insights/DreamCalendar';
import { DreamWordCloud } from '../insights/DreamWordCloud';
import { DreamMoodTracker } from '../insights/DreamMoodTracker';
import { LucidDreamProgress } from '../insights/LucidDreamProgress';
import { SleepDurationChart } from '../insights/SleepDurationChart';
import { DreamLengthInsights } from '../insights/DreamLengthInsights';
import { DreamStreakCalendar } from '../insights/DreamStreakCalendar';
import { RecurringThemes } from '../insights/RecurringThemes';
import { InsightsGrid } from '../insights/InsightsGrid';
import { PremiumBadge } from '../shared/PremiumBadge';
import { canUseAiAnalysis, useAiCredit, isPremium } from '../../services/secureSubscriptionService';
import { DreamCompareModal } from '../modals/DreamCompareModal';

type InsightTab = 'dreams' | 'analysis';

const AnalysisCard: React.FC<{ title: string; description: string; buttonText: string; onAnalyze: () => void; isLoading: boolean; children: React.ReactNode; }> =
    ({ title, description, buttonText, onAnalyze, isLoading, children }) => (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
            <h2 className="font-serif text-2xl">{title}</h2>
            <p className="text-day-text-secondary dark:text-night-text-secondary mt-1 mb-4">{description}</p>
            {children}
        </div>
    );

export const InsightsPage: React.FC<{ onDreamSelect: (id: number) => void }> = ({ onDreamSelect }) => {
    const { dreams } = useAppContext();
    const [activeTab, setActiveTab] = useState<InsightTab>('dreams');
    const [dreamSynthesis, setDreamSynthesis] = useState<DreamSynthesis | null>(null);
    const [isDreamSynthLoading, setIsDreamSynthLoading] = useState(false);
    const [dreamSynthError, setDreamSynthError] = useState<string | null>(null);

    const [habitAnalysis, setHabitAnalysis] = useState<SleepHabitAnalysis | null>(null);
    const [isHabitLoading, setIsHabitLoading] = useState(false);
    const [habitError, setHabitError] = useState<string | null>(null);
    const [isCompareOpen, setIsCompareOpen] = useState(false);
    const [isSyncOpen, setIsSyncOpen] = useState(false);

    // Swipe handling
    const containerRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50;

        if (Math.abs(diff) > threshold) {
            if (diff > 0 && activeTab === 'dreams') {
                setActiveTab('analysis');
            } else if (diff < 0 && activeTab === 'analysis') {
                setActiveTab('dreams');
            }
        }
    };

    const chartData = useMemo(() => {
        return dreams
            .filter(d => d.sleepQuality !== null)
            .map(d => ({
                date: new Date(d.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                quality: d.sleepQuality,
            }))
            .reverse();
    }, [dreams]);

    const patterns = useMemo(() => detectRecurringPatterns(dreams), [dreams]);

    const handleSynthesizeDreams = async () => {
        if (!isPremium() && !canUseAiAnalysis()) return;
        setIsDreamSynthLoading(true);
        setDreamSynthError(null);
        try {
            if (!isPremium()) useAiCredit();
            const result = await synthesizeDreamThemes(dreams);
            setDreamSynthesis(result);
        } catch (e) {
            setDreamSynthError("Failed to synthesize dream themes. Please try again.");
        } finally {
            setIsDreamSynthLoading(false);
        }
    };

    const handleAnalyzeHabits = async () => {
        if (!isPremium() && !canUseAiAnalysis()) return;
        setIsHabitLoading(true);
        setHabitError(null);
        try {
            if (!isPremium()) useAiCredit();
            const result = await analyzeSleepHabits(dreams);
            setHabitAnalysis(result);
        } catch (e) {
            setHabitError("Failed to analyze sleep habits. Please try again.");
        } finally {
            setIsHabitLoading(false);
        }
    };

    return (
        <>
            <h1 className="font-serif page-title text-4xl text-center mb-4">Insights</h1>

            {/* Tab Header */}
            <div className="max-w-2xl mx-auto mb-6">
                <div className="flex bg-day-card-bg/50 dark:bg-night-card-bg/50 backdrop-blur-sm rounded-xl p-1 border border-day-border dark:border-night-border">
                    <button
                        onClick={() => setActiveTab('dreams')}
                        aria-pressed={activeTab === 'dreams'}
                        aria-label="My Dreams tab"
                        className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                            activeTab === 'dreams'
                                ? 'bg-day-accent dark:bg-night-accent text-white shadow-lg'
                                : 'text-day-text-secondary dark:text-night-text-secondary hover:bg-white/10 dark:hover:bg-black/10'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        My Dreams
                    </button>
                    <button
                        onClick={() => setActiveTab('analysis')}
                        aria-pressed={activeTab === 'analysis'}
                        aria-label="Analysis tab"
                        className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                            activeTab === 'analysis'
                                ? 'bg-day-accent dark:bg-night-accent text-white shadow-lg'
                                : 'text-day-text-secondary dark:text-night-text-secondary hover:bg-white/10 dark:hover:bg-black/10'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Analysis
                    </button>
                </div>
                {/* Swipe indicator */}
                <p className="text-center text-xs text-day-text-secondary dark:text-night-text-secondary mt-2 opacity-60">
                    Swipe to switch tabs
                </p>
            </div>

            {/* Swipeable Content */}
            <div
                ref={containerRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="max-w-2xl mx-auto"
            >
                {activeTab === 'dreams' ? (
                    <div className="space-y-6 animate-fadeIn">
                        <WeeklyDigest dreams={dreams} />
                        <DreamCalendar dreams={dreams} />
                        <DreamWordCloud dreams={dreams} />
                        <DreamMoodTracker dreams={dreams} />
                        <DreamStreakCalendar dreams={dreams} />
                        <RecurringThemes dreams={dreams} />

                        {/* Recurring Patterns */}
                        {patterns.length > 0 && (
                            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
                                <h2 className="font-serif text-2xl mb-2">Recurring Patterns</h2>
                                <p className="text-day-text-secondary dark:text-night-text-secondary text-sm mb-4">
                                    Themes across multiple dreams
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {patterns.slice(0, 8).map(p => (
                                        <div
                                            key={p.pattern}
                                            className="px-3 py-1.5 bg-day-accent/10 dark:bg-night-accent/10 rounded-full text-sm flex items-center gap-1.5"
                                        >
                                            <span className="font-medium text-day-accent dark:text-night-accent">
                                                {formatPatternName(p.pattern)}
                                            </span>
                                            <span className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                                                ×{p.occurrences}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {patterns.length > 8 && (
                                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-2">
                                        +{patterns.length - 8} more patterns
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Compare Dreams */}
                        {dreams.length >= 2 && (
                            <button
                                onClick={() => setIsCompareOpen(true)}
                                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                </svg>
                                Compare Dreams
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Sync Wearable Card */}
                        <button
                            onClick={() => setIsSyncOpen(true)}
                            className="w-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-300 dark:border-indigo-700 p-4 rounded-xl flex items-center gap-4 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <div className="text-left flex-grow">
                                <h3 className="font-medium text-indigo-700 dark:text-indigo-300">Sync Wearable</h3>
                                <p className="text-sm text-indigo-600/70 dark:text-indigo-400/70">Connect your smartwatch or fitness tracker</p>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        <LucidDreamProgress dreams={dreams} />
                        <SleepDurationChart dreams={dreams} />
                        <DreamLengthInsights dreams={dreams} />

                        {/* Dream Analysis Grid */}
                        <div>
                            <h2 className="font-serif text-2xl text-center mb-4">Dream Analysis</h2>
                            <InsightsGrid dreams={dreams} />
                        </div>

                        <GlobalTrendsCard />

                        {/* Sleep Quality Chart */}
                        {chartData.length > 1 && (
                            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
                                <h2 className="font-serif text-2xl mb-4">Sleep Quality Trends</h2>
                                <div className="w-full h-48">
                                    <SleepQualityChart data={chartData} />
                                </div>
                            </div>
                        )}

                        {/* Sentiment Chart */}
                        {dreams.length >= 2 && <SentimentChart dreams={dreams} />}

                        {/* AI Analysis: Dream Weaving */}
                        <AnalysisCard title="Dream Weaving" description="Uncover recurring themes and symbols across your dream journal." buttonText="Synthesize" onAnalyze={handleSynthesizeDreams} isLoading={isDreamSynthLoading}>
                            {dreamSynthesis ? (
                                <div className="space-y-4 pt-2 animate-fadeIn">
                                    <p className="italic text-day-text-secondary dark:text-night-text-secondary">{dreamSynthesis.overallSummary}</p>
                                    {dreamSynthesis.recurringThemes.map(item => (
                                        <div key={item.theme}>
                                            <h4 className="font-bold font-serif text-lg">{item.theme}</h4>
                                            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">{item.description}</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {item.exampleDreamIds.map(id => (
                                                    <button onClick={() => onDreamSelect(id)} key={id} className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-md">
                                                        Dream #{id}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : dreamSynthError ? (
                                <div className="text-center">
                                    <p className="text-red-500 py-4">{dreamSynthError}</p>
                                    <button onClick={handleSynthesizeDreams} aria-label="Retry dream synthesis" className="px-4 py-1 bg-red-500 text-white text-sm rounded-full">Retry</button>
                                </div>
                            ) : (
                                <PremiumBadge feature="dream_synthesis" className="w-full">
                                    <button onClick={handleSynthesizeDreams} disabled={isDreamSynthLoading || dreams.length < 3} className="w-full py-2 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isDreamSynthLoading ? 'Analyzing...' : 'Synthesize Dream Themes'}
                                    </button>
                                </PremiumBadge>
                            )}
                            {dreams.length < 3 && !dreamSynthesis && <p className="text-xs text-center mt-2 text-day-text-secondary dark:text-night-text-secondary">Requires at least 3 logged dreams.</p>}
                            {!isPremium() && dreams.length >= 3 && !dreamSynthesis && <p className="text-xs text-center mt-1 text-amber-600 dark:text-amber-400">Uses 1 AI credit</p>}
                        </AnalysisCard>

                        {/* AI Analysis: Sleep Science */}
                        <AnalysisCard title="Sleep Science" description="Discover how your routines correlate with sleep quality." buttonText="Analyze" onAnalyze={handleAnalyzeHabits} isLoading={isHabitLoading}>
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
                                    <button onClick={handleAnalyzeHabits} aria-label="Retry sleep habit analysis" className="px-4 py-1 bg-red-500 text-white text-sm rounded-full">Retry</button>
                                </div>
                            ) : (
                                <PremiumBadge feature="sleep_habits" className="w-full">
                                    <button onClick={handleAnalyzeHabits} disabled={isHabitLoading || dreams.filter(d => d.sleepQuality).length < 3} className="w-full py-2 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isHabitLoading ? 'Analyzing...' : 'Analyze Sleep Habits'}
                                    </button>
                                </PremiumBadge>
                            )}
                            {dreams.filter(d => d.sleepQuality).length < 3 && !habitAnalysis && <p className="text-xs text-center mt-2 text-day-text-secondary dark:text-night-text-secondary">Requires at least 3 nights with sleep quality ratings.</p>}
                            {!isPremium() && dreams.filter(d => d.sleepQuality).length >= 3 && !habitAnalysis && <p className="text-xs text-center mt-1 text-amber-600 dark:text-amber-400">Uses 1 AI credit</p>}
                        </AnalysisCard>
                    </div>
                )}
            </div>

            {isCompareOpen && <DreamCompareModal dreams={dreams} onClose={() => setIsCompareOpen(false)} />}

            {/* Sync Wearable Modal */}
            {isSyncOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setIsSyncOpen(false)} role="dialog" aria-modal="true" aria-labelledby="sync-modal-title">
                    <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 mb-4" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 id="sync-modal-title" className="font-serif text-2xl mb-2">Coming Soon</h2>
                        <p className="text-day-text-secondary dark:text-night-text-secondary mb-4">
                            Wearable sync will allow you to connect your smartwatch or fitness tracker to automatically import sleep data, heart rate variability, and movement patterns for more accurate sleep analysis.
                        </p>
                        <p className="text-xs text-day-accent dark:text-night-accent mb-4">
                            Apple Watch, Fitbit, Garmin & more
                        </p>
                        <button onClick={() => setIsSyncOpen(false)} className="w-full py-2 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full">
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
