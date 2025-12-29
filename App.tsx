import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Page } from './types';
import { useClock } from './hooks/useClock';
import { useAppContext } from './contexts/AppContext';
import { useAlarmManager } from './hooks/useAlarmManager';
import { initAudioContext } from './services/audioService';

import { AlarmsPage } from './components/pages/AlarmsPage';
import { BottomNav } from './components/BottomNav';
import { AlarmRingModal } from './components/modals/AlarmRingModal';
import { DreamScribeModal } from './components/modals/DreamScribeModal';
import { PageLoading } from './components/shared/LoadingStates';
import { KeyboardShortcutsHelp, useKeyboardHelp } from './components/shared/KeyboardHelp';

// Lazy load heavy pages for better code splitting
const SleepPage = lazy(() => import('./components/pages/SleepPage').then(m => ({ default: m.SleepPage })));
const ChroniclePage = lazy(() => import('./components/pages/ChroniclePage').then(m => ({ default: m.ChroniclePage })));
const InsightsPage = lazy(() => import('./components/pages/InsightsPage').then(m => ({ default: m.InsightsPage })));
const DreamDetailPage = lazy(() => import('./components/pages/DreamDetailPage').then(m => ({ default: m.DreamDetailPage })));



const App: React.FC = () => {
    const { addDream } = useAppContext();
    const [currentPage, setCurrentPage] = useState<Page>('alarms');
    const [selectedDreamId, setSelectedDreamId] = useState<number | null>(null);
    const { timeString, dateString } = useClock();
    const { ringingAlarm, stopRinging, snooze } = useAlarmManager();
    const [isScribeOpen, setIsScribeOpen] = useState(false);
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

    const navigateToDreamDetail = (dreamId: number) => {
        setSelectedDreamId(dreamId);
        setCurrentPage('dream-detail');
    };

    const handleRecordDream = () => {
        stopRinging();
        setIsScribeOpen(true);
    };

    const handleScribeSave = (dreamText: string, sleepQuality: number | null) => {
        const newDreamId = addDream(dreamText, sleepQuality);
        setIsScribeOpen(false);
        navigateToDreamDetail(newDreamId);
    }

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
            default:
                return <AlarmsPage timeString={timeString} dateString={dateString} />;
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end text-day-text-primary dark:text-night-text-primary transition-colors duration-500">
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <main id="main-content" className="flex-grow overflow-y-auto custom-scrollbar p-4 md:p-6">
                <div className="animate-fadeIn">
                    {renderPage()}
                </div>
            </main>
            <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} />
            {ringingAlarm && <AlarmRingModal onSnooze={snooze} onAwake={stopRinging} onRecordDream={handleRecordDream} />}
            {isScribeOpen && <DreamScribeModal onSave={handleScribeSave} onClose={() => setIsScribeOpen(false)} />}
            <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={closeHelp} />
        </div>
    );
};

export default App;