/**
 * useDeepLink - Handle deep links and app shortcuts for navigation
 *
 * Supports:
 * - Android deep links (somnia://path)
 * - iOS deep links (somnia://path)
 * - iOS Quick Actions (appShortcut event)
 * - Widget navigation (route parameter)
 *
 * Routes:
 * - /alarm or /alarms -> alarms page
 * - /sleep -> sleep page
 * - /stats or /insights -> insights page
 * - /journal or /chronicle -> chronicle page
 * - /journal/new -> open dream scribe
 * - /profile -> profile page
 */

import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';
import { Page } from '../types';
import { logger } from '../services/logger';

interface DeepLinkOptions {
    onNavigate: (page: Page) => void;
    onOpenScribe?: () => void;
}

// Map URL paths to app pages
const routeToPage: Record<string, Page> = {
    '/alarm': 'alarms',
    '/alarms': 'alarms',
    '/sleep': 'sleep',
    '/stats': 'insights',
    '/insights': 'insights',
    '/journal': 'chronicle',
    '/chronicle': 'chronicle',
    '/profile': 'profile',
};

// Special routes that trigger actions instead of navigation
const actionRoutes = ['/journal/new', '/dream/new', '/record'];

export function useDeepLink({ onNavigate, onOpenScribe }: DeepLinkOptions): void {
    const handleRoute = useCallback((route: string) => {
        logger.log('[DeepLink] Handling route:', route);

        // Normalize route
        const normalizedRoute = route.startsWith('/') ? route : `/${route}`;

        // Check for action routes first
        if (actionRoutes.includes(normalizedRoute)) {
            logger.log('[DeepLink] Opening dream scribe');
            onOpenScribe?.();
            return;
        }

        // Check for page navigation
        const page = routeToPage[normalizedRoute];
        if (page) {
            logger.log('[DeepLink] Navigating to:', page);
            onNavigate(page);
        } else {
            logger.warn('[DeepLink] Unknown route:', normalizedRoute);
        }
    }, [onNavigate, onOpenScribe]);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        // Track if component is still mounted for async operations
        let isMounted = true;
        // Store listener handle for proper cleanup
        let appUrlOpenListener: { remove: () => Promise<void> } | null = null;

        // Handle deep links from Capacitor App plugin
        const handleAppUrlOpen = (event: URLOpenListenerEvent) => {
            if (!isMounted) return;
            logger.log('[DeepLink] URL opened:', event.url);

            try {
                const url = new URL(event.url);
                const route = url.pathname || url.host; // somnia://alarm or somnia:///alarm
                handleRoute(route);
            } catch (_e) {
                // Handle simple scheme URLs like somnia:alarm
                const path = event.url.replace('somnia://', '').replace('somnia:', '');
                handleRoute(path);
            }
        };

        // Listen for app URL opens - store the listener handle
        CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen)
            .then(handle => {
                if (isMounted) {
                    appUrlOpenListener = handle;
                } else {
                    // Component unmounted before listener was added, clean up immediately
                    handle.remove().catch(err =>
                        logger.error('[DeepLink] Failed to remove appUrlOpen listener:', err)
                    );
                }
            })
            .catch(err => logger.error('[DeepLink] Failed to add appUrlOpen listener:', err));

        // Handle iOS Quick Actions (custom event from AppDelegate)
        const handleAppShortcut = (event: CustomEvent<{ route: string }>) => {
            if (!isMounted) return;
            logger.log('[DeepLink] App shortcut triggered:', event.detail);
            if (event.detail?.route) {
                handleRoute(event.detail.route);
            }
        };

        window.addEventListener('appShortcut', handleAppShortcut as EventListener);

        // Handle Android widget navigation (route extra from intent)
        const handleWidgetNav = (event: CustomEvent<{ route: string }>) => {
            if (!isMounted) return;
            logger.log('[DeepLink] Widget navigation:', event.detail);
            if (event.detail?.route) {
                handleRoute(event.detail.route);
            }
        };

        window.addEventListener('widgetNavigation', handleWidgetNav as EventListener);

        // Check for initial URL (app launched via deep link)
        CapacitorApp.getLaunchUrl()
            .then((result) => {
                if (isMounted && result?.url) {
                    logger.log('[DeepLink] App launched with URL:', result.url);
                    handleAppUrlOpen({ url: result.url });
                }
            })
            .catch(err => logger.error('[DeepLink] Failed to get launch URL:', err));

        return () => {
            isMounted = false;
            // Remove only this hook's listener, not ALL app listeners
            if (appUrlOpenListener) {
                appUrlOpenListener.remove().catch(err =>
                    logger.error('[DeepLink] Failed to remove appUrlOpen listener:', err)
                );
            }
            window.removeEventListener('appShortcut', handleAppShortcut as EventListener);
            window.removeEventListener('widgetNavigation', handleWidgetNav as EventListener);
        };
    }, [handleRoute]);
}

/**
 * Helper to programmatically navigate via deep link
 */
export function navigateViaDeepLink(route: string): void {
    window.dispatchEvent(new CustomEvent('widgetNavigation', {
        detail: { route }
    }));
}
