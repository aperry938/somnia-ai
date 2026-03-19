import React, { createContext, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Dream, DreamMood } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { isDreamArray } from '../utils/validators';
import { generateSecureId } from '../utils/id';
import { enqueueAction } from '../services/syncService';
import { cacheDreamTitle } from '../services/geminiService';
import { logger } from '../services/logger';
import { getGlobalTrendsPrefs } from '../services/dreamTrendsService';

interface DreamContextType {
    dreams: Dream[];
    setDreams: React.Dispatch<React.SetStateAction<Dream[]>>;
    addPastDream: (dreamText: string, sleepQuality: number | null, mood: DreamMood | undefined, timestamp: string) => number;
    updateDream: (updatedDream: Partial<Dream> & { id: number }) => void;
    getDreamById: (id: number) => Dream | undefined;
    deleteDream: (id: number) => void;
    importDreams: (dreams: Dream[]) => void;
    lastSeenDreamCount: number;
    markDreamsAsSeen: () => void;
    getUnreadDreamCount: () => number;
}

const DreamContext = createContext<DreamContextType | undefined>(undefined);

export const DreamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [dreams, setDreams] = useLocalStorage<Dream[]>('somnia_dreams', [], isDreamArray);
    const [lastSeenDreamCount, setLastSeenDreamCount] = useLocalStorage<number>('somnia_last_seen_dream_count', 0);

    // Pre-populate title cache on mount
    useEffect(() => {
        dreams.forEach(dream => {
            if (dream.aiAnalysis?.title && dream.dreamText) {
                cacheDreamTitle(dream.dreamText, dream.aiAnalysis.title);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for sync conflict resolution
    useEffect(() => {
        const handleSyncConflictResolved = (event: CustomEvent<{ dreamId: number; resolution: 'server' | 'client' }>) => {
            const { dreamId, resolution } = event.detail;
            logger.log(`[DreamContext] Sync conflict resolved for dream ${dreamId} with ${resolution} version`);

            try {
                const storedDreams = localStorage.getItem('somnia_dreams');
                if (storedDreams) {
                    const parsedDreams: Dream[] = JSON.parse(storedDreams);
                    const updatedDream = parsedDreams.find(d => d.id === dreamId);
                    if (updatedDream) {
                        setDreams(prev => prev.map(d => d.id === dreamId ? updatedDream : d));
                    }
                }
            } catch (e) {
                logger.error('[DreamContext] Failed to sync conflict-resolved dream to state:', e);
            }
        };

        window.addEventListener('syncConflictResolved', handleSyncConflictResolved as EventListener);
        return () => window.removeEventListener('syncConflictResolved', handleSyncConflictResolved as EventListener);
    }, [setDreams]);

    const addPastDream = useCallback((dreamText: string, sleepQuality: number | null, mood: DreamMood | undefined, timestamp: string): number => {
        const trendsPrefs = getGlobalTrendsPrefs();

        const newDream: Dream = {
            id: generateSecureId(),
            timestamp,
            dreamText,
            sleepQuality,
            title: "Untitled Dream",
            imageUrl: null,
            aiAnalysis: null,
            chatHistory: [],
            mood,
            ...(trendsPrefs.optedIn && {
                shareInGlobalTrends: true,
                userRegion: trendsPrefs.location?.region,
                userCountry: trendsPrefs.location?.country,
            }),
        };
        setDreams(prev => [newDream, ...prev]);
        enqueueAction('ADD_DREAM', newDream);
        return newDream.id;
    }, [setDreams]);

    const importDreams = useCallback((dreamsToImport: Dream[]) => {
        setDreams(prev => [...dreamsToImport, ...prev]);
    }, [setDreams]);

    const deleteDream = useCallback((id: number) => {
        setDreams(prev => prev.filter(d => d.id !== id));
        enqueueAction('DELETE_DREAM', { id });
    }, [setDreams]);

    const updateDream = useCallback((updatedDreamPart: Partial<Dream> & { id: number }) => {
        setDreams(prev => prev.map(d => d.id === updatedDreamPart.id ? { ...d, ...updatedDreamPart } : d));
        enqueueAction('UPDATE_DREAM', updatedDreamPart);
    }, [setDreams]);

    const getDreamById = useCallback((id: number) => {
        return dreams.find(d => d.id === id);
    }, [dreams]);

    const markDreamsAsSeen = useCallback(() => {
        setLastSeenDreamCount(dreams.length);
    }, [dreams.length, setLastSeenDreamCount]);

    const getUnreadDreamCount = useCallback(() => {
        return Math.max(0, dreams.length - lastSeenDreamCount);
    }, [dreams.length, lastSeenDreamCount]);

    const value = useMemo(() => ({
        dreams, setDreams,
        addPastDream, updateDream, getDreamById, deleteDream, importDreams,
        lastSeenDreamCount, markDreamsAsSeen, getUnreadDreamCount,
    }), [
        dreams, setDreams,
        addPastDream, updateDream, getDreamById, deleteDream, importDreams,
        lastSeenDreamCount, markDreamsAsSeen, getUnreadDreamCount,
    ]);

    return <DreamContext.Provider value={value}>{children}</DreamContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useDreams = (): DreamContextType => {
    const context = useContext(DreamContext);
    if (context === undefined) {
        throw new Error('useDreams must be used within a DreamProvider');
    }
    return context;
};
