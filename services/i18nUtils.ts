/**
 * Internationalization (i18n) Utilities for Somnia AI
 *
 * This file provides locale-aware formatting utilities for dates, times, numbers,
 * and relative time. When implementing full i18n, these functions should be used
 * throughout the app to ensure consistent locale support.
 *
 * TODO: When implementing full i18n:
 * 1. Install a i18n library (e.g., react-intl, i18next)
 * 2. Extract all hardcoded strings into translation files
 * 3. Add locale detection and switching
 * 4. Update all components to use translated strings
 */

// Get the user's locale, falling back to 'en-US'
export const getUserLocale = (): string => {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
};

/**
 * Format a date using the user's locale
 * @param date - Date object or ISO string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Locale-formatted date string
 *
 * @example
 * formatDate(new Date(), { month: 'long', day: 'numeric' }) // "January 22"
 */
export const formatDate = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(getUserLocale(), options);
};

/**
 * Format a time using the user's locale
 * Automatically uses 12-hour or 24-hour format based on locale
 *
 * @param date - Date object or ISO string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Locale-formatted time string
 *
 * @example
 * formatTime(new Date()) // "2:30 PM" or "14:30" depending on locale
 */
export const formatTime = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString(getUserLocale(), options);
};

/**
 * Format a date and time using the user's locale
 *
 * @param date - Date object or ISO string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Locale-formatted date and time string
 */
export const formatDateTime = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString(getUserLocale(), options);
};

/**
 * Format a number using the user's locale
 * Handles decimal separators (. vs ,) correctly
 *
 * @param value - Number to format
 * @param options - Intl.NumberFormatOptions
 * @returns Locale-formatted number string
 *
 * @example
 * formatNumber(1234.56) // "1,234.56" (en-US) or "1.234,56" (de-DE)
 */
export const formatNumber = (
  value: number,
  options: Intl.NumberFormatOptions = {}
): string => {
  return value.toLocaleString(getUserLocale(), options);
};

/**
 * Format a percentage using the user's locale
 *
 * @param value - Number to format (0.5 = 50%)
 * @param options - Intl.NumberFormatOptions
 * @returns Locale-formatted percentage string
 *
 * @example
 * formatPercent(0.5) // "50%" (en-US)
 */
export const formatPercent = (
  value: number,
  options: Intl.NumberFormatOptions = {}
): string => {
  return value.toLocaleString(getUserLocale(), {
    style: 'percent',
    ...options,
  });
};

/**
 * Format a relative time string (e.g., "2 hours ago", "in 3 days")
 * Uses Intl.RelativeTimeFormat for proper localization
 *
 * @param date - Date to compare against now
 * @param style - 'long' | 'short' | 'narrow'
 * @returns Locale-formatted relative time string
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1 hour ago"
 */
export const formatRelativeTime = (
  date: Date | string,
  style: 'long' | 'short' | 'narrow' = 'long'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  const rtf = new Intl.RelativeTimeFormat(getUserLocale(), { style });

  if (Math.abs(diffSecs) < 60) {
    return rtf.format(diffSecs, 'second');
  } else if (Math.abs(diffMins) < 60) {
    return rtf.format(diffMins, 'minute');
  } else if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  } else if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, 'day');
  } else if (Math.abs(diffWeeks) < 4) {
    return rtf.format(diffWeeks, 'week');
  } else if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, 'month');
  } else {
    return rtf.format(diffYears, 'year');
  }
};

/**
 * Pluralize a noun based on count
 * This is a simple English-only implementation.
 * For full i18n, use ICU MessageFormat or similar.
 *
 * TODO: Replace with proper i18n pluralization (e.g., react-intl's FormattedPlural)
 * Different languages have different plural rules:
 * - English: 1 item, 2 items
 * - Russian: 1 item, 2-4 items, 5+ items
 * - Arabic: singular, dual, plural (3-10), many (11+)
 *
 * @param count - Number of items
 * @param singular - Singular form
 * @param plural - Plural form (optional, defaults to singular + 's')
 * @returns Pluralized string with count
 *
 * @example
 * pluralize(1, 'dream') // "1 dream"
 * pluralize(5, 'dream') // "5 dreams"
 * pluralize(2, 'entry', 'entries') // "2 entries"
 */
export const pluralize = (
  count: number,
  singular: string,
  plural?: string
): string => {
  // TODO: i18n - Replace with proper pluralization library
  // This simple implementation only works for English
  const pluralForm = plural || singular + 's';
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
};

/**
 * Format duration in a human-readable way
 *
 * @param seconds - Duration in seconds
 * @param style - 'full' | 'short'
 * @returns Formatted duration string
 *
 * @example
 * formatDuration(3661) // "1h 1m 1s" or "1 hour 1 minute"
 */
