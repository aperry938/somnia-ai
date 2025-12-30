import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { Page } from './types';
import { useClock } from './hooks/useClock';
import { useAppContext } from './contexts/AppContext';
import { useAlarmManager } from './hooks/useAlarmManager';
import { initAudioContext } from './services/audioService';
import { useRealityChecks } from './hooks/useRealityChecks';
import { useStreakNotification } from './hooks/useStreakNotification';
import { calculateUserStats } from './services/userStatsService';
import { useToast } from './components/shared/Toast';
import { speakText, getBriefingContent } from './services/ttsService';
import { checkAndMigrateData } from './services/migrationService';

import { AlarmsPage } from './components/pages/AlarmsPage';
import { BottomNav } from './components/BottomNav';
import { AlarmRingModal } from './components/modals/AlarmRingModal';
import { DreamScribeModal } from './components/modals/DreamScribeModal';
import { PageLoading } from './components/shared/LoadingStates';
import { KeyboardShortcutsHelp, useKeyboardHelp } from './components/shared/KeyboardHelp';
import { OfflineIndicator } from './components/OfflineIndicator';
import { VoiceCommandFab } from './components/shared/VoiceCommandFab';
import { ThemeToggle } from './components/shared/ThemeToggle';
import { OnboardingCarousel } from './components/onboarding/OnboardingCarousel';
import { useSleepDetection } from './hooks/useSleepDetection';


// Lazy load heavy pages for better code splitting
const SleepPage = lazy(() => import('./components/pages/SleepPage').then(m => ({ default: m.SleepPage })));
const ChroniclePage = lazy(() => import('./components/pages/ChroniclePage').then(m => ({ default: m.ChroniclePage })));
const InsightsPage = lazy(() => import('./components/pages/InsightsPage').then(m => ({ default: m.InsightsPage })));
const DreamDetailPage = lazy(() => import('./components/pages/DreamDetailPage').then(m => ({ default: m.DreamDetailPage })));
const PrivacyPage = lazy(() => import('./components/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./components/pages/TermsPage').then(m => ({ default: m.TermsPage })));



const App: React.FC = () => {
    const { addDream, isScribeOpen, setIsScribeOpen } = useAppContext();
    const [currentPage, setCurrentPage] = useState<Page>('alarms');
    const [selectedDreamId, setSelectedDreamId] = useState<number | null>(null);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
        return localStorage.getItem('somnia_onboarding_complete') === 'true';
    });
    const { timeString, dateString } = useClock();
    const { ringingAlarm, stopRinging, snooze } = useAlarmManager();
    const { isHelpOpen, closeHelp } = useKeyboardHelp();

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

    // Sleep Detection: opens DreamScribe after phone inactivity threshold
    useSleepDetection(() => {
        setIsScribeOpen(true);
    });

    const handleRecordDream = useCallback((quickNote?: string) => {
        stopRinging();
        if (quickNote) setWakeQuickNote(quickNote);
        setIsScribeOpen(true);
    }, [stopRinging, setIsScribeOpen]);

    const handleAwake = useCallback(() => {
        stopRinging();
        const text = getBriefingContent("Dreamer");
        speakText(text);
    }, [stopRinging]);

    const { showToast } = useToast();
    const { dreams } = useAppContext();

    const handleScribeSave = useCallback((dreamText: string, sleepQuality: number | null) => {
        // Calculate pre-save stats
        const oldStats = calculateUserStats(dreams);

        const newDreamId = addDream(dreamText, sleepQuality);

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
        navigateToDreamDetail(newDreamId);
    }, [dreams, addDream, showToast, navigateToDreamDetail, setIsScribeOpen]);

    const renderPage = () => {
        switch (currentPage) {
            case 'alarms':
                return <AlarmsPage timeString={timeString} dateString={dateString} />;
            case 'sleep':
                return <SleepPage />;
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
                        <PrivacyPage onBack={() => setCurrentPage('alarms')} />
                    </Suspense>
                );
            case 'terms':
                return (
                    <Suspense fallback={<PageLoading message="Loading..." />}>
                        <TermsPage onBack={() => setCurrentPage('alarms')} />
                    </Suspense>
                );
            default:
                return <AlarmsPage timeString={timeString} dateString={dateString} />;
        }
    };

    const handleOnboardingComplete = useCallback(() => {
        localStorage.setItem('somnia_onboarding_complete', 'true');
        setHasCompletedOnboarding(true);
    }, []);

    // Show onboarding for first-time users
    if (!hasCompletedOnboarding) {
        return <OnboardingCarousel onComplete={handleOnboardingComplete} />;
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end text-day-text-primary dark:text-night-text-primary transition-colors duration-500">
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <main id="main-content" className="flex-grow overflow-y-auto custom-scrollbar p-4 md:p-6">
                <div className="animate-fadeIn">
                    {renderPage()}
                </div>
            </main>
            <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} />
            {ringingAlarm && <AlarmRingModal onSnooze={snooze} onAwake={handleAwake} onRecordDream={handleRecordDream} />}
            {isScribeOpen && <DreamScribeModal onSave={handleScribeSave} onClose={() => { setIsScribeOpen(false); setWakeQuickNote(''); }} initialText={wakeQuickNote} />}
            <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={closeHelp} />
            <RealityCheckManager />
            <StreakNotificationManager />
            <OfflineIndicator />
            <VoiceCommandFab />
            <ThemeToggle />

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
            className="fixed bottom-20 left-4 text-xs bg-white/10 backdrop-blur px-2 py-1 rounded text-white/50 hover:bg-white/20 transition-all z-50"
            title="Enable Reality Check Notifications"
        >
            RC
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

export default App;