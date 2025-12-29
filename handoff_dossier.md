# SOMNIA.AI HANDOFF DOSSIER
## Post-Iteration 35 Audit

---

## 1. THE MISSION BRIEF

### Objective
Evolve Somnia.ai from a basic dream journal into a comprehensive sleep wellness platform through 35 autonomous iterations. Focus areas include:
- AI-powered dream analysis and visualization
- Sleep preparation rituals (soundscapes, breathing, relaxation)
- Gamification elements (streaks, levels, achievements)
- Lucid dreaming education and tools
- Mobile-first PWA experience

### Success Criteria
✅ TypeScript compiles with 0 errors
✅ Production build succeeds
✅ All major user journeys functional
✅ AI features (analysis, image, title) operational
✅ LocalStorage persistence working
✅ Mobile/PWA meta tags configured

---

## 2. ARCHITECTURAL DEFENSE

### Defense of Complexity

**The Oneironaut AI Persona** is deliberately complex. The system prompt in `geminiService.ts` is 600+ words because:
- Dreams require nuanced interpretation, not generic responses
- The persona must feel consistent across analysis, chat, and synthesis
- Ethical guardrails prevent harmful interpretations

**Do NOT simplify the AI prompts.** They are carefully calibrated.

**Web Audio Synthesis** uses raw oscillators and noise generators rather than audio files because:
- Zero network latency for sleep sounds
- Infinite variation in soundscapes
- Smaller bundle size than audio assets

### Trade-offs Made

| Decision | Rationale |
|----------|-----------|
| LocalStorage over backend | Privacy-first, zero signup friction |
| Tailwind CDN over build | Faster dev iteration, acceptable for PWA |
| React 19 with lazy() | Bleeding edge but stable, enables code splitting |
| Gemini Flash over Pro | Speed over depth for most operations |

---

## 3. THE ECOSYSTEM MAP

### Critical Files (Load-Bearing)

| File | Responsibility |
|------|---------------|
| `services/geminiService.ts` | ALL AI operations - prompts, analysis, image gen, title gen, chat |
| `services/audioService.ts` | Web Audio synthesis - sleep sounds, breath sounds, alarm |
| `contexts/AppContext.tsx` | Central state - dreams, alarms, biometrics, sleep aids |
| `hooks/useAlarmManager.ts` | Alarm scheduling, snooze logic, trigger detection |
| `hooks/useClock.ts` | Time management, day/night theming |
| `components/pages/DreamDetailPage.tsx` | Complex page - analysis, tagging, symbols, chat, image |

### State Flow

```
User Action
    ↓
React Component (useState)
    ↓
AppContext (global state via useContext)
    ↓
LocalStorage (persistence via useLocalStorage hook)
```

### Data Persistence Keys

| Key | Data |
|-----|------|
| `somnia_alarms` | Alarm[] |
| `somnia_dreams` | Dream[] |
| `somnia_biometrics` | Biometrics |
| `somnia_coach_history` | ChatMessage[] (last 20) |

---

## 4. THE HONESTY PROTOCOL (Gray Zones)

### High Concern

| Area | Issue | Risk Level |
|------|-------|------------|
| Bundle Size | Main chunk 530KB+ | Medium - affects mobile load time |
| No Test Coverage | Zero automated tests | High - regression risk |
| Gemini Rate Limits | No retry logic with backoff | Medium - user frustration |

### Medium Concern

| Area | Issue |
|------|-------|
| Dream Symbol Matching | Simple keyword match, could miss context |
| Snooze State | Cleared on page refresh |
| PWA Icons | Only placeholder SVG, no full icon set |

### Low Concern

| Area | Note |
|------|------|
| Unused dreamSymbols import | DreamSymbol type imported but used in useMemo correctly |
| CSS Tailwind CDN | Acceptable for PWA, not ideal for production |

---

## 5. AUDIT DIRECTIVES (The "Red Team" Mandate)

Claude, you must execute these commands:

### 5.1 Global Ecosystem Scan
- Verify all imports are used
- Check for orphaned exports
- Ensure no circular dependencies
- Validate all AI functions are called somewhere

### 5.2 Consistency & Hygiene
- Check naming conventions (camelCase components, UPPER_SNAKE constants)
- Remove unused variables
- Ensure consistent error handling patterns
- Verify all async functions have try/catch

### 5.3 Mandatory Remediation
- Remove any console.log statements (keep console.error in catch blocks)
- Fix any TypeScript warnings even with noEmit passing
- Add missing aria-labels to icon buttons
- Verify all buttons have type="button" where needed

### 5.4 Expansion Assessment
- Could more components be lazy-loaded?
- Are there memoization opportunities missed?
- Should any hooks be extracted?

### 5.5 Emoji Scan
- Search entire codebase for emoji characters
- Replace with consistent SVG icons
- Exception: "🔥" in streak display may remain as intentional gamification

---

## 6. CONTEXTUAL CONSTRAINTS

- **Vite 6.x** - Use import.meta.env, not process.env (except for API keys)
- **React 19** - Can use new features like use() hook if needed
- **Gemini API** - Models: gemini-2.5-flash (fast), gemini-2.5-pro (synthesis), gemini-2.5-flash-image (vision)
- **No Backend** - All data in LocalStorage only
- **Port 3001** - Dev server runs on 3001, not 3000
- **TypeScript Strict** - Must pass `npx tsc --noEmit`

---

## INSTRUCTIONS FOR THE AUDITOR (CLAUDE):

### Upon Finishing:
1. **Health Rating (0-100):** Rate stability, cleanliness, and architecture.
2. **Return Handoff:** Generate a summary detailing exactly what was fixed, optimized, or changed.

### Rating Breakdown:
- TypeScript Errors: /25
- Build Status: /25
- Code Hygiene: /20
- Architecture: /20
- Documentation: /10

---

## POST-HANDOFF PROCEDURE (For Antigravity):

When completing Claude's audit:
1. Verify the integrity of all fixes
2. Run `npx tsc --noEmit` and `npm run build`
3. Browser test if critical changes made
4. Commit with "Post-audit: [Score]/100 - [Summary]"
5. Push to remote if configured
6. Update task.md with audit results
7. Resume `/somnia-loop` immediately
