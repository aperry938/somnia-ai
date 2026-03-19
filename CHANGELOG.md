# Changelog

## [1.3.0] - 2026-03-19

### Store Compliance (Phase 1)
- Added Apple 3.1.2 subscription disclosure (auto-renewal, refund, manage language) to paywall
- Rewrote all 11 soundscape descriptions — removed medical claims, added "Headphones required" to binaural beats
- Added binaural beat safety warnings: epilepsy, seizure disorders, pacemakers, volume, driving
- Added "Audio & Health Safety" section to Terms of Service
- Updated Terms & Privacy dates, added third-party services disclosure (Gemini, Supabase, RevenueCat, HealthKit)
- Added Supabase cloud sync and data retention disclosures to Privacy Policy
- Removed NSUserTrackingUsageDescription from iOS Info.plist (app doesn't track)
- Aligned version to 1.2.0 across package.json, ProfilePage, and package-lock.json
- Credit-gated `generateImagePrompt()` and `generateDreamEmbedding()` — prevents unmetered API calls
- Secured AdminPage: dev-only Easter egg unlock, isSuperuser guard, production access denied

### UX Polish (Phase 2)
- Added health/safety note to onboarding "Science-Backed Sleep Tools" slide
- Binaural soundscapes show amber warning banner (epilepsy, headphones, not medical device)
- All soundscapes show volume/headphone recommendation
- Renamed "Sleep Detection" to "Dream Reminder" in all user-facing text (was misleading — it's inactivity detection)
- Added Support & Contact section to Profile (support@meridianlabs.us, meridianlabs.us)
- Added credit consumption mutex to prevent double-tap race conditions
- Updated verification test for new Sleep Ramp description format

### Server-Side Rate Limiting & Cost Tracking (Phase 3.1+3.2)
- New `api_usage` Supabase table with RLS, indexes, and PL/pgSQL rate limit functions
- New `check-rate-limit` edge function: per-user enforcement with 429 responses, fire-and-forget logging mode
- Client-side `logApiUsage()` fires after every successful Gemini API call (6 functions instrumented)
- Token estimation and model cost constants for budget monitoring
- Server-side rate limits: 60 analysis/hr, 30 imagery/hr, 120 chat/hr, 10 synthesis/hr, 100 embedding/hr

### Superuser Analytics Portal (Phase 3.3)
- `isSuperuser()` now works in production (email-list check is sufficient security)
- New `adminAnalyticsService` fetches usage data from Supabase RPC
- AdminPage upgraded with: API usage PieChart, period toggles (Day/Week/Month), cost estimate, token counts, stats table
- Production-accessible for superuser emails configured in env

### Crisis Detection Enhancement (Phase 3.4)
- Expanded from 25 to 79 crisis patterns with severity tiers (critical/high/medium)
- Added method-specific patterns: overdose, jump, hang, shoot, slit, pills, drown
- Added planning indicators: "I have a plan", "writing my note", "saying goodbye to everyone"
- Expanded crisis resources to 12 regions: US, UK, Canada, AU, NZ, IE, India, DE, FR, JP + international
- Auto-detects user locale to show local crisis resources first
- Fire-and-forget server-side logging of detections (severity + trigger count only, no dream text)

### i18n Infrastructure (Phase 3.5)
- Lightweight I18nContext with dot-notation key resolution and {{param}} interpolation
- English locale file (`locales/en.json`) with ~30 key UI strings
- BottomNav labels now use `t()` for translation
- Language card in Profile settings ("More languages coming soon")
- Ready for additional locales via dynamic import

### Native Sharing (Phase 3.6)
- New `nativeShareService` using Capacitor Share plugin on mobile, Web Share API on web, download fallback
- Updated `shareCardService` to use native sharing instead of raw navigator.share
- Added share icon per dream entry on Chronicle page
- ShareDreamModal integration with lazy loading

### Email Notifications (Phase 3.7)
- New `notification_preferences` Supabase table with RLS
- New `send-notification` edge function with HTML weekly digest email template
- New `notificationPreferencesService` for client-side preference management
- Email notification toggles in Profile (Weekly Dream Digest, Streak Break Alert) — opt-in, off by default
- Only shown to authenticated users

## [1.2.0] - 2026-03-19

### Security
- Removed API key embedding from client bundle (vite.config.ts `define` block)
- Fixed voiceIntentService to use `import.meta.env` instead of `process.env`
- Removed CDN Tailwind from CSP `script-src` policy
- Fixed 7 npm audit vulnerabilities (tar, rollup CVEs)

### Architecture
- Decomposed monolithic AppContext (985 LOC) into focused contexts:
  - `AlarmContext` — alarm CRUD and native scheduling
  - `DreamContext` — dream CRUD, import/export, sync conflict resolution
  - `SleepSessionContext` — session lifecycle, sleep entries, dream linkage
  - `PreferencesContext` — theme, volume, personalities, art style
- Backward-compatible `useAppContext()` preserved for incremental migration
- Extracted shared utilities: `useLocalStorage` hook, `generateSecureId`, type validators
- Extracted `DrumTimePicker` component from AlarmsPage (1,266 → 1,038 lines)
- Consolidated duplicate animation variants across 6 modals → import from AnimatedComponents
- Created audio service barrel (`services/audio/core.ts`) for future module splitting

### Bug Fixes
- Fixed modal body scroll prevention — all 20 modals now lock background scroll via `useModalBodyLock`
- Fixed smart wake alarm calculation failing for alarms past midnight
- Fixed sleep entry heuristic matching linking dreams to oldest instead of most recent entry
- Fixed `useKeyboardAware` setTimeout memory leak on component unmount
- Fixed `offlineQueueService` duplicate visibility change listeners on re-initialization
- Fixed Gemini JSON parse losing entire analysis on malformed response — now recovers partial data
- Re-enabled framer-motion animations on SoundscapeModal (open/close transitions)

### TypeScript
- Achieved zero `tsc --noEmit` errors (was 30+)
- Fixed missing Alarm/Dream type imports in AppContext compatibility layer
- Fixed `INPUT_LIMITS.title` → `INPUT_LIMITS.dreamTitle` in useFormValidation
- Fixed implicit `any` parameters in ChroniclePage and DreamDetailPage
- Fixed PullToRefresh props to accept standard HTML div attributes
- Fixed TagInput `aria-expanded` boolean coercion
- Cleaned up unused imports (AnimatePresence, useCallback, loadEnv)

### iOS
- Fixed `UIRequiredDeviceCapabilities` from `armv7` (32-bit, deprecated) to `arm64`

### Accessibility
- Fixed WCAG AA color contrast: all `dark:text-gray-400` → `dark:text-night-text-secondary`
- Added `aria-live="polite"` to ProfilePage biometric stat displays for screen reader announcements

### CI/CD
- Added GitHub Actions workflow (`ci.yml`): lint, type-check, test, build on push/PR

### Lint
- Achieved zero ESLint warnings (was 11)
- Removed dead re-exports from AIConsentModal
- Fixed useMemo missing dependencies in SleepSessionContext
- Suppressed intentional FastRefresh warning on AnimatedComponents (mixed exports by design)

### Build
- Removed CDN Tailwind duplication from index.html (414 → 325 lines)
- PostCSS pipeline is now sole Tailwind processor
- Inline styles on `<html>`/`<body>` for pre-Vite background color rendering
- Compressed favicon.png and logo.png (314KB → 107KB each)
