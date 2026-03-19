# Changelog

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
