import React, { createContext, useContext, useEffect, ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { Dream, DreamMood } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { isDreamArray } from '../utils/validators';
import { generateSecureId } from '../utils/id';
import { enqueueAction } from '../services/syncService';
import { cacheDreamTitle } from '../services/geminiService';
import { logger } from '../services/logger';
import { getGlobalTrendsPrefs } from '../services/dreamTrendsService';
import {
    isIndexedDBAvailable,
    migrateFromLocalStorage,
    getAllDreams as idbGetAllDreams,
    saveDream as idbSaveDream,
    saveDreams as idbSaveDreams,
    deleteDream as idbDeleteDream,
} from '../services/indexedDBService';

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

    // Track whether IndexedDB is the active storage backend
    const useIDB = useRef(false);
    const [idbReady, setIdbReady] = useState(false);

    // IndexedDB initialization: migrate from localStorage then load from IDB
    useEffect(() => {
        if (!isIndexedDBAvailable()) {
            logger.log('[DreamContext] IndexedDB not available, using localStorage fallback');
            return;
        }

        let cancelled = false;

        const initIDB = async () => {
            try {
                // Step 1: Migrate localStorage data to IDB if needed
                const migrated = await migrateFromLocalStorage();
                if (migrated > 0) {
                    logger.log(`[DreamContext] Migrated ${migrated} dreams to IndexedDB`);
                }

                if (cancelled) return;

                // Step 2: Load all dreams from IDB
                const idbDreams = await idbGetAllDreams();

                if (cancelled) return;

                // Step 3: Activate IDB as the primary backend
                useIDB.current = true;
                setIdbReady(true);

                if (idbDreams.length > 0) {
                    setDreams(idbDreams);
                    logger.log(`[DreamContext] Loaded ${idbDreams.length} dreams from IndexedDB`);
                }
            } catch (e) {
                logger.error('[DreamContext] IndexedDB initialization failed, falling back to localStorage:', e);
                useIDB.current = false;
            }
        };

        initIDB();
        return () => { cancelled = true; };
        // Run once on mount — setDreams is stable from useLocalStorage
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync React state changes to IndexedDB (write-through)
    // This effect runs whenever dreams change AND IDB is ready.
    const prevDreamsRef = useRef<Dream[]>(dreams);
    useEffect(() => {
        if (!useIDB.current || !idbReady) return;

        const prev = prevDreamsRef.current;
        const current = dreams;
        prevDreamsRef.current = current;

        // Skip if reference is the same (no actual change)
        if (prev === current) return;

        // Determine what changed and sync only deltas
        const prevIds = new Set(prev.map(d => d.id));
        const currentIds = new Set(current.map(d => d.id));

        // Deleted dreams
        for (const id of prevIds) {
            if (!currentIds.has(id)) {
                idbDeleteDream(id).catch(e =>
                    logger.error(`[DreamContext] IDB delete failed for dream ${id}:`, e)
                );
            }
        }

        // Added or updated dreams
        const toSave: Dream[] = [];
        for (const dream of current) {
            if (!prevIds.has(dream.id)) {
                // New dream
                toSave.push(dream);
            } else {
                // Possibly updated — compare by reference in prev array
                const prevDream = prev.find(d => d.id === dream.id);
                if (prevDream !== dream) {
                    toSave.push(dream);
                }
            }
        }

        if (toSave.length > 0) {
            idbSaveDreams(toSave).catch(e =>
                logger.error('[DreamContext] IDB bulk save failed:', e)
            );
        }
    }, [dreams, idbReady]);

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
                // If IDB is active, read from IDB; otherwise fall back to localStorage
                if (useIDB.current) {
                    idbGetAllDreams().then(idbDreams => {
                        const updatedDream = idbDreams.find(d => d.id === dreamId);
                        if (updatedDream) {
                            setDreams(prev => prev.map(d => d.id === dreamId ? updatedDream : d));
                        }
                    }).catch(e => {
                        logger.error('[DreamContext] Failed to read IDB during conflict resolution:', e);
                    });
                } else {
                    const storedDreams = localStorage.getItem('somnia_dreams');
                    if (storedDreams) {
                        const parsedDreams: Dream[] = JSON.parse(storedDreams);
                        const updatedDream = parsedDreams.find(d => d.id === dreamId);
                        if (updatedDream) {
                            setDreams(prev => prev.map(d => d.id === dreamId ? updatedDream : d));
                        }
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

        // Also write directly to IDB for immediate persistence
        if (useIDB.current) {
            idbSaveDream(newDream).catch(e =>
                logger.error('[DreamContext] IDB save failed for new dream:', e)
            );
        }

        enqueueAction('ADD_DREAM', newDream);
        return newDream.id;
    }, [setDreams]);

    const importDreams = useCallback((dreamsToImport: Dream[]) => {
        setDreams(prev => [...dreamsToImport, ...prev]);

        // Bulk write to IDB
        if (useIDB.current) {
            idbSaveDreams(dreamsToImport).catch(e =>
                logger.error('[DreamContext] IDB bulk import failed:', e)
            );
        }
    }, [setDreams]);

    const deleteDream = useCallback((id: number) => {
        setDreams(prev => prev.filter(d => d.id !== id));

        // Delete from IDB
        if (useIDB.current) {
            idbDeleteDream(id).catch(e =>
                logger.error(`[DreamContext] IDB delete failed for dream ${id}:`, e)
            );
        }

        enqueueAction('DELETE_DREAM', { id });
    }, [setDreams]);

    const updateDream = useCallback((updatedDreamPart: Partial<Dream> & { id: number }) => {
        setDreams(prev => {
            const updated = prev.map(d => d.id === updatedDreamPart.id ? { ...d, ...updatedDreamPart } : d);

            // Write the full updated dream to IDB
            if (useIDB.current) {
                const fullDream = updated.find(d => d.id === updatedDreamPart.id);
                if (fullDream) {
                    idbSaveDream(fullDream).catch(e =>
                        logger.error('[DreamContext] IDB update failed:', e)
                    );
                }
            }

            return updated;
        });
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
