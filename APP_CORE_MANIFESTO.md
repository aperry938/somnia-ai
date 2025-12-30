# Somnia.ai Core Manifesto

> *The Single Source of Truth for architectural decisions, innovations, and future direction.*

---

## 0. META-PROTOCOL

- **Last Updated:** December 30, 2024 (Iteration 84 - Dream Word Cloud)
- **Evolution Authority:** Oneironaut Protocol
- **Sync Frequency:** Continuous (Infinite Mode)
- **Location:** Project root (`APP_CORE_MANIFESTO.md`)

---

## 1. CORE PRINCIPLES

### The Philosophy of Sleep Wellness

Somnia.ai transforms our relationship with sleep and the subconscious. It is not an alarm clock—it is an **intelligent ecosystem** that assists the user through the entire sleep cycle: pre-sleep relaxation → restorative rest → post-waking insight.

### The AI-Human Trust Boundary

The Oneironaut (our AI dream interpreter) operates under a **Duty of Care mandate**. If dreams contain themes of self-harm or severe distress, the AI must break protocol and recommend professional help. Entertainment never supersedes safety.

### Privacy-First Architecture

- **No backend.** All data lives in browser LocalStorage.
- **No tracking.** No analytics, no telemetry.
- **API keys are user-supplied.** We never store credentials.

### The Sanctity of the Inner World

Dreams are intimate. The product must feel like a **personal sanctuary**, not a public journal. Design decisions should evoke serenity, wisdom, and gentle insight—never gamification pressure or social comparison.

---

## 2. THE JOURNEY (User Workflow)

### Evening Flow: The Descent

```
Set Alarm → Rate Day (1-5) → Write Evening Notes → 
Choose Soundscape → Do Breathing Exercise → "Begin Sleep"
```

**Data Captured:** `pendingSleepData` stored with sound, relaxation, checklist, dayRating, dayNotes.

### Morning Flow: The Ascent

```
Alarm Rings (Progressive) → Tap "Record Dream" → 
Voice/Text Entry → Rate Sleep Quality → 
AI Analyzes Dream → View Generated Image → 
Continue Chat with Oneironaut
```

**Data Created:** `Dream` object with analysis, image, chat history, linked sleep aids.

### Reflection Flow: The Chronicle

```
Browse Dream Journal → Tap Entry → View Analysis Accordion →
"Deepen Analysis" Chat → View Full-Screen Image
```

### Insight Flow: The Patterns

```
Insights Page → Edit Biometrics → View Sleep Quality Chart →
"Dream Weaving" (synthesize themes) → "Sleep Science" (habit correlations)
```

---

## 3. KEY INNOVATIONS (Implemented)

### 3.1 The Oneironaut Persona