export const formatDuration = (
  seconds: number,
  style: 'full' | 'short' = 'short'
): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (style === 'short') {
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
  }

  // Full format - would need i18n
  // TODO: i18n - Use proper pluralization
  const parts = [];
  if (hours > 0) parts.push(pluralize(hours, 'hour'));
  if (minutes > 0) parts.push(pluralize(minutes, 'minute'));
  if (secs > 0 || parts.length === 0) parts.push(pluralize(secs, 'second'));
  return parts.join(' ');
};

/**
 * Check if the current locale uses RTL (Right-to-Left) text direction
 *
 * @returns true if RTL locale
 */
export const isRTLLocale = (): boolean => {
  const locale = getUserLocale();
  const rtlLocales = ['ar', 'he', 'fa', 'ur', 'yi', 'ps', 'sd', 'ug'];
  const lang = locale.split('-')[0]?.toLowerCase() || '';
  return rtlLocales.includes(lang);
};

/**
 * Get text direction for current locale
 *
 * @returns 'rtl' or 'ltr'
 */
export const getTextDirection = (): 'rtl' | 'ltr' => {
  return isRTLLocale() ? 'rtl' : 'ltr';
};

// ============================================================================
// I18N STRING KEYS
// ============================================================================
// Below are placeholder keys for strings that should be extracted for translation
// When implementing full i18n, replace hardcoded strings with these keys

/**
 * Common UI strings that need translation
 * TODO: Extract to translation files (en.json, es.json, etc.)
 */
export const I18N_KEYS = {
  // Navigation
  NAV_ALARMS: 'nav.alarms',
  NAV_SLEEP: 'nav.sleep',
  NAV_CHRONICLE: 'nav.chronicle',
  NAV_INSIGHTS: 'nav.insights',
  NAV_PROFILE: 'nav.profile',

  // Common actions
  ACTION_SAVE: 'action.save',
  ACTION_CANCEL: 'action.cancel',
  ACTION_DELETE: 'action.delete',
  ACTION_EDIT: 'action.edit',
  ACTION_ADD: 'action.add',
  ACTION_CLOSE: 'action.close',
  ACTION_RETRY: 'action.retry',
  ACTION_DONE: 'action.done',
  ACTION_SKIP: 'action.skip',

  // Alarms
  ALARM_SET: 'alarm.set',
  ALARM_EDIT: 'alarm.edit',
  ALARM_DELETE: 'alarm.delete',
  ALARM_RING_ONCE: 'alarm.ringOnce',
  ALARM_EVERY_DAY: 'alarm.everyDay',
  ALARM_WEEKDAYS: 'alarm.weekdays',
  ALARM_WEEKENDS: 'alarm.weekends',

  // Sleep
  SLEEP_QUALITY: 'sleep.quality',
  SLEEP_TRACKED: 'sleep.tracked',
  SLEEP_PREPARATION: 'sleep.preparation',
  SLEEP_GATEWAY: 'sleep.gateway',

  // Dreams
  DREAM_RECORD: 'dream.record',
  DREAM_UNTITLED: 'dream.untitled',
  DREAM_NO_DREAMS: 'dream.noDreams',
  DREAM_ADD: 'dream.add',
  DREAM_COUNT: 'dream.count', // {count} dream(s)

  // Moods
  MOOD_JOYFUL: 'mood.joyful',
  MOOD_PEACEFUL: 'mood.peaceful',
  MOOD_NEUTRAL: 'mood.neutral',
  MOOD_ANXIOUS: 'mood.anxious',
  MOOD_SAD: 'mood.sad',
  MOOD_FEARFUL: 'mood.fearful',
  MOOD_CONFUSED: 'mood.confused',
  MOOD_NIGHTMARE: 'mood.nightmare',

  // Time periods
  TIME_MORNING: 'time.morning',
  TIME_AFTERNOON: 'time.afternoon',
  TIME_EVENING: 'time.evening',
  TIME_NIGHT: 'time.night',

  // Days of week (abbreviated)
  DAY_SUN: 'day.sun',
  DAY_MON: 'day.mon',
  DAY_TUE: 'day.tue',
  DAY_WED: 'day.wed',
  DAY_THU: 'day.thu',
  DAY_FRI: 'day.fri',
  DAY_SAT: 'day.sat',

  // Errors
  ERROR_GENERIC: 'error.generic',
  ERROR_OFFLINE: 'error.offline',
  ERROR_LOADING: 'error.loading',

  // Success messages
  SUCCESS_SAVED: 'success.saved',
  SUCCESS_DELETED: 'success.deleted',
} as const;

// Type for i18n keys
export type I18nKey = (typeof I18N_KEYS)[keyof typeof I18N_KEYS];
