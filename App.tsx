import React, { useState, useEffect } from 'react';
import { Page } from './types';
import { useClock } from './hooks/useClock';
import { useAppContext } from './contexts/AppContext';
import { useAlarmManager } from './hooks/useAlarmManager';
import { initAudioContext } from './services/audioService';

import { AlarmsPage } from './components/pages/AlarmsPage';
import { SleepPage } from './components/pages/SleepPage';
import { ChroniclePage } from './components/pages/ChroniclePage';
import { InsightsPage } from './components/pages/InsightsPage';
import { DreamDetailPage } from './components/pages/DreamDetailPage';
import { BottomNav } from './components/BottomNav';
import { AlarmRingModal } from './components/modals/AlarmRingModal';
import { DreamScribeModal } from './components/modals/DreamScribeModal';


const App: React.FC = () => {
    const { addDream } = useAppContext();
    const [currentPage, setCurrentPage] = useState<Page>('alarms');
    const [selectedDreamId, setSelectedDreamId] = useState<number | null>(null);
    const { timeString, dateString } = useClock();
    const { ringingAlarm, stopRinging, snooze } = useAlarmManager();
    const [isScribeOpen, setIsScribeOpen] = useState(false);
    
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
                return <InsightsPage onDreamSelect={navigateToDreamDetail} />;
            case 'dream-detail':
                return <DreamDetailPage dreamId={selectedDreamId} onBack={() => setCurrentPage('chronicle')} />;
            default:
                return <AlarmsPage timeString={timeString} dateString={dateString} />;
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end text-day-text-primary dark:text-night-text-primary transition-colors duration-500">
            <main className="flex-grow overflow-y-auto custom-scrollbar p-4 md:p-6">
                <div className="animate-fadeIn">
                    {renderPage()}
                </div>
            </main>
            <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} />
            {ringingAlarm && <AlarmRingModal onSnooze={snooze} onAwake={stopRinging} onRecordDream={handleRecordDream} />}
            {isScribeOpen && <DreamScribeModal onSave={handleScribeSave} onClose={() => setIsScribeOpen(false)} />}
        </div>
    );
};

export default App;