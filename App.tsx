import React, { useState, useEffect, Suspense, lazy, useCallback, useRef } from 'react';
import { Page, DreamMood, Dream } from './types';
import { useClock } from './hooks/useClock';
import { useAppContext } from './contexts/AppContext';
import { useAuth } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { useAlarmManager } from './hooks/useAlarmManager';
import { initAudioContext, playAlertnessBoost } from './services/audioService';

import { useStreakNotification } from './hooks/useStreakNotification';
import { useAlarmNotification } from './hooks/useAlarmNotification';
import { calculateUserStats } from './services/userStatsService';
import { getLevelTitle } from './constants/gamification';
import { useToast } from './components/shared/Toast';
import { checkAndMigrateData } from './services/migrationService';
import { logger } from './services/logger';
import { initializeSubscriptions } from './services/secureSubscriptionService';
import { useScrollHaptics } from './hooks/useScrollHaptics';
import { motion, AnimatePresence } from 'framer-motion';

import { AlarmsPage } from './components/pages/AlarmsPage';
import { BottomNav } from './components/BottomNav';
import { AlarmRingModal } from './components/modals/AlarmRingModal';
import { DreamScribeModal } from './components/modals/DreamScribeModal';
import { PageLoading } from './components/shared/LoadingStates';
import { KeyboardShortcutsHelp, useKeyboardHelp } from './components/shared/KeyboardHelp';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ThemeToggle } from './components/shared/ThemeToggle';
import { SignInButton } from './components/shared/SignInButton';
import { OnboardingCarousel } from './components/onboarding/OnboardingCarousel';
import { useSleepDetection } from './hooks/useSleepDetection';
import { DevModeToggle } from './components/DevModeToggle';
import { NowPlayingIndicator } from './components/NowPlayingIndicator';
import { useSwipeNavigation } from './hooks/useSwipeNavigation';
import { useDeepLink } from './hooks/useDeepLink';
import { useWidgetSync } from './hooks/useWidgetSync';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { initializeOfflineQueue, removeFromQueue } from './services/offlineQueueService';
import { analyzeDream } from './services/geminiService';
import { useBackButtonInit } from './hooks/useBackButton';


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
    const { addDream, isScribeOpen, setIsScribeOpen, activeSleepSession, addSleepEntry: _addSleepEntry, clearSleepSession: _clearSleepSession, startSleepSession, saveWakeData, finalizeSleepSession, alarms, sleepEntries } = useAppContext();
    const { isAuthenticated, isLoading: authLoading, isConfigured: authConfigured } = useAuth();

    // Scroll haptics for tactile feedback
    const mainScrollRef = useRef<HTMLElement>(null);
    useScrollHaptics(mainScrollRef, { tickInterval: 100, minVelocity: 0.3 });

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
    const { ringingAlarm, stopRinging, snooze: _snooze, triggerSleepDetectionAlarm, getWakeMetrics, resetWakeMetrics, resetRingStartTime, incrementSnoozeCount } = useAlarmManager();
    const { isHelpOpen, closeHelp } = useKeyboardHelp();

    // Swipe navigation between main pages
    const { currentIndex, totalPages } = useSwipeNavigation(currentPage, setCurrentPage);

    // Deep link and app shortcut navigation
    useDeepLink({
        onNavigate: setCurrentPage,
        onOpenScribe: () => setIsScribeOpen(true),
    });

    // Initialize hardware back button handling for modals
    useBackButtonInit();

    // When an alarm rings, ensure a sleep session exists so we can save wake metrics
    useEffect(() => {
        if (ringingAlarm && !activeSleepSession) {
            // Auto-create a minimal sleep session when alarm rings
            startSleepSession(ringingAlarm.id);
        }
    }, [ringingAlarm, activeSleepSession, startSleepSession]);

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

        // Initialize subscription service (RevenueCat)
        initializeSubscriptions();

        // Initialize native alarms (iOS/Android) - permissions are requested on first alarm creation
        const initNativeAlarms = async () => {
            const { isNative, registerAlarmActions, initializeAlarmListeners } = await import('./services/nativeAlarmService');
            if (isNative) {
                await registerAlarmActions();
                initializeAlarmListeners(
                    (alarmId) => logger.log('[Native] Alarm received:', alarmId),
                    (alarmId, actionId) => logger.log('[Native] Action:', alarmId, actionId)
                );
                logger.log('[Native] Alarm service initialized');
            }
        };
        initNativeAlarms();

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
    const { showToast } = useToast();
    const { dreams } = useAppContext();

    // Keep home screen widgets in sync with app data
    useWidgetSync({ alarms, dreams, sleepEntries });

    // Handle app foreground/background transitions (mobile)
    useAppLifecycle({
        onForeground: () => {
            logger.log('[App] Returned to foreground');
            // Data will auto-refresh through React state/effects
        },
        onTick: () => {
            // Update any time-sensitive UI elements
            // This runs every minute while app is active
        },
    });

    // Sleep Detection: triggers alarm wake-up flow after phone inactivity threshold
    useSleepDetection((soundId: string) => {
        triggerSleepDetectionAlarm(soundId);
    });

    const handleRecordDream = useCallback((quickNote?: string) => {
        // Set quick note first if provided
        if (quickNote) setWakeQuickNote(quickNote);

        // Capture wake metrics NOW before stopping the alarm
        // This ensures we capture timing even if user went directly to "Record Dream"
        const wakeMetrics = getWakeMetrics();
        if (wakeMetrics && activeSleepSession) {
            saveWakeData(wakeMetrics);
        }

        // Stop the alarm first (closes AlarmRingModal)
        stopRinging();

        // Use a small delay to ensure any touch/click events from the alarm modal
        // have cleared before opening the dream scribe modal. This prevents the
        // "Record Full Dream" button tap from accidentally triggering the backdrop
        // click on the newly mounted DreamScribeModal.
        setTimeout(() => {
            setIsScribeOpen(true);
        }, 50);
    }, [stopRinging, setIsScribeOpen, getWakeMetrics, activeSleepSession, saveWakeData]);

    // Capture wake metrics when user first clicks "I'm Awake" - before dream/boost flow
    const handleCaptureWakeMetrics = useCallback(() => {
        const wakeMetrics = getWakeMetrics();
        if (wakeMetrics && activeSleepSession) {
            saveWakeData(wakeMetrics);
        }
    }, [activeSleepSession, saveWakeData, getWakeMetrics]);

    const handleAwake = useCallback(() => {
        // This is called at the very end when modal closes
        stopRinging();
        resetWakeMetrics();
        // Note: We do NOT create entry or clear session here - that happens in addDream/finalizeSleepSession
    }, [stopRinging, resetWakeMetrics]);


    const handleScribeSave = useCallback((dreamText: string, sleepQuality: number | null, mood?: DreamMood) => {
        // Calculate pre-save stats
        const oldStats = calculateUserStats(dreams);

        addDream(dreamText, sleepQuality, mood);

        // Reset wake metrics after dream is saved - prevents accumulation across sessions
        resetWakeMetrics();

        // Calculate post-save stats (addDream updates state but we can predict or use updated state if available,
        // but addDream is sync in AppContext logic, however the 'dreams' var from context is closure-bound.
        // We need to fetch updated dreams? Or just predict.
        // Since we know we added 1 dream, and logic is purely length based for now:
        const predictedNewDreams = [...dreams, { id: 0, timestamp: new Date().toISOString() } as Dream];
        const newStats = calculateUserStats(predictedNewDreams);

        if (newStats.level > oldStats.level) {
            showToast(
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>LEVELED UP! Level {newStats.level}: {getLevelTitle(newStats.level)}</span>
                </div>,
                "success"
            );
        } else {
            // Initiate Alertness Boost (Beta Waves 12Hz) for wakefulness + Toast
            playAlertnessBoost();

            showToast(
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Morning Boost Active</span>
                    </div>
                    <span className="text-xs opacity-90">Playing Alpha Waves for clarity...</span>
                </div>,
                "success"
            );
        }

        setIsScribeOpen(false);
        // Go to homepage, not dream detail - user can view chronicle when ready
        setCurrentPage('alarms');
    }, [dreams, addDream, showToast, setIsScribeOpen, resetWakeMetrics]);

    const navigateToSleep = useCallback(() => {
        setCurrentPage('sleep');
    }, []);

    // Navigation callback for Terms page (used by PremiumBadge throughout app)
    const handleGlobalNavigate = useCallback((page: 'terms' | 'privacy' | 'profile') => {
        setCurrentPage(page);
    }, []);

    const navigateToAlarms = useCallback(() => {
        setCurrentPage('alarms');
    }, []);

    // Page transition animation variants
    const pageTransition = {
        initial: { opacity: 0, x: 10 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -10 },
    };

    const renderPage = () => {
        const pageContent = (() => {
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
                    return <DreamDetailPage dreamId={selectedDreamId} onBack={() => setCurrentPage('chronicle')} onNavigateToDream={navigateToDreamDetail} />;
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
        })();

        return (
            <motion.div
                key={currentPage}
                variants={pageTransition}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeOut' }}
            >
                {pageContent}
            </motion.div>
        );
    };

    const handleOnboardingComplete = useCallback(() => {
        localStorage.setItem('somnia_onboarding_complete', 'true');
        setHasCompletedOnboarding(true);
    }, []);

    const handleSkipAuth = useCallback(() => {
        localStorage.setItem('somnia_skipped_auth', 'true');
        setHasSkippedAuth(true);
        // Reset scroll position to prevent extra space from persisting
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
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
        <NavigationProvider onNavigate={handleGlobalNavigate}>
            <div className="flex flex-col h-[100dvh] overflow-hidden bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end text-day-text-primary dark:text-night-text-primary transition-colors duration-500">
                <a href="#main-content" className="skip-link">Skip to main content</a>
                <main ref={mainScrollRef} id="main-content" className="flex-grow overflow-y-auto overscroll-contain custom-scrollbar px-4 md:px-6 pt-[calc(3.5rem+var(--safe-area-inset-top))] pb-[calc(6.5rem+var(--safe-area-inset-bottom))]">
                    <AnimatePresence mode="wait">
                        {renderPage()}
                    </AnimatePresence>
                    {/* Page indicator dots for swipe navigation */}
                    {currentIndex !== -1 && (
                        <div className="flex justify-center gap-2 py-1">
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
                {ringingAlarm && <AlarmRingModal alarm={ringingAlarm} onSnooze={incrementSnoozeCount} onAwake={handleAwake} onRecordDream={handleRecordDream} onFinalize={finalizeSleepSession} onCaptureWakeMetrics={handleCaptureWakeMetrics} onSnoozeReRing={resetRingStartTime} />}
                {isScribeOpen && <DreamScribeModal onSave={handleScribeSave} onClose={() => { setIsScribeOpen(false); setWakeQuickNote(''); }} initialText={wakeQuickNote} />}
                <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={closeHelp} />

                <StreakNotificationManager />
                <AlarmNotificationManager />
                <OfflineQueueManager />
                <OfflineIndicator />
                <NowPlayingIndicator onNavigateToSleep={navigateToSleep} />
                <ThemeToggle />
                <SignInButton onNavigateToProfile={() => setCurrentPage('profile')} />
                {/* DevModeToggle only rendered in development - SECURITY FIX */}
                {import.meta.env.DEV && <DevModeToggle />}
            </div>
        </NavigationProvider>
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

// Internal component for Offline Queue Processing
const OfflineQueueManager: React.FC = () => {
    const { getDreamById, updateDream, biometrics } = useAppContext();

    useEffect(() => {
        // Process queued dream analysis when back online
        const processQueuedDream = async (dreamId: number, dreamText: string) => {
            const dream = getDreamById(dreamId);
            // Skip if dream no longer exists or already has analysis
            if (!dream || dream.aiAnalysis) {
                removeFromQueue(dreamId);
                return;
            }

            const analysisData = await analyzeDream(dreamText, dream.sleepAids, biometrics, 'oneironaut');
            updateDream({
                id: dreamId,
                title: analysisData.title || dream.title,
                aiAnalysis: analysisData,
            });
            logger.info('[OfflineQueue] Successfully processed queued dream:', dreamId);
        };

        const cleanup = initializeOfflineQueue(processQueuedDream);
        return cleanup;
    }, [getDreamById, updateDream, biometrics]);

    return null;
};

export default App;