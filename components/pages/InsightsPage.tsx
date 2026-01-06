import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { analyzeSleepHabits, synthesizeDreamThemes } from '../../services/geminiService';
import { DreamSynthesis, SleepHabitAnalysis } from '../../types';
import { SleepQualityChart } from '../charts/SleepQualityChart';
import { detectRecurringPatterns, formatPatternName } from '../../constants/dreamPatterns';
import { WeeklyDigest } from '../insights/WeeklyDigest';
import { GlobalTrendsCard } from '../insights/GlobalTrendsCard';
import { SentimentChart } from '../insights/SentimentChart';
import { AchievementsCard } from '../insights/AchievementsCard';
import { calculateUserStats } from '../../services/userStatsService';
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
    const [dreamSynthesis, setDreamSynthesis] = useState<DreamSynthesis | null>(null);
    const [isDreamSynthLoading, setIsDreamSynthLoading] = useState(false);
    const [dreamSynthError, setDreamSynthError] = useState<string | null>(null);

    const [habitAnalysis, setHabitAnalysis] = useState<SleepHabitAnalysis | null>(null);
    const [isHabitLoading, setIsHabitLoading] = useState(false);
    const [habitError, setHabitError] = useState<string | null>(null);
    const [isCompareOpen, setIsCompareOpen] = useState(false);

    const chartData = useMemo(() => {
        return dreams
            .filter(d => d.sleepQuality !== null)
            .map(d => ({
                date: new Date(d.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                quality: d.sleepQuality,
            }))
            .reverse(); // Show oldest to newest
    }, [dreams]);

    // Detect recurring patterns
    const patterns = useMemo(() => detectRecurringPatterns(dreams), [dreams]);

    const handleSynthesizeDreams = async () => {
        // Credit gate for free users
        if (!isPremium() && !canUseAiAnalysis()) {
            return; // PremiumBadge UI will handle this case
        }
        setIsDreamSynthLoading(true);
        setDreamSynthError(null);
        try {
            // Consume credit for free users
            if (!isPremium()) {
                useAiCredit();
            }
            const result = await synthesizeDreamThemes(dreams);
            setDreamSynthesis(result);
        } catch (e) {
            setDreamSynthError("Failed to synthesize dream themes. Please try again.");
        } finally {
            setIsDreamSynthLoading(false);
        }
    };

    const handleAnalyzeHabits = async () => {
        // Credit gate for free users
        if (!isPremium() && !canUseAiAnalysis()) {
            return; // PremiumBadge UI will handle this case
        }
        setIsHabitLoading(true);
        setHabitError(null);
        try {
            // Consume credit for free users
            if (!isPremium()) {
                useAiCredit();
            }
            const result = await analyzeSleepHabits(dreams);
            setHabitAnalysis(result);
        } catch (e) {
            setHabitError("Failed to analyze sleep habits. Please try again.");
        } finally {
            setIsHabitLoading(false);
        }
    };

    // Use centralized stats calculation
    const stats = useMemo(() => calculateUserStats(dreams), [dreams]);

    return (
        <>
            <h1 className="font-serif page-title text-4xl text-center mb-8">Insights</h1>
            <div className="space-y-8 max-w-2xl mx-auto">
                {/* Stats Card */}
                <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-4 rounded-xl">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-3xl font-bold text-day-accent dark:text-night-accent">{stats.level}</p>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Somnia Level</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold">{stats.currentStreak}</p>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Day Streak</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold">{stats.bestStreak}</p>
                            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">Best Streak</p>
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1">
                            <div className="bg-day-accent dark:bg-night-accent h-1.5 rounded-full transition-all duration-500" style={{ width: `${stats.nextLevelProgress}%` }}></div>
                        </div>
                        <p className="text-center text-xs text-day-text-secondary dark:text-night-text-secondary">
                            {stats.totalDreams} Dreams • {Math.ceil((100 - stats.nextLevelProgress) / 20)} dreams to next level
                        </p>
                    </div>
                </div>

                <WeeklyDigest dreams={dreams} />
                <DreamCalendar dreams={dreams} />
                <DreamWordCloud dreams={dreams} />
                <DreamMoodTracker dreams={dreams} />
                <LucidDreamProgress dreams={dreams} />
                <SleepDurationChart dreams={dreams} />
                <DreamLengthInsights dreams={dreams} />
                <DreamStreakCalendar dreams={dreams} />
                <RecurringThemes dreams={dreams} />

                {/* All categorized insights */}
                <div className="mt-8">
                    <h2 className="font-serif text-2xl text-center mb-4">Dream Analysis</h2>
                    <InsightsGrid dreams={dreams} />
                </div>

                <div className="mt-8 mb-8 animate-fadeIn">
                    <GlobalTrendsCard />
                </div>

                <AchievementsCard dreams={dreams} />

                {chartData.length > 1 && (
                    <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
                        <h2 className="font-serif text-2xl mb-4">Sleep Quality Trends</h2>
                        <div className="w-full h-48">
                            <SleepQualityChart data={chartData} />
                        </div>
                    </div>
                )}

                {dreams.length >= 2 && (
                    <div className="animate-fadeIn">
                        <SentimentChart dreams={dreams} />
                    </div>
                )}

                {/* Recurring Patterns Section */}
                {patterns.length > 0 && (
                    <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
                        <h2 className="font-serif text-2xl mb-2">Recurring Patterns</h2>
                        <p className="text-day-text-secondary dark:text-night-text-secondary text-sm mb-4">
                            Themes that appear across multiple dreams
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
                                +{patterns.length - 8} more patterns detected
                            </p>
                        )}
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
                        <PremiumBadge feature="dream_synthesis" className="w-full">
                            <button onClick={handleSynthesizeDreams} disabled={isDreamSynthLoading || dreams.length < 3} className="w-full py-2 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed">
                                {isDreamSynthLoading ? 'Analyzing...' : 'Synthesize Dream Themes'}
                            </button>
                        </PremiumBadge>
                    )}
                    {dreams.length < 3 && !dreamSynthesis && <p className="text-xs text-center mt-2 text-day-text-secondary dark:text-night-text-secondary">Requires at least 3 logged dreams.</p>}
                    {!isPremium() && dreams.length >= 3 && !dreamSynthesis && <p className="text-xs text-center mt-1 text-amber-600 dark:text-amber-400">Uses 1 AI credit</p>}
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
                        <PremiumBadge feature="sleep_habits" className="w-full">
                            <button onClick={handleAnalyzeHabits} disabled={isHabitLoading || dreams.filter(d => d.sleepQuality).length < 3} className="w-full py-2 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed">
                                {isHabitLoading ? 'Analyzing...' : 'Analyze Sleep Habits'}
                            </button>
                        </PremiumBadge>
                    )}
                    {dreams.filter(d => d.sleepQuality).length < 3 && !habitAnalysis && <p className="text-xs text-center mt-2 text-day-text-secondary dark:text-night-text-secondary">Requires at least 3 nights with sleep quality ratings.</p>}
                    {!isPremium() && dreams.filter(d => d.sleepQuality).length >= 3 && !habitAnalysis && <p className="text-xs text-center mt-1 text-amber-600 dark:text-amber-400">Uses 1 AI credit</p>}
                </AnalysisCard>

                {/* Compare Dreams Button */}
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

            {isCompareOpen && <DreamCompareModal dreams={dreams} onClose={() => setIsCompareOpen(false)} />}
        </>
    );
};