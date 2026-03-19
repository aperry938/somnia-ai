import React, { useState, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { analyzeSleepHabits, synthesizeDreamThemes } from '../../services/geminiService';
import { DreamSynthesis, SleepHabitAnalysis } from '../../types';
import { SleepQualityChart } from '../charts/SleepQualityChart';
import { detectRecurringPatterns, formatPatternName } from '../../constants/dreamPatterns';
import { InsightsGrid } from '../insights/InsightsGrid';
import { PremiumBadge } from '../shared/PremiumBadge';
import { FeatureInfoCard } from '../shared/FeatureInfoCard';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { canUseAiAnalysis as _canUseAiAnalysis, consumeAiCredit as _consumeAiCredit, isPremium } from '../../services/secureSubscriptionService';
import { DreamCompareModal } from '../modals/DreamCompareModal';
import { ShareAnalyticsModal } from '../modals/ShareAnalyticsModal';
import { DEMO_DREAMS } from '../../constants/demoDreams';
import haptics from '../../services/hapticsService';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { exportInsightsSummary, InsightsSummaryData } from '../../services/exportService';
import { calculateUserStats } from '../../services/userStatsService';
import { logger } from '../../services/logger';

// Lazy load heavy insight components for better performance
const WeeklyDigest = lazy(() => import('../insights/WeeklyDigest').then(m => ({ default: m.WeeklyDigest })));
const GlobalTrendsCard = lazy(() => import('../insights/GlobalTrendsCard').then(m => ({ default: m.GlobalTrendsCard })));
const SentimentChart = lazy(() => import('../insights/SentimentChart').then(m => ({ default: m.SentimentChart })));
const DreamCalendar = lazy(() => import('../insights/DreamCalendar').then(m => ({ default: m.DreamCalendar })));
const DreamWordCloud = lazy(() => import('../insights/DreamWordCloud').then(m => ({ default: m.DreamWordCloud })));
const DreamMoodTracker = lazy(() => import('../insights/DreamMoodTracker').then(m => ({ default: m.DreamMoodTracker })));
const DreamStreakCalendar = lazy(() => import('../insights/DreamStreakCalendar').then(m => ({ default: m.DreamStreakCalendar })));
const RecurringThemes = lazy(() => import('../insights/RecurringThemes').then(m => ({ default: m.RecurringThemes })));

// Loading skeleton for lazy-loaded insight cards
const InsightCardSkeleton: React.FC = () => (
    <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl animate-pulse">
        <div className="h-6 bg-day-border dark:bg-night-border rounded w-1/3 mb-3" />
        <div className="h-4 bg-day-border dark:bg-night-border rounded w-2/3 mb-4" />
        <div className="h-32 bg-day-border dark:bg-night-border rounded" />
    </div>
);

type InsightTab = 'dreams' | 'analysis';

// AnalysisCard component reserved for future insights tab expansion
// interface AnalysisCardProps { title: string; description: string; buttonText: string; onAnalyze: () => void; isLoading: boolean; children: React.ReactNode; }
// const AnalysisCard: React.FC<AnalysisCardProps> = ({ title, description, buttonText, onAnalyze, isLoading, children }) => (...);

export const InsightsPage: React.FC<{ onDreamSelect: (id: number) => void }> = ({ onDreamSelect }) => {
    const { dreams } = useAppContext();
    const userIsPremium = isPremium();
    const isOnline = useOnlineStatus();

    // Free users always see demo data, premium users see their own data (or demo if < 3 dreams)
    const isUsingDemo = !userIsPremium || dreams.length < 3;
    // Memoize displayDreams to prevent reference changes that would cause child components to re-render
    const displayDreams = useMemo(() => {
        return isUsingDemo ? DEMO_DREAMS : dreams;
    }, [isUsingDemo, dreams]);

    const [activeTab, setActiveTab] = useState<InsightTab>('dreams');
    const [dreamSynthesis, setDreamSynthesis] = useState<DreamSynthesis | null>(null);
    const [isDreamSynthLoading, setIsDreamSynthLoading] = useState(false);
    const [dreamSynthError, setDreamSynthError] = useState<string | null>(null);

    const [habitAnalysis, setHabitAnalysis] = useState<SleepHabitAnalysis | null>(null);
    const [isHabitLoading, setIsHabitLoading] = useState(false);
    const [habitError, setHabitError] = useState<string | null>(null);
    const [isCompareOpen, setIsCompareOpen] = useState(false);
    const [isSyncOpen, setIsSyncOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Memoize modal close handlers to prevent re-renders
    const handleCloseCompare = useCallback(() => setIsCompareOpen(false), []);
    const handleCloseShare = useCallback(() => setIsShareOpen(false), []);

    // Weekly rate limit helpers
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const DREAM_SYNTH_KEY = 'somnia_last_dream_synth';
    const HABIT_ANALYSIS_KEY = 'somnia_last_habit_analysis';
    const DREAM_SYNTH_COUNT_KEY = 'somnia_dream_synth_count';
    const HABIT_ANALYSIS_COUNT_KEY = 'somnia_habit_analysis_count';
    const MIN_NEW_LOGS = 3; // Minimum new logs required before allowing new analysis

    const getNewDreamsSinceSynth = (): number => {
        const lastCount = parseInt(localStorage.getItem(DREAM_SYNTH_COUNT_KEY) || '0', 10);
        return dreams.length - lastCount;
    };

    const getNewDreamsSinceHabit = (): number => {
        const lastCount = parseInt(localStorage.getItem(HABIT_ANALYSIS_COUNT_KEY) || '0', 10);
        return dreams.length - lastCount;
    };

    const canUseDreamSynth = (): boolean => {
        const last = localStorage.getItem(DREAM_SYNTH_KEY);
        if (!last) return true;
        const weekPassed = Date.now() - parseInt(last, 10) >= WEEK_MS;
        const hasEnoughNewDreams = getNewDreamsSinceSynth() >= MIN_NEW_LOGS;
        return weekPassed && hasEnoughNewDreams;
    };

    const canUseHabitAnalysis = (): boolean => {
        const last = localStorage.getItem(HABIT_ANALYSIS_KEY);
        if (!last) return true;
        const weekPassed = Date.now() - parseInt(last, 10) >= WEEK_MS;
        const hasEnoughNewDreams = getNewDreamsSinceHabit() >= MIN_NEW_LOGS;
        return weekPassed && hasEnoughNewDreams;
    };

    const getDaysUntilNextSynth = (): number => {
        const last = localStorage.getItem(DREAM_SYNTH_KEY);
        if (!last) return 0;
        const elapsed = Date.now() - parseInt(last, 10);
        return Math.max(0, Math.ceil((WEEK_MS - elapsed) / (24 * 60 * 60 * 1000)));
    };

    const getDaysUntilNextHabit = (): number => {
        const last = localStorage.getItem(HABIT_ANALYSIS_KEY);
        if (!last) return 0;
        const elapsed = Date.now() - parseInt(last, 10);
        return Math.max(0, Math.ceil((WEEK_MS - elapsed) / (24 * 60 * 60 * 1000)));
    };

    // Swipe handling with improved gesture detection
    const containerRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchEndX = useRef(0);
    const touchEndY = useRef(0);
    const touchStartTime = useRef(0);
    const isTapOnInteractive = useRef(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0]?.clientX ?? 0;
        touchStartY.current = e.touches[0]?.clientY ?? 0;
        touchStartTime.current = Date.now();

        // Check if touch started on an interactive element (button, input, etc.)
        const target = e.target as HTMLElement;
        isTapOnInteractive.current = !!(
            target.closest('button') ||
            target.closest('input') ||
            target.closest('a') ||
            target.closest('[role="button"]') ||
            target.closest('[data-no-swipe]')
        );
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0]?.clientX ?? 0;
        touchEndY.current = e.touches[0]?.clientY ?? 0;
    };

    const handleTouchEnd = () => {
        // Don't process swipe if touch was on an interactive element
        if (isTapOnInteractive.current) {
            return;
        }

        const diffX = touchStartX.current - touchEndX.current;
        const diffY = Math.abs(touchStartY.current - touchEndY.current);
        const touchDuration = Date.now() - touchStartTime.current;
        const threshold = 50;

        // Only trigger swipe if:
        // 1. Horizontal movement exceeds threshold
        // 2. Horizontal movement is greater than vertical (intentional horizontal swipe)
        // 3. Touch duration is > 100ms (not a quick tap)
        // 4. Not a tap on interactive element
        const isHorizontalSwipe = Math.abs(diffX) > diffY;
        const isIntentionalSwipe = touchDuration > 100;

        if (Math.abs(diffX) > threshold && isHorizontalSwipe && isIntentionalSwipe) {
            if (diffX > 0 && activeTab === 'dreams') {
                setActiveTab('analysis');
            } else if (diffX < 0 && activeTab === 'analysis') {
                setActiveTab('dreams');
            }
        }
    };

    const chartData = useMemo(() => {
        return displayDreams
            .filter(d => d.sleepQuality !== null)
            .slice(0, 30) // Limit to last 30 entries for performance and readability
            .map(d => ({
                date: new Date(d.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                quality: d.sleepQuality,
            }))
            .reverse();
    }, [displayDreams]);

    const patterns = useMemo(() => detectRecurringPatterns(displayDreams), [displayDreams]);

    const handleSynthesizeDreams = async () => {
        if (!userIsPremium) return; // Premium only
        if (!canUseDreamSynth()) return; // Weekly limit + min logs check

        setIsDreamSynthLoading(true);
        setDreamSynthError(null);
        try {
            const result = await synthesizeDreamThemes(displayDreams);
            setDreamSynthesis(result);
            localStorage.setItem(DREAM_SYNTH_KEY, Date.now().toString());
            localStorage.setItem(DREAM_SYNTH_COUNT_KEY, displayDreams.length.toString()); // Track count at analysis
        } catch (_e) {
            setDreamSynthError("Failed to synthesize dream themes. Please try again.");
        } finally {
            setIsDreamSynthLoading(false);
        }
    };

    const handleAnalyzeHabits = async () => {
        if (!userIsPremium) return; // Premium only
        if (!canUseHabitAnalysis()) return; // Weekly limit + min logs check

        setIsHabitLoading(true);
        setHabitError(null);
        try {
            const result = await analyzeSleepHabits(displayDreams);
            setHabitAnalysis(result);
            localStorage.setItem(HABIT_ANALYSIS_KEY, Date.now().toString());
            localStorage.setItem(HABIT_ANALYSIS_COUNT_KEY, displayDreams.length.toString()); // Track count at analysis
        } catch (_e) {
            setHabitError("Failed to analyze sleep habits. Please try again.");
        } finally {
            setIsHabitLoading(false);
        }
    };

    // Compute top themes from dream text using keyword matching (same logic as RecurringThemes)
    const topThemes = useMemo((): string[] => {
        const themeKeywords: Record<string, string[]> = {
            'Chase': ['chase', 'chased', 'chasing', 'running', 'escape', 'fled', 'pursued'],
            'Flying': ['fly', 'flying', 'flew', 'floating', 'soaring', 'wings', 'levitate'],
            'Falling': ['fall', 'falling', 'fell', 'dropping', 'plummeting', 'cliff'],
            'Water': ['water', 'ocean', 'sea', 'swimming', 'drowning', 'wave', 'river', 'lake'],
            'Death': ['death', 'dead', 'dying', 'funeral', 'grave'],
            'Teeth': ['teeth', 'tooth', 'falling out', 'crumbling', 'dental'],
            'Test': ['exam', 'test', 'unprepared', 'school', 'class', 'failing'],
            'Lost': ['lost', 'searching', 'maze', 'cannot find', 'wandering'],
            'Animals': ['animal', 'dog', 'cat', 'snake', 'bird', 'wolf', 'bear', 'spider'],
            'Naked': ['naked', 'nude', 'exposed', 'undressed'],
        };
        const counts: { theme: string; count: number }[] = [];
        Object.entries(themeKeywords).forEach(([theme, keywords]) => {
            let count = 0;
            displayDreams.forEach(dream => {
                const text = (dream.dreamText || '').toLowerCase();
                if (keywords.some(kw => text.includes(kw))) count++;
            });
            if (count > 0) counts.push({ theme, count });
        });
        return counts.sort((a, b) => b.count - a.count).slice(0, 5).map(c => c.theme);
    }, [displayDreams]);

    // Compute top moods from dream text using keyword matching (same logic as DreamMoodTracker)
    const topMoods = useMemo((): string[] => {
        const moodKeywords: Record<string, string[]> = {
            'Joyful': ['happy', 'joy', 'laugh', 'smile', 'excited', 'love', 'wonderful', 'amazing'],
            'Anxious': ['anxious', 'worried', 'nervous', 'stress', 'panic', 'fear', 'scared'],
            'Peaceful': ['calm', 'peace', 'serene', 'quiet', 'relax', 'gentle', 'soft'],
            'Confused': ['confused', 'lost', 'strange', 'weird', 'bizarre', 'maze', 'searching'],
            'Sad': ['sad', 'cry', 'tears', 'grief', 'loss', 'miss', 'lonely', 'alone'],
            'Adventurous': ['adventure', 'explore', 'discover', 'journey', 'quest', 'flying', 'travel'],
            'Nightmare': ['nightmare', 'monster', 'demon', 'death', 'horror', 'trapped', 'scream'],
        };
        const counts: Record<string, number> = {};
        displayDreams.forEach(dream => {
            const text = (dream.dreamText || '').toLowerCase();
            Object.entries(moodKeywords).forEach(([mood, keywords]) => {
                keywords.forEach(kw => {
                    const regex = new RegExp(`\\b${kw}\\b`, 'gi');
                    const matches = text.match(regex);
                    if (matches) counts[mood] = (counts[mood] || 0) + matches.length;
                });
            });
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([mood]) => mood);
    }, [displayDreams]);

    const handleExportInsights = useCallback(async () => {
        haptics.medium();
        setIsExporting(true);
        try {
            const stats = calculateUserStats(dreams);

            // Calculate average sleep quality
            const rated = displayDreams.filter(d => d.sleepQuality !== null && d.sleepQuality !== undefined);
            const avgQuality = rated.length > 0
                ? rated.reduce((sum, d) => sum + (d.sleepQuality ?? 0), 0) / rated.length
                : 0;

            // Calculate dream frequency (dreams per week)
            let frequency = '0 per week';
            if (displayDreams.length >= 2) {
                const timestamps = displayDreams.map(d => new Date(d.timestamp).getTime()).sort((a, b) => a - b);
                const spanMs = (timestamps[timestamps.length - 1] ?? 0) - (timestamps[0] ?? 0);
                const spanWeeks = Math.max(spanMs / (7 * 24 * 60 * 60 * 1000), 1);
                const rate = (displayDreams.length / spanWeeks).toFixed(1);
                frequency = `${rate} per week`;
            } else if (displayDreams.length === 1) {
                frequency = '1 recorded';
            }

            // Build date range
            const sorted = [...displayDreams].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const dateRange = first && last
                ? `${fmt(new Date(first.timestamp))} - ${fmt(new Date(last.timestamp))}`
                : 'No dreams yet';

            const summaryData: InsightsSummaryData = {
                totalDreams: stats.totalDreams,
                currentStreak: stats.currentStreak,
                bestStreak: stats.bestStreak,
                avgSleepQuality: avgQuality,
                level: stats.level,
                topThemes,
                topMoods,
                dreamFrequency: frequency,
                dateRange,
            };

            await exportInsightsSummary(summaryData);
            haptics.success();
        } catch (e) {
            logger.error('[InsightsPage] Export insights failed:', e);
            haptics.error();
        } finally {
            setIsExporting(false);
        }
    }, [dreams, displayDreams, topThemes, topMoods]);

    return (
        <>
            {/* Header with Share & Export Buttons */}
            <div className="flex items-center justify-between mb-4 max-w-2xl mx-auto">
                <div className="w-24" /> {/* Spacer for centering (matches right side width) */}
                <h1 className="font-serif page-title text-4xl text-center">Insights</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportInsights}
                        disabled={isExporting || displayDreams.length === 0}
                        className="w-12 h-12 rounded-full flex items-center justify-center bg-day-card-bg/50 dark:bg-night-card-bg/50 border border-day-border dark:border-night-border hover:bg-day-accent/10 dark:hover:bg-night-accent/10 transition-colors disabled:opacity-40"
                        aria-label="Export insights as PDF"
                        title="Export insights as PDF"
                    >
                        {isExporting ? (
                            <div className="w-5 h-5 border-2 border-day-accent/30 dark:border-night-accent/30 border-t-day-accent dark:border-t-night-accent rounded-full animate-spin" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        )}
                    </button>
                    <button
                        onClick={() => { haptics.medium(); setIsShareOpen(true); }}
                        className="w-12 h-12 rounded-full flex items-center justify-center bg-day-card-bg/50 dark:bg-night-card-bg/50 border border-day-border dark:border-night-border hover:bg-day-accent/10 dark:hover:bg-night-accent/10 transition-colors"
                        aria-label="Share analytics"
                        title="Share your analytics"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Tab Header */}
            <div className="max-w-2xl mx-auto mb-6">
                <div
                    className="flex bg-day-card-bg/50 dark:bg-night-card-bg/50 backdrop-blur-sm rounded-xl p-1 border border-day-border dark:border-night-border"
                    role="tablist"
                    aria-label="Insights navigation"
                >
                    <button
                        onClick={() => { haptics.light(); setActiveTab('dreams'); }}
                        role="tab"
                        id="tab-dreams"
                        aria-selected={activeTab === 'dreams'}
                        aria-controls="tabpanel-dreams"
                        tabIndex={activeTab === 'dreams' ? 0 : -1}
                        className={`relative flex-1 py-3 px-4 min-h-[48px] rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'dreams'
                            ? 'bg-day-accent dark:bg-night-accent text-white shadow-lg'
                            : 'text-day-text-secondary dark:text-night-text-secondary hover:bg-white/10 dark:hover:bg-black/10'
                            }`}
                    >
                        {!userIsPremium && (
                            <span className="absolute -top-1 -right-1 inline-flex items-center gap-0.5 text-[8px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1 py-0.5 rounded-full font-medium leading-none shadow-sm" aria-label="Premium feature">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                PRO
                            </span>
                        )}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        <span className="text-sm">My Dreams</span>
                    </button>
                    <button
                        onClick={() => { haptics.light(); setActiveTab('analysis'); }}
                        role="tab"
                        id="tab-analysis"
                        aria-selected={activeTab === 'analysis'}
                        aria-controls="tabpanel-analysis"
                        tabIndex={activeTab === 'analysis' ? 0 : -1}
                        className={`relative flex-1 py-3 px-4 min-h-[48px] rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'analysis'
                            ? 'bg-day-accent dark:bg-night-accent text-white shadow-lg'
                            : 'text-day-text-secondary dark:text-night-text-secondary hover:bg-white/10 dark:hover:bg-black/10'
                            }`}
                    >
                        {!userIsPremium && (
                            <span className="absolute -top-1 -right-1 inline-flex items-center gap-0.5 text-[8px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1 py-0.5 rounded-full font-medium leading-none shadow-sm" aria-label="Premium feature">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                PRO
                            </span>
                        )}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-sm">Analysis</span>
                    </button>
                </div>
                {/* Swipe indicator - hidden from screen readers as it's a visual hint */}
                <p className="text-center text-xs text-day-text-secondary dark:text-night-text-secondary mt-2 opacity-60" aria-hidden="true">
                    Swipe to switch tabs
                </p>
            </div>

            {/* Offline Indicator */}
            {!isOnline && (
                <div className="max-w-2xl mx-auto mb-4">
                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl" role="alert">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                        </svg>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            <span className="font-medium">You're offline</span>
                            <span className="opacity-80"> - Viewing cached data. AI features unavailable.</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Swipeable Content */}
            <div
                ref={containerRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="max-w-2xl mx-auto"
            >
                {activeTab === 'dreams' ? (
                    <div
                        className="space-y-6 animate-fadeIn"
                        role="tabpanel"
                        id="tabpanel-dreams"
                        aria-labelledby="tab-dreams"
                    >
                        {/* Sample Data Banner / Premium Upsell */}
                        {isUsingDemo && (
                            !userIsPremium ? (
                                <PremiumBadge feature="sleep_habits" className="w-full" hideBadge>
                                    <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 cursor-pointer hover:border-amber-400/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            </div>
                                            <div className="flex-grow">
                                                <p className="font-medium text-amber-700 dark:text-amber-200">
                                                    Viewing sample data
                                                </p>
                                                <p className="text-sm text-amber-600 dark:text-amber-300/80">
                                                    Upgrade to Premium to unlock your personal insights
                                                </p>
                                            </div>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </PremiumBadge>
                            ) : (
                                <div className="flex items-center gap-3 px-4 py-3 bg-day-accent/10 dark:bg-night-accent/10 border border-day-accent/20 dark:border-night-accent/20 rounded-xl" role="status">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-day-accent dark:text-night-accent">
                                        <span className="font-medium">Sample data</span>
                                        <span className="opacity-80"> - Log at least 3 dreams to see your personal insights</span>
                                    </p>
                                </div>
                            )
                        )}
                        <ErrorBoundary>
                            <Suspense fallback={<InsightCardSkeleton />}>
                                <WeeklyDigest dreams={displayDreams} />
                            </Suspense>
                        </ErrorBoundary>
                        <ErrorBoundary>
                            <Suspense fallback={<InsightCardSkeleton />}>
                                <DreamCalendar dreams={displayDreams} />
                            </Suspense>
                        </ErrorBoundary>
                        <ErrorBoundary>
                            <Suspense fallback={<InsightCardSkeleton />}>
                                <DreamWordCloud dreams={displayDreams} />
                            </Suspense>
                        </ErrorBoundary>
                        <ErrorBoundary>
                            <Suspense fallback={<InsightCardSkeleton />}>
                                <DreamMoodTracker dreams={displayDreams} />
                            </Suspense>
                        </ErrorBoundary>
                        <ErrorBoundary>
                            <Suspense fallback={<InsightCardSkeleton />}>
                                <DreamStreakCalendar dreams={displayDreams} />
                            </Suspense>
                        </ErrorBoundary>
                        <ErrorBoundary>
                            <Suspense fallback={<InsightCardSkeleton />}>
                                <RecurringThemes dreams={displayDreams} />
                            </Suspense>
                        </ErrorBoundary>

                        {/* Recurring Patterns */}
                        {patterns.length > 0 && (
                            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
                                <h2 className="font-serif text-2xl mb-2" id="patterns-heading">Recurring Patterns</h2>
                                <p className="text-day-text-secondary dark:text-night-text-secondary text-sm mb-4">
                                    Themes across multiple dreams
                                </p>
                                <ul className="flex flex-wrap gap-2" role="list" aria-labelledby="patterns-heading">
                                    {patterns.slice(0, 8).map(p => (
                                        <li
                                            key={p.pattern}
                                            className="px-4 py-2.5 min-h-[44px] bg-day-accent/10 dark:bg-night-accent/10 rounded-full text-sm flex items-center gap-1.5"
                                        >
                                            <span className="font-medium text-day-accent dark:text-night-accent">
                                                {formatPatternName(p.pattern)}
                                            </span>
                                            <span className="text-xs text-day-text-secondary dark:text-night-text-secondary" aria-label={`${p.occurrences} occurrences`}>
                                                x{p.occurrences}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {patterns.length > 8 && (
                                    <p className="text-xs text-day-text-secondary dark:text-night-text-secondary mt-3">
                                        +{patterns.length - 8} more patterns
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Compare Dreams */}
                        {displayDreams.length >= 2 && (
                            <button
                                onClick={() => { haptics.medium(); setIsCompareOpen(true); }}
                                className="w-full py-3 min-h-[48px] bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                aria-label="Compare two dreams side by side"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                </svg>
                                Compare Dreams
                            </button>
                        )}
                    </div>
                ) : (
                    <div
                        className="space-y-6 animate-fadeIn"
                        role="tabpanel"
                        id="tabpanel-analysis"
                        aria-labelledby="tab-analysis"
                    >
                        {/* Premium Banner for Analysis Tab */}
                        {!userIsPremium && (
                            <PremiumBadge feature="sleep_habits" className="w-full" hideBadge>
                                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 cursor-pointer hover:border-amber-400/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-medium text-amber-700 dark:text-amber-200">
                                                Premium Analytics Preview
                                            </p>
                                            <p className="text-sm text-amber-600 dark:text-amber-300/80">
                                                Viewing sample data. Upgrade to unlock your personal sleep and dream analytics.
                                            </p>
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </PremiumBadge>
                        )}

                        {/* Feature Info Cards - At Top */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <FeatureInfoCard
                                title="Dream Weaving"
                                description="AI-powered synthesis of your dream patterns using advanced reasoning."
                                icon={
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                }
                                features={[
                                    "Identify recurring themes across all dreams",
                                    "Discover hidden symbolic connections",
                                    "Track evolution of dream narratives"
                                ]}
                                usageInfo={{
                                    frequency: "Deep Analysis",
                                    requirement: "Pattern Recognition",
                                    model: "AI Insights"
                                }}
                                howItWorks={[
                                    "Collects all dreams from your journal",
                                    "AI analyzes patterns and symbols",
                                    "Generates weekly personalized insights"
                                ]}
                                accentColor="purple"
                                actionLabel={
                                    !isOnline ? "Offline - Unavailable" :
                                    !userIsPremium ? "Upgrade to PRO" :
                                        userIsPremium && !canUseDreamSynth() && getNewDreamsSinceSynth() < MIN_NEW_LOGS
                                            ? `Need ${MIN_NEW_LOGS - getNewDreamsSinceSynth()} more dreams`
                                            : userIsPremium && !canUseDreamSynth()
                                                ? `Available in ${getDaysUntilNextSynth()} days`
                                                : "Synthesize Dream Themes"
                                }
                                onAction={handleSynthesizeDreams}
                                isLoading={isDreamSynthLoading}
                                isDisabled={!isOnline || !userIsPremium || dreams.length < 3 || !canUseDreamSynth()}
                                statusText={
                                    !isOnline
                                        ? "Connect to the internet to use AI features"
                                        : dreams.length < 3
                                            ? "Requires at least 3 logged dreams"
                                            : "Available once per week after logging 3 new dreams"
                                }
                            >
                                {dreamSynthesis && (
                                    <div className="space-y-4 pt-2 animate-fadeIn bg-white/5 rounded-xl p-4" role="region" aria-label="Dream synthesis results">
                                        <p className="italic text-day-text-secondary dark:text-night-text-secondary">{dreamSynthesis.overallSummary}</p>
                                        {dreamSynthesis.recurringThemes.map(item => (
                                            <div key={item.theme}>
                                                <h4 className="font-bold font-serif text-lg text-purple-300">{item.theme}</h4>
                                                <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">{item.description}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {item.exampleDreamIds.map(id => (
                                                        <button
                                                            onClick={() => onDreamSelect(id)}
                                                            key={id}
                                                            className="text-xs px-4 py-2.5 min-h-[44px] bg-purple-500/20 text-purple-300 rounded-md flex items-center hover:bg-purple-500/30 transition-colors"
                                                            aria-label={`View dream number ${id}`}
                                                        >
                                                            Dream #{id}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {dreamSynthError && (
                                    <div className="text-center bg-red-500/10 rounded-xl p-4" role="alert">
                                        <p className="text-red-400 mb-3">{dreamSynthError}</p>
                                        <button
                                            onClick={handleSynthesizeDreams}
                                            disabled={!isOnline}
                                            className="px-6 py-2.5 min-h-[44px] bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                        >
                                            {isOnline ? 'Retry' : 'Offline'}
                                        </button>
                                    </div>
                                )}
                            </FeatureInfoCard>

                            <FeatureInfoCard
                                title="Sleep Analytics"
                                description="AI-powered insights into your sleep habits and quality patterns."
                                icon={
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                }
                                features={[
                                    "Positive & negative habit correlations",
                                    "Personalized sleep recommendations",
                                    "Trend analysis over time"
                                ]}
                                usageInfo={{
                                    frequency: "Smart Insights",
                                    requirement: "Habit Tracking",
                                    model: "Actionable Tips"
                                }}
                                howItWorks={[
                                    "Analyzes sleep quality ratings and notes",
                                    "AI finds habit correlations",
                                    "Provides weekly actionable recommendations"
                                ]}
                                accentColor="emerald"
                                actionLabel={
                                    !isOnline ? "Offline - Unavailable" :
                                    !userIsPremium ? "Upgrade to PRO" :
                                        userIsPremium && !canUseHabitAnalysis() && getNewDreamsSinceHabit() < MIN_NEW_LOGS
                                            ? `Need ${MIN_NEW_LOGS - getNewDreamsSinceHabit()} more entries`
                                            : userIsPremium && !canUseHabitAnalysis()
                                                ? `Available in ${getDaysUntilNextHabit()} days`
                                                : "Analyze Sleep Habits"
                                }
                                onAction={handleAnalyzeHabits}
                                isLoading={isHabitLoading}
                                isDisabled={!isOnline || !userIsPremium || dreams.filter(d => d.sleepQuality).length < 3 || !canUseHabitAnalysis()}
                                statusText={
                                    !isOnline
                                        ? "Connect to the internet to use AI features"
                                        : dreams.filter(d => d.sleepQuality).length < 3
                                            ? "Requires at least 3 nights with sleep quality ratings"
                                            : "Available once per week after logging 3 new entries"
                                }
                            >
                                {habitAnalysis && (
                                    <div className="space-y-4 pt-2 animate-fadeIn bg-white/5 rounded-xl p-4" role="region" aria-label="Sleep habit analysis results">
                                        <div>
                                            <h4 className="font-bold font-serif text-lg text-emerald-400">Positive Correlations</h4>
                                            {habitAnalysis.positiveCorrelations?.map(item => (
                                                <p key={item.habit} className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                                                    <strong className="text-emerald-300">{item.habit}:</strong> {item.insight}
                                                </p>
                                            ))}
                                        </div>
                                        <div>
                                            <h4 className="font-bold font-serif text-lg text-rose-400">Negative Correlations</h4>
                                            {habitAnalysis.negativeCorrelations?.map(item => (
                                                <p key={item.habit} className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                                                    <strong className="text-rose-300">{item.habit}:</strong> {item.insight}
                                                </p>
                                            ))}
                                        </div>
                                        <div>
                                            <h4 className="font-bold font-serif text-lg">Recommendations</h4>
                                            <ul className="list-disc list-inside text-sm text-day-text-secondary dark:text-night-text-secondary" role="list">
                                                {habitAnalysis.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                                {habitError && (
                                    <div className="text-center bg-red-500/10 rounded-xl p-4" role="alert">
                                        <p className="text-red-400 mb-3">{habitError}</p>
                                        <button
                                            onClick={handleAnalyzeHabits}
                                            disabled={!isOnline}
                                            className="px-6 py-2.5 min-h-[44px] bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                        >
                                            {isOnline ? 'Retry' : 'Offline'}
                                        </button>
                                    </div>
                                )}
                            </FeatureInfoCard>
                        </div>

                        {/* Dream Analysis Grid */}
                        <div>
                            <h2 className="font-serif text-2xl text-center mb-4" id="dream-analysis-heading">Dream Analysis</h2>
                            <ErrorBoundary>
                                <InsightsGrid dreams={displayDreams} />
                            </ErrorBoundary>
                        </div>

                        {/* Sleep Quality Chart */}
                        <ErrorBoundary>
                            <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-5 rounded-xl">
                                <h2 className="font-serif text-2xl mb-4" id="sleep-quality-heading">Sleep Quality Trends</h2>
                                {chartData.length > 1 ? (
                                    <div className="w-full h-48" aria-labelledby="sleep-quality-heading">
                                        <SleepQualityChart data={chartData} />
                                    </div>
                                ) : (
                                    <div className="w-full h-48 flex flex-col items-center justify-center text-center" role="status">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-day-text-secondary/30 dark:text-night-text-secondary/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                        <p className="text-day-text-secondary dark:text-night-text-secondary text-sm">No sleep quality data yet</p>
                                        <p className="text-day-text-secondary/60 dark:text-night-text-secondary/60 text-xs mt-1">Rate your sleep quality when logging dreams to see trends</p>
                                    </div>
                                )}
                            </div>
                        </ErrorBoundary>

                        {/* Sentiment Chart */}
                        {displayDreams.length >= 2 && (
                            <ErrorBoundary>
                                <Suspense fallback={<InsightCardSkeleton />}>
                                    <SentimentChart dreams={displayDreams} />
                                </Suspense>
                            </ErrorBoundary>
                        )}

                        {/* Global Trends */}
                        <ErrorBoundary>
                            <Suspense fallback={<InsightCardSkeleton />}>
                                <GlobalTrendsCard />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                )}
            </div>

            {isCompareOpen && <DreamCompareModal dreams={displayDreams} onClose={handleCloseCompare} />}

            {/* Share Analytics Modal */}
            <ShareAnalyticsModal
                dreams={displayDreams}
                isOpen={isShareOpen}
                onClose={handleCloseShare}
            />

            {/* Sync Wearable Modal */}
            {isSyncOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-4 pb-[calc(6.5rem+var(--safe-area-inset-bottom))] sm:pb-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setIsSyncOpen(false)} role="dialog" aria-modal="true" aria-labelledby="sync-modal-title">
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
                        <button onClick={() => setIsSyncOpen(false)} className="w-full py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-bold rounded-full flex items-center justify-center">
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
