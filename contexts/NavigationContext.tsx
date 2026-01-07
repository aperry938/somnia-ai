import React, { createContext, useContext, useCallback } from 'react';

type NavigationCallback = (page: 'terms' | 'privacy' | 'profile') => void;

interface NavigationContextType {
    navigateTo: NavigationCallback | null;
    setNavigateTo: (callback: NavigationCallback) => void;
}

const NavigationContext = createContext<NavigationContextType>({
    navigateTo: null,
    setNavigateTo: () => { },
});

export const useNavigation = () => useContext(NavigationContext);

interface NavigationProviderProps {
    children: React.ReactNode;
    onNavigate: NavigationCallback;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children, onNavigate }) => {
    const navigateTo = useCallback(onNavigate, [onNavigate]);

    return (
        <NavigationContext.Provider value={{ navigateTo, setNavigateTo: () => { } }}>
            {children}
        </NavigationContext.Provider>
    );
};

/**
 * Hook to get the Terms navigation callback for use in PremiumBadge/Gate components
 */
export const useTermsNavigation = (): (() => void) | undefined => {
    const { navigateTo } = useNavigation();
    if (!navigateTo) return undefined;
    return () => navigateTo('terms');
};
