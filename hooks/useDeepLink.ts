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

        // Handle deep links from Capacitor App plugin
        const handleAppUrlOpen = (event: URLOpenListenerEvent) => {
            logger.log('[DeepLink] URL opened:', event.url);

            try {
                const url = new URL(event.url);
                const route = url.pathname || url.host; // somnia://alarm or somnia:///alarm
                handleRoute(route);
            } catch (e) {
                // Handle simple scheme URLs like somnia:alarm
                const path = event.url.replace('somnia://', '').replace('somnia:', '');
                handleRoute(path);
            }
        };

        // Listen for app URL opens
        CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen);

        // Handle iOS Quick Actions (custom event from AppDelegate)
        const handleAppShortcut = (event: CustomEvent<{ route: string }>) => {
            logger.log('[DeepLink] App shortcut triggered:', event.detail);
            handleRoute(event.detail.route);
        };

        window.addEventListener('appShortcut', handleAppShortcut as EventListener);

        // Handle Android widget navigation (route extra from intent)
        const handleWidgetNav = (event: CustomEvent<{ route: string }>) => {
            logger.log('[DeepLink] Widget navigation:', event.detail);
            handleRoute(event.detail.route);
        };

        window.addEventListener('widgetNavigation', handleWidgetNav as EventListener);

        // Check for initial URL (app launched via deep link)
        CapacitorApp.getLaunchUrl().then((result) => {
            if (result?.url) {
                logger.log('[DeepLink] App launched with URL:', result.url);
                handleAppUrlOpen({ url: result.url });
            }
        });

        return () => {
            CapacitorApp.removeAllListeners();
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
