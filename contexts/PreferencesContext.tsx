import React, { createContext, useContext, ReactNode, useMemo, useState } from 'react';
import { Biometrics, Theme, CoachPersonality, AnalysisPersonality } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

export type ArtStyle = 'surreal' | 'watercolor' | 'oil-painting' | 'anime' | 'photorealistic' | 'abstract' | 'fantasy' | 'minimalist';

interface PreferencesContextType {
    biometrics: Biometrics;
    setBiometrics: (data: Biometrics) => void;
    themeOverride: Theme | 'auto';
    setThemeOverride: (theme: Theme | 'auto') => void;
    isScribeOpen: boolean;
    setIsScribeOpen: (isOpen: boolean) => void;
    coachPersonality: CoachPersonality;
    setCoachPersonality: (personality: CoachPersonality) => void;
    volume: number;
    setVolume: (volume: number) => void;
    analysisPersonality: AnalysisPersonality;
    setAnalysisPersonality: (personality: AnalysisPersonality) => void;
    artStyle: ArtStyle;
    setArtStyle: (style: ArtStyle) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [biometrics, setBiometrics] = useLocalStorage<Biometrics>('somnia_biometrics', { age: null, gender: '', avgSleep: null });
    const [themeOverride, setThemeOverride] = useLocalStorage<Theme | 'auto'>('somnia_theme_override', 'night');
    const [coachPersonality, setCoachPersonality] = useLocalStorage<CoachPersonality>('somnia_coach_personality', 'mystical');
    const [volume, setVolume] = useLocalStorage<number>('somnia_volume', 0.5);
    const [analysisPersonality, setAnalysisPersonality] = useLocalStorage<AnalysisPersonality>('somnia_analysis_personality', 'oneironaut');
    const [isScribeOpen, setIsScribeOpen] = useState(false);
    const [artStyle, setArtStyle] = useLocalStorage<ArtStyle>('somnia_art_style', 'surreal');

    const value = useMemo(() => ({
        biometrics, setBiometrics,
        themeOverride, setThemeOverride,
        isScribeOpen, setIsScribeOpen,
        coachPersonality, setCoachPersonality,
        volume, setVolume,
        analysisPersonality, setAnalysisPersonality,
        artStyle, setArtStyle,
    }), [
        biometrics, setBiometrics, themeOverride, setThemeOverride,
        isScribeOpen, coachPersonality, setCoachPersonality,
        volume, setVolume, analysisPersonality, setAnalysisPersonality,
        artStyle, setArtStyle,
    ]);

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePreferences = (): PreferencesContextType => {
    const context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error('usePreferences must be used within a PreferencesProvider');
    }
    return context;
};
