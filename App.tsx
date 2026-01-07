import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { Page, DreamMood } from './types';
import { useClock } from './hooks/useClock';
import { useAppContext } from './contexts/AppContext';
import { useAuth } from './contexts/AuthContext';
import { useAlarmManager } from './hooks/useAlarmManager';
import { initAudioContext } from './services/audioService';
import { useRealityChecks } from './hooks/useRealityChecks';
import { useStreakNotification } from './hooks/useStreakNotification';
import { useAlarmNotification } from './hooks/useAlarmNotification';
import { calculateUserStats } from './services/userStatsService';
import { useToast } from './components/shared/Toast';
import { checkAndMigrateData } from './services/migrationService';

import { AlarmsPage } from './components/pages/AlarmsPage';
import { BottomNav } from './components/BottomNav';
import { AlarmRingModal } from './components/modals/AlarmRingModal';
import { DreamScribeModal } from './components/modals/DreamScribeModal';
import { PageLoading } from './components/shared/LoadingStates';
import { KeyboardShortcutsHelp, useKeyboardHelp } from './components/shared/KeyboardHelp';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ThemeToggle } from './components/shared/ThemeToggle';
import { OnboardingCarousel } from './components/onboarding/OnboardingCarousel';
import { useSleepDetection } from './hooks/useSleepDetection';
import { DevModeToggle } from './components/DevModeToggle';
import { useSwipeNavigation } from './hooks/useSwipeNavigation';