A consistent AI character engineered for dream interpretation. Synthesizes:
- **Freud/Jung psychology** (symbols, archetypes)
- **Campbell mythology** (hero's journey, threshold guardians)
- **Somatic wisdom** (body-encoded trauma, van der Kolk)

**Implementation:** `services/geminiService.ts` → `createInitialAnalysisPrompt()`

### 3.2 Personalized AI via Biometrics

The Oneironaut now receives user profile data:
- Age → life stage interpretation
- Gender → identity-aware analysis
- Average Sleep → chronic fatigue context

**Implementation:** `analyzeDream(dreamText, sleepAids, biometrics)`

### 3.3 Progressive Alarm Sound

Web Audio API oscillator that ramps from 300Hz → 800Hz over 30 seconds, with exponential volume increase. Wakes at minimum necessary intensity.

**Implementation:** `services/audioService.ts` → `playProgressiveAlarm()`

### 3.4 Programmatic Soundscapes

No audio files for noise generation. White/Pink/Brown noise synthesized using mathematical transforms on random buffers. Binaural beats via stereo oscillator pairs.

**Implementation:** `audioService.ts` → `createNoiseNode()`, `createBinauralNode()`

### 3.5 Dream-to-Image Pipeline

Every dream generates a unique artistic visualization using Gemini's image generation with a Dalí/Varo-inspired prompt template.

**Implementation:** `geminiService.ts` → `generateDreamImage()`

### 3.6 Chrono-Contextual Theme

Day/Night theme auto-switches based on clock (6AM-7PM = day). Manual override available (Auto/Day/Night cycle).

**Implementation:** `hooks/useClock.ts` + `contexts/AppContext.tsx` → `themeOverride` state

### 3.7 Smart Snooze System

5-minute snooze that actually works. Uses setTimeout to re-trigger the alarm after delay, not just dismiss.

**Implementation:** `hooks/useAlarmManager.ts` → `snooze()` with `snoozeTimeoutRef`

### 3.8 Soundscape Duration Tracking

Tracks how long each soundscape is used per session. Duration data fed into AI Sleep Science analysis for correlation insights.

**Implementation:** `SleepPage.tsx` → `soundStartTime`, `totalSoundDuration` states

### 3.9 Dream Tagging System

User-defined tags for dream categorization with autocomplete suggestions. Tags display in Chronicle cards for pattern recognition.

**Implementation:** `components/shared/TagInput.tsx` + `Dream.tags` field

### 3.10 Error Boundary Safety Net

Graceful error handling with retry capability. AI-specific boundary with contextual messaging.

**Implementation:** `components/shared/ErrorBoundary.tsx` wrapping `<App />`

### 3.11 Chronicle Discovery System

Full-text search across dream titles, content, and tags. Clickable tag filter pills for rapid categorization. Results update in real-time.

**Implementation:** `components/pages/ChroniclePage.tsx` → `searchQuery`, `activeTagFilter` states

### 3.12 PWA Installability

Progressive Web App configuration enables "Add to Home Screen" on mobile. Includes manifest, theme colors, and Apple-specific meta tags for native app feel.

**Implementation:** `public/manifest.json` + `index.html` meta tags

### 3.13 Safe Area Support

CSS custom properties handle notched devices (iPhone X+, Android with camera cutouts). BottomNav respects home indicator area.

**Implementation:** `index.html` → CSS env(safe-area-inset-*) + `.safe-area-*` classes

### 3.14 Related Dreams (Dream Threading)

Automatic discovery of related dreams via shared tags. Shows up to 3 related entries when viewing a dream.

**Implementation:** `DreamDetailPage.tsx` → filters dreams by shared `tags[]`

### 3.15 AI Coach Memory

Sleep coach conversations persist across sessions. Saves last 20 messages with "Clear History" option.

**Implementation:** `AICoachModal.tsx` → LocalStorage key `somnia_coach_history`

### 3.16 Dream Image Art Styles

5 configurable art style presets for dream visualization: Surrealist, Watercolor, Anime, Cosmic, Vintage Film.

**Implementation:** `geminiService.ts` → `DREAM_ART_STYLES` + `DreamArtStyle` type

### 3.17 Keyboard Navigation

Power-user shortcuts: 1-4 keys navigate to pages. Modals close with Escape.

**Implementation:** `App.tsx` → `handleKeyNav` effect

### 3.18 Accessibility Focus Styles

Focus-visible outlines for keyboard navigation. Skip-link for screen readers.

**Implementation:** `index.html` → CSS `:focus-visible` + `.skip-link`

### 3.19 Dream Symbol Dictionary

27 common dream symbols with psychological interpretations. Automatic detection from dream text.

**Implementation:** `constants/dreamSymbols.ts` → `findDreamSymbols()` function, displayed in DreamDetailPage

### 3.20 Lucid Dreaming Toolkit

Reality checks (7 techniques) and lucid induction methods (MILD, WBTB, WILD). Daily rotating reality check prompt.

**Implementation:** `constants/lucidDreaming.ts` + Sleep page section

### 3.21 AI Title Generation

Standalone function to generate evocative dream titles. Regenerate button in DreamDetailPage.

**Implementation:** `geminiService.ts` → `generateDreamTitle()` + refresh button UI

### 3.22 Dream Statistics

Word and character count displayed after dream text for tracking recall improvement over time.

**Implementation:** `DreamDetailPage.tsx` → inline word/char count

### 3.23 Advanced Code Splitting

4 lazy-loaded chunks reduce initial bundle from 539KB to 223KB (59% reduction).

**Lazy Chunks:**
- ChroniclePage: 5.5KB
- DreamDetailPage: 21KB  
- SleepPage: 25KB
- InsightsPage: 347KB (Recharts)

**Implementation:** `App.tsx` → `React.lazy()` imports

### 3.24 Skip Link Accessibility

Hidden link appears on Tab focus for screen reader users to skip navigation.

**Implementation:** `App.tsx` + CSS `.skip-link` class

### 3.25 Open Graph Social Sharing

Full OG and Twitter card meta tags for rich social media previews.

**Implementation:** `index.html` → og:title, og:description, twitter:card

### 3.26 Toast Notification System

Context-based toast notifications for user feedback. Auto-dismiss after 3 seconds.

**Implementation:** `components/shared/Toast.tsx` → ToastProvider + useToast hook

### 3.27 Data Portability

Full import/export cycle for dream journal backup. JSON export with date-stamped filename. Import handles ID collision by reassigning IDs.

**Implementation:** `exportService.ts` → `exportDreamsAsJSON()` + `importDreamsFromJSON()`

### 3.28 Dream Deletion

Delete dreams with native browser confirmation. Returns to Chronicle after deletion with toast feedback.

**Implementation:** `AppContext` → `deleteDream()` + `DreamDetailPage` delete button

### 3.29 Navigation Badge

Chronicle nav item shows dream count badge. Capped at 99+ for visual overflow.

**Implementation:** `BottomNav.tsx` → conditional badge render

### 3.30 Smart Tag Sorting

Tags in Chronicle filter bar sorted by frequency (most used first) for better discovery.

**Implementation:** `ChroniclePage.tsx` → Map-based tag counting + sort

### 3.31 Recurring Pattern Detection

Automatic detection of themes appearing in 2+ dreams. 30+ common dream keywords tracked.

**Implementation:** `constants/dreamPatterns.ts` → `detectRecurringPatterns()`

### 3.32 Pattern Insights Display

Recurring patterns shown as pills with occurrence counts in Insights page.

**Implementation:** `InsightsPage.tsx` → patterns section

### 3.33 Keyboard Help Modal

Press "?" to show all keyboard shortcuts. Also accessible via "?" button in nav.

**Implementation:** `components/shared/KeyboardHelp.tsx`

### 3.34 Time-Based Dream Grouping

Chronicle organizes dreams into "This Week", "Earlier This Month", and "Older" sections.

**Implementation:** `ChroniclePage.tsx` → `groupedDreams` useMemo

### 3.35 Weekly Summary Digest

A rolling 7-day dashboard card showing dream count, average sleep quality, and top recurring themes with week-over-week trend indicators.

**Implementation:** `components/insights/WeeklyDigest.tsx`

### 3.36 Comprehensive Service Documentation

 rigorous JSDoc documentation for all core services (`geminiService`, `audioService`, `exportService`) and hooks to ensure long-term maintainability.

**Implementation:** `services/*.ts`, `hooks/*.ts`

### 3.37 Sleep Quality Prediction Engine

A predictive algorithm that analyzes historical correlations between sleep habits (day rating, soundscapes) and sleep quality to forecast tonight's rest quality before the user goes to sleep.

**Implementation:** `services/sleepPredictionService.ts`, `SleepPage.tsx`

### 3.38 Local Notifications (Reality Checks)

Periodic notifications (every 2-4 hours) prompting users to perform a "Reality Check", a key technique for inducing lucid dreams.

**Implementation:** `hooks/useRealityChecks.ts` + Notification API

### 3.39 Wake Window Visualization (Sleep Monitor)

Visualizes sleep movement data using the device accelerometer. SVG-based graph shows magnitude of movement during sleep sessions.

**Implementation:** `components/WakeWindowViz.tsx` + `hooks/useWakeWindow.ts`

### 3.40 Offline Mode (PWA Resilience)

Full offline capability via VitePWA. Service Worker caches app shell. OfflineIndicator UI notifies user of connection status changes.

**Implementation:** `vite-plugin-pwa` config + `components/OfflineIndicator.tsx`

### 3.41 Social Dreaming (Web Share)

Native sharing integration allows users to share dream text via system share sheet (Messages, WhatsApp, etc.).

**Implementation:** `DreamDetailPage.tsx` → `navigator.share()`

### 3.42 Premium Feature Gating UI

Complete monetization circuit with visual PRO indicators and paywall integration. Premium features (Dream Weaving, Sleep Science, Binaural Soundscapes) now display PRO badges for free users and consume AI credits on use.

**Implementation:**
- `InsightsPage.tsx` → `PremiumBadge` wrapper + credit consumption in handlers
- `SleepPage.tsx` → Conditional `PremiumBadge` on binaural soundscape cards

### 3.43 AI Coach Credit Gating

AI Sleep Coach now consumes credits for free users. Initial greeting is free, but each message uses 1 credit. Shows remaining credits in header and graceful exhaustion message.

**Implementation:** `AICoachModal.tsx` → credit check in `handleSend`, `getRemainingCredits()` indicator

### 3.44 Achievement System

Gamification layer with 6 achievements tracking milestones (First Dream, 10/50 Dreams, Week/Month Streak, Lucid Tagger). Earned achievements persist in localStorage and display in a badge grid on InsightsPage.

**Implementation:**
- `services/achievementService.ts` → check, earn, and persist achievements
- `components/insights/AchievementsCard.tsx` → Visual badge grid

### 3.45 Streak Notifications

Local push notifications remind users to maintain their dream logging streak. Fires once per day if user has an active streak but hasn't logged a dream today.

**Implementation:** `hooks/useStreakNotification.ts` → localStorage-based once-per-day check

### 3.46 Dreamer Persona Selector

Users can choose from 3 AI personas for dream analysis: The Oneironaut (mystical synthesis), Shadow Walker (Jungian archetypes), or Dr. REM (neuroscience). Persisted in `analysisPersonality` localStorage.

**Implementation:**
- `types.ts` → `AnalysisPersonality` type
- `geminiService.ts` → Persona-specific prompt generation
- `DreamDetailPage.tsx` → Pre-analysis persona selector UI

### 3.47 Dream Comparison Tool

Side-by-side comparison of two dreams with dropdown selectors, image/metadata/analysis preview, and tag diff visualization (shared/unique left/right).

**Implementation:** `components/modals/DreamCompareModal.tsx` → integrated in InsightsPage

### 3.48 Night Mode Auto-Switch

Auto-theme based on sunset/sunrise times using geolocation + sunrise-sunset.org API. Falls back to 7am-7pm if geolocation unavailable. Results cached in localStorage for 12 hours.

**Implementation:** `hooks/useSunTimes.ts` → integrated into `useTheme.ts`

---






## 4. MECHANISMS (Technical Engine)

### State Management

```
AppContext.tsx
├── alarms: Alarm[]
├── dreams: Dream[]
├── biometrics: Biometrics
├── activeSleepAids: SleepAids
└── pendingSleepData: SleepAids | null
```

All state persists to LocalStorage via `useLocalStorage` hook.

### AI Integration Pattern

```typescript
// All AI calls follow this pattern:
const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', // or gemini-2.5-pro for synthesis
    contents: [{ parts: [{ text: prompt }] }],
    config: {
        responseMimeType: "application/json",
        responseSchema: { /* typed schema */ }
    }
});
```

### Audio Lifecycle

```typescript
// Sleep sounds are exclusive - starting one stops others
playSleepSound() → stopAlarmSound() first
playProgressiveAlarm() → stopSleepSound() first

// Fade-in/out prevents audio pops
gain.linearRampToValueAtTime(0.5, now + 2); // 2s fade-in
```

### Critical Files

| File | Responsibility |
|------|----------------|
| `services/geminiService.ts` | All AI prompts and API calls |
| `services/audioService.ts` | Web Audio synthesis engine |
| `contexts/AppContext.tsx` | Global state, LocalStorage sync |
| `hooks/useAlarmManager.ts` | Alarm trigger detection |
| `hooks/useClock.ts` | Time display, theme switching |
| `components/pages/DreamDetailPage.tsx` | Analysis orchestration |

---

## 5. RATIONALE & DEFENSE

### Why LocalStorage Instead of a Backend?

Privacy. Dreams are the most intimate data a person can share. By keeping everything client-side, we eliminate breach risk and server costs. Trade-off: No cross-device sync.

### Why Tailwind CDN Instead of PostCSS?

Rapid prototyping. The CDN approach allows extensive theming without build tooling overhead. Trade-off: Larger initial load, cannot tree-shake unused classes.

### Why Gemini 2.5 Flash vs Pro?

Flash for individual dream analysis (speed). Pro for multi-dream synthesis (depth). Cost/quality trade-off optimized per use case.

### Why No React Router?

Single-page app with simple `currentPage` state. Adding a router would be premature complexity for 5 pages.

---

## 6. THE DREAM VAULT (Future Ideas)

### ✅ Completed (Iterations 1-75)

- [x] **Manual Theme Toggle** — Cycles Auto/Day/Night from BottomNav
- [x] **Snooze Duration Logic** — 5-minute re-trigger via setTimeout
- [x] **Error Boundaries** — Top-level + AI-specific boundaries
- [x] **Loading States** — AnalysisLoading, ImageGenerationLoading, SkeletonChart
- [x] **Soundscape → Quality Correlation** — Duration tracking + AI analysis
- [x] **Dream Tags** — TagInput component with 20 suggestions
- [x] **GitHub Pages Deployment** — Automated CI/CD workflow
- [x] **Wake Window Detection** — Accelerometer-based movement tracking (3.39)
- [x] **Social Dreaming** — Web Share API integration (3.41)
- [x] **Export to PDF** — Print friendly format (3.27 enhanced)
- [x] **Offline Mode** — PWA Service Worker + UI Indicators (3.40)
- [x] **Voice Journaling** — useSpeechRecognition hook in DreamScribeModal
- [x] **Dream Threading** — Related dreams via shared tags in DreamDetailPage (3.14)
- [x] **AI Sleep Coach Memory** — Persistent history in AICoachModal (3.15)
- [x] **Premium Feature Gating** — PremiumBadge UI for monetization (3.42)
- [x] **AI Coach Premium Gating** — Gate AI Sleep Coach behind credits/premium
- [x] **Achievement System** — 6 achievements with badge UI in InsightsPage (3.44)
- [x] **Streak Notifications** — Local push notifications for streak maintenance (3.45)
- [x] **Tag Filtering** — Advanced filter UX in Chronicle with search + tag pills
- [x] **Dreamer Persona Selector** — Choose AI personality for dream analysis (3.46)
- [x] **Sleep Quality Predictions** — Predict quality based on habits in SleepPage
- [x] **Dream Comparison Tool** — Compare two dreams side-by-side (3.47)
- [x] **Night Mode Auto-Switch** — Auto-theme based on sunset/sunrise (3.48)
- [x] **Dream Calendar View** — GitHub-style heatmap in InsightsPage (3.49)
- [x] **Dream Word Cloud** — Visualize recurring words with frequency sizing (3.50)

### High Priority (Remaining)

- [ ] **Weekly Dream Digest** — Summarized email of weekly dreams
- [ ] **AI Dream Narrator** — TTS narration of dream text and analysis

### Exploratory

- [ ] **Anonymous Global Feed** — True backend social dreaming
- [ ] **Wearable Integration** — HealthKit/Google Fit sync

### Pruned Concepts
- *Dream Search* promoted to Implemented (3.11)
- *Mobile Polish* promoted to Ongoing Maintenance

---

## Appendix: Data Schemas

```typescript
interface Dream {
    id: number;
    timestamp: string;
    dreamText: string;
    sleepQuality: number | null;
    title: string;
    imageUrl: string | null;
    aiAnalysis: DreamAnalysis | null;
    chatHistory: ChatMessage[];
    sleepAids?: SleepAids;
    tags?: string[];  // NEW: User-defined categorization
}

interface Biometrics {
    age: number | null;
    gender: string;
    avgSleep: number | null;
}

interface SleepAids {
    sound?: string;
    soundDuration?: number;  // NEW: Minutes of soundscape usage
    relaxation?: string;
    checklist?: string[];
    dayRating?: number | null;
    dayNotes?: string;
}
```

---

*End of Manifesto. This document evolves with the product.*