// Lazy load heavy pages for better code splitting
const SleepPage = lazy(() => import('./components/pages/SleepPage').then(m => ({ default: m.SleepPage })));
const ChroniclePage = lazy(() => import('./components/pages/ChroniclePage').then(m => ({ default: m.ChroniclePage })));
const InsightsPage = lazy(() => import('./components/pages/InsightsPage').then(m => ({ default: m.InsightsPage })));
const DreamDetailPage = lazy(() => import('./components/pages/DreamDetailPage').then(m => ({ default: m.DreamDetailPage })));
const PrivacyPage = lazy(() => import('./components/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./components/pages/TermsPage').then(m => ({ default: m.TermsPage })));
const ProfilePage = lazy(() => import('./components/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AuthPage = lazy(() => import('./components/pages/AuthPage').then(m => ({ default: m.AuthPage })));
const SuccessPage = lazy(() => import('./components/pages/SuccessPage').then(m => ({ default: m.SuccessPage })));
const AdminPage = lazy(() => import('./components/pages/AdminPage').then(m => ({ default: m.AdminPage })));



const App: React.FC = () => {
    const { addDream, isScribeOpen, setIsScribeOpen } = useAppContext();
    const { isAuthenticated, isLoading: authLoading, isConfigured: authConfigured } = useAuth();

    // Check for Stripe success redirect
    const initialPage = (): Page => {
        const url = new URL(window.location.href);
        if (url.pathname === '/success' || url.searchParams.has('session_id')) {
            return 'success';
        }
        return 'alarms';
    };

    const [currentPage, setCurrentPage] = useState<Page>(initialPage);
    const [selectedDreamId, setSelectedDreamId] = useState<number | null>(null);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
        return localStorage.getItem('somnia_onboarding_complete') === 'true';
    });
    const [hasSkippedAuth, setHasSkippedAuth] = useState(() => {
        return localStorage.getItem('somnia_skipped_auth') === 'true';
    });
    const { timeString, dateString } = useClock();
    const { ringingAlarm, stopRinging, snooze, triggerSleepDetectionAlarm } = useAlarmManager();
    const { isHelpOpen, closeHelp } = useKeyboardHelp();

    // Swipe navigation between main pages
    const { currentIndex, totalPages } = useSwipeNavigation(currentPage, setCurrentPage);

    useEffect(() => {
        const resumeAudio = () => {
            initAudioContext();
            // Remove listeners after first interaction
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
        };
        document.addEventListener('click', resumeAudio);
        document.addEventListener('keydown', resumeAudio);

        // Check data integrity
        checkAndMigrateData();

        return () => {
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
        };
    }, []);

    // Keyboard shortcuts for navigation (1-4)
    useEffect(() => {
        const handleKeyNav = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key) {
                case '1': setCurrentPage('alarms'); break;
                case '2': setCurrentPage('sleep'); break;
                case '3': setCurrentPage('chronicle'); break;
                case '4': setCurrentPage('insights'); break;
                case '5': setCurrentPage('profile'); break;
            }
        };
        window.addEventListener('keydown', handleKeyNav);
        return () => window.removeEventListener('keydown', handleKeyNav);
    }, []);

    // Listen for openDreamScribe event from Chronicle empty state
    useEffect(() => {
        const handleOpenScribe = () => setIsScribeOpen(true);
        window.addEventListener('openDreamScribe', handleOpenScribe);
        return () => window.removeEventListener('openDreamScribe', handleOpenScribe);
    }, [setIsScribeOpen]);

    const navigateToDreamDetail = useCallback((dreamId: number) => {
        setSelectedDreamId(dreamId);
        setCurrentPage('dream-detail');
    }, []);

    const [wakeQuickNote, setWakeQuickNote] = useState<string>('');

    // Sleep Detection: triggers alarm wake-up flow after phone inactivity threshold
    useSleepDetection((soundId: string) => {
        triggerSleepDetectionAlarm(soundId);
    });

    const handleRecordDream = useCallback((quickNote?: string) => {
        stopRinging();
        if (quickNote) setWakeQuickNote(quickNote);
        setIsScribeOpen(true);
    }, [stopRinging, setIsScribeOpen]);

    const handleAwake = useCallback(() => {
        stopRinging();
        // No TTS greeting - just dismiss the alarm
    }, [stopRinging]);

    const { showToast } = useToast();
    const { dreams } = useAppContext();

    const handleScribeSave = useCallback((dreamText: string, sleepQuality: number | null, mood?: DreamMood) => {
        // Calculate pre-save stats
        const oldStats = calculateUserStats(dreams);

        const newDreamId = addDream(dreamText, sleepQuality, mood);

        // Calculate post-save stats (addDream updates state but we can predict or use updated state if available, 
        // but addDream is sync in AppContext logic, however the 'dreams' var from context is closure-bound.
        // We need to fetch updated dreams? Or just predict.
        // Since we know we added 1 dream, and logic is purely length based for now:
        const predictedNewDreams = [...dreams, { id: 0, timestamp: new Date().toISOString() } as any];
        const newStats = calculateUserStats(predictedNewDreams);

        if (newStats.level > oldStats.level) {
            showToast(
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>LEVELED UP! Level {newStats.level}: Oneironaut</span>
                </div>,
                "success"
            );
        }

        setIsScribeOpen(false);
        // Go to homepage, not dream detail - user can view chronicle when ready
        setCurrentPage('alarms');
    }, [dreams, addDream, showToast, setIsScribeOpen]);

    const navigateToSleep = useCallback(() => {
        setCurrentPage('sleep');
    }, []);

    const navigateToAlarms = useCallback(() => {
        setCurrentPage('alarms');
    }, []);

    const renderPage = () => {
        switch (currentPage) {
            case 'alarms':
                return <AlarmsPage timeString={timeString} dateString={dateString} onNavigateToSleep={navigateToSleep} />;
            case 'sleep':
                return <SleepPage onNavigateToAlarms={navigateToAlarms} />;
            case 'chronicle':
                return <ChroniclePage onDreamSelect={navigateToDreamDetail} />;
            case 'insights':
                return (
                    <Suspense fallback={<PageLoading message="Loading insights..." />}>
                        <InsightsPage onDreamSelect={navigateToDreamDetail} />
                    </Suspense>
                );
            case 'dream-detail':
                return <DreamDetailPage dreamId={selectedDreamId} onBack={() => setCurrentPage('chronicle')} />;
            case 'privacy':
                return (
                    <Suspense fallback={<PageLoading message="Loading..." />}>
                        <PrivacyPage onBack={() => setCurrentPage('profile')} />
                    </Suspense>
                );
            case 'terms':
                return (
                    <Suspense fallback={<PageLoading message="Loading..." />}>
                        <TermsPage onBack={() => setCurrentPage('profile')} />
                    </Suspense>
                );
            case 'profile':
                return (
                    <Suspense fallback={<PageLoading message="Loading profile..." />}>
                        <ProfilePage onNavigateTo={(page) => setCurrentPage(page)} />
                    </Suspense>
                );
            case 'success':
                return (
                    <Suspense fallback={<PageLoading message="Processing..." />}>
                        <SuccessPage onBack={() => {
                            // Clear URL params and navigate to alarms
                            window.history.replaceState({}, '', '/');
                            setCurrentPage('alarms');
                        }} />
                    </Suspense>
                );
            case 'admin':
                return (
                    <Suspense fallback={<PageLoading message="Loading admin..." />}>
                        <AdminPage onBack={() => setCurrentPage('profile')} />
                    </Suspense>
                );
            default:
                return <AlarmsPage timeString={timeString} dateString={dateString} onNavigateToSleep={navigateToSleep} />;
        }
    };

    const handleOnboardingComplete = useCallback(() => {
        localStorage.setItem('somnia_onboarding_complete', 'true');
        setHasCompletedOnboarding(true);
    }, []);

    const handleSkipAuth = useCallback(() => {
        localStorage.setItem('somnia_skipped_auth', 'true');
        setHasSkippedAuth(true);
    }, []);

    // Show onboarding for first-time users
    if (!hasCompletedOnboarding) {
        return <OnboardingCarousel onComplete={handleOnboardingComplete} />;
    }

    // Show auth loading state
    if (authLoading) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end">
                <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-day-accent dark:text-night-accent animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                </div>
                <p className="text-day-text-secondary dark:text-night-text-secondary">Loading...</p>
            </div>
        );
    }

    // Show auth page if configured and not authenticated and hasn't skipped
    if (authConfigured && !isAuthenticated && !hasSkippedAuth) {
        return (
            <Suspense fallback={<PageLoading message="Loading..." />}>
                <AuthPage onSkip={handleSkipAuth} />
            </Suspense>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end text-day-text-primary dark:text-night-text-primary transition-colors duration-500">
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <main id="main-content" className="flex-grow overflow-y-auto custom-scrollbar p-4 md:p-6">
                <div className="animate-fadeIn">
                    {renderPage()}
                </div>
                {/* Page indicator dots for swipe navigation */}
                {currentIndex !== -1 && (
                    <div className="flex justify-center gap-2 py-3 mt-4">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentIndex
                                    ? 'bg-day-accent dark:bg-night-accent w-6'
                                    : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </main>
            <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} />
            {ringingAlarm && <AlarmRingModal alarm={ringingAlarm} onSnooze={snooze} onAwake={handleAwake} onRecordDream={handleRecordDream} />}
            {isScribeOpen && <DreamScribeModal onSave={handleScribeSave} onClose={() => { setIsScribeOpen(false); setWakeQuickNote(''); }} initialText={wakeQuickNote} />}
            <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={closeHelp} />
            <RealityCheckManager />
            <StreakNotificationManager />
            <AlarmNotificationManager />
            <OfflineIndicator />
            <ThemeToggle />
            {/* DevModeToggle only rendered in development - SECURITY FIX */}
            {import.meta.env.DEV && <DevModeToggle />}
        </div>
    );
};

// Internal component for Reality Checks (could be moved)
const RealityCheckManager = () => {
    const { permission, requestPermission } = useRealityChecks();
    if (permission === 'granted') return null;
    return (
        <button
            onClick={requestPermission}
            aria-label="Enable Reality Check Notifications"
            className="fixed bottom-20 left-4 text-xs min-h-[44px] bg-white/10 backdrop-blur px-3 py-2 rounded-lg text-white/50 hover:bg-white/20 transition-all z-50 flex items-center justify-center gap-1"
            title="Enable Reality Check Notifications"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Reality Check
        </button>
    );
};

// Internal component for Streak Notifications
const StreakNotificationManager: React.FC = () => {
    const { dreams } = useAppContext();
    const stats = calculateUserStats(dreams);
    // Hook handles notification logic internally
    useStreakNotification(dreams, stats.currentStreak);
    return null;
};

// Internal component for Alarm Status Bar Notification
const AlarmNotificationManager: React.FC = () => {
    const { alarms } = useAppContext();
    // Hook shows persistent notification when alarm is set
    useAlarmNotification(alarms);
    return null;
};

export default App;