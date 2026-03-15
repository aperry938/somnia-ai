---
description: Frontend Agent - Audit Remediation Loop
---

# Frontend Agent Remediation Workflow

**Mission:** Implement validated remediation items from security and frontend audits. Focus on mobile-first improvements.

---

## VALIDATED REMEDIATION ITEMS

### Priority -1 - EXISTENTIAL (from Forensic Product Audit)

> [!CAUTION]
> **NO-GO UNTIL RESOLVED** - These are launch-blocking critical failures.

#### -1.1 Alarm Reliability [EXISTENTIAL]
**Issue:** 4 of 6 procedural alarm sounds (Prism, Aether, Bamboo, intermittently Gentle/Classic) fail to play during actual alarm triggers despite working in preview mode.
**Root Cause:** React effect cleanup race condition in `AlarmRingModal.tsx:193-214`. The 50ms cleanup guard is insufficient for complex audio synthesis chains (720-chime Prism alarm).
**Location:** `components/modals/AlarmRingModal.tsx`, `services/audioService.ts`

**BROKEN CODE:**
```tsx
// AlarmRingModal.tsx
useEffect(() => {
    playAlarmBySound(alarm.soundId || 'somnia');
    return () => {
        setTimeout(() => {
            if (!isMountedRef.current) {
                stopAlarmSound();  // ← Interrupts mid-synthesis
            }
        }, 50);  // Insufficient for Prism/Aether
    };
}, []);
```

**Remediation:**
1. **Increase cleanup delay** to 500ms minimum for complex sounds
2. **Add synthesis completion tracking** - don't cleanup until audio reports ready
3. **Implement fallback** - if procedural alarm fails, play simple sine wave
4. **Add integration tests** proving all 6 alarms ring for 30+ seconds

**Verification:**
- [ ] Test each of 6 alarms rings for 30 minutes without interruption
- [ ] Test on low-battery conditions
- [ ] Test after app was backgrounded

---

#### -1.2 Premium Bypass (Frontend Portion) [EXISTENTIAL]
**Issue:** Premium status is localStorage-based and bypassable:
```javascript
localStorage.setItem('somnia_premium_status', 'true');
location.reload(); // All premium features unlocked
```
**Location:** `services/secureSubscriptionService.ts`

**Remediation:**
Replace localStorage-based checks with server verification:

```typescript
// services/secureSubscriptionService.ts - REPLACE isPremium()
export async function verifyPremiumAccess(): Promise<{allowed: boolean; reason?: string}> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: false, reason: 'not_authenticated' };
    
    const { data, error } = await supabase.rpc('verify_ai_access', { user_id_input: user.id });
    if (error) return { allowed: false, reason: 'verification_failed' };
    
    return data;
}
```

**Note:** Backend must first create `verify_ai_access` RPC function (see backend remediation).

---

#### -1.3 Regulatory Disclaimers [HIGH - Legal Exposure]

**Issue 1: Binaural Beat Health Claims**
- App advertises specific frequencies ("2.5Hz Delta", "6Hz Theta") as functional health claims
- **Location:** `components/modals/SoundscapeModal.tsx`
- **Fix:** Add disclaimer:
```tsx
<p className="text-xs text-gray-500">
    Audio frequencies are for relaxation and entertainment only. 
    Not intended to diagnose, treat, or cure any condition.
</p>
```

**Issue 2: AI Analysis as Authoritative**
- Dream "analysis" shown without in-context disclaimer
- **Location:** `components/pages/DreamDetailPage.tsx`
- **Fix:** Add disclaimer above analysis:
```tsx
<p className="text-xs italic text-gray-400 mb-2">
    AI-generated interpretation for reflection purposes only. 
    Not psychological or medical advice.
</p>
```

**Issue 3: DEV Mode in Production**
- Verify `import.meta.env.DEV` toggle is properly guarded
- **Location:** `App.tsx`
- **Fix:** Ensure DEV toggle only renders in development
```tsx
{import.meta.env.DEV && <DevToggle />}  // Verify this is correct, not bypassed
```

---

### Priority 0 - LAUNCH POLISH (from Gold Master Audit)

> [!IMPORTANT]
> These items are from the VC Due Diligence Gold Master Audit. They separate "good app" from "magical product" and are critical for App Store approval.

#### 0.1 Permission Priming Screens [CRITICAL - 4h]
**Issue:** Notification + Microphone permissions trigger cold OS modals with no context
**Verdict:** 🔴 FAIL - Users see "Somnia wants to send notifications" without explanation
**Location:** `App.tsx`, create new `components/modals/PermissionPrimingModal.tsx`

**Remediation:**
```tsx
// Create PermissionPrimingModal.tsx
// Show BEFORE triggering OS permission modal

// For Notifications:
<PermissionPrimingModal
    icon={<BellIcon />}
    title="Sentinel Setup"
    description="Somnia needs to wake you gently and remind you to log dreams."
    benefit="Never miss a dream memory again"
    onEnable={() => Notification.requestPermission()}
/>

// For Microphone:
<PermissionPrimingModal
    icon={<MicrophoneIcon />}
    title="Voice Recording"
    description="Speak your dreams instead of typing - faster capture on waking."
    benefit="Log dreams in seconds, not minutes"
    onEnable={() => navigator.mediaDevices.getUserMedia({ audio: true })}
/>
```

**Flow:**
1. User action triggers permission need
2. Show priming modal first (explains WHY)
3. User taps "Enable" → OS modal appears
4. Higher acceptance rate, better user trust

---

#### 0.2 Modal Dismiss Patterns [CRITICAL - 3h]
**Issue:** 9 of 20 modals use X buttons (web paradigm) instead of swipe-to-dismiss (native paradigm)
**Verdict:** 🔴 WEB-LIKE - Feels like a website, not an app
**Existing Pattern:** `SwipeableBottomSheet.tsx` with proper spring physics (damping: 30, stiffness: 300)

**Modals to Convert (priority order):**
1. `SecurePaywallModal.tsx` - CRITICAL (monetization touchpoint must feel premium)
2. `LevelGuideModal.tsx` - HIGH (gamification = delight)
3. `HardwareSyncModal.tsx` - MEDIUM
4. `DreamCompareModal.tsx` - MEDIUM (core feature)
5. `AddDreamToEntryModal.tsx` - MEDIUM
6. `AddPastDreamModal.tsx` - MEDIUM
7. `AddSleepEntryModal.tsx` - MEDIUM
8. `DreamFilterModal.tsx` - LOW
9. `ExportModal.tsx` - LOW

**Remediation Pattern:**
```tsx
// Convert from:
<Dialog open={open} onClose={onClose}>
    <button onClick={onClose}>✕</button>
    {content}
</Dialog>

// Convert to:
<SwipeableBottomSheet 
    isOpen={open} 
    onClose={onClose}
    snapPoints={[0.9, 0.5]} // Full and half-height snaps
>
    {content}
</SwipeableBottomSheet>
```

---

#### 0.3 SoundscapeModal Swipe Re-enable [QUICK WIN - 1h]
**Issue:** Swipe-to-dismiss code exists but is commented out ("disabled for debugging")
**Location:** `components/modals/SoundscapeModal.tsx`
**Action:** Find and uncomment the swipe-dismiss handler. Test that audio stops on dismiss.

---

#### 0.4 Haptic Sync to Binaural Beats [HIGH - 2h]
**Issue:** 110Hz binaural beats don't trigger haptic pulses - missing "feel the frequency" immersion
**Verdict:** 🔴 MISSING - The premium audio experience lacks tactile dimension
**Location:** `services/audioService.ts`, `components/modals/SoundscapeModal.tsx`

**Remediation:**
```typescript
// Add to audioService.ts during binaural playback:
import { hapticService } from './hapticService';

// During binaural beat generation, sync haptics to LFO
const HAPTIC_SYNC_INTERVAL = 500; // 2Hz pulse rate

function startHapticSync(lfoFrequency: number) {
    const interval = 1000 / lfoFrequency;
    return setInterval(() => {
        hapticService.tick(); // Subtle pulse
    }, Math.max(interval, HAPTIC_SYNC_INTERVAL));
}

// Add to Abyssal Pressure (40Hz gamma) and Theta wave playback
// Clean up interval on audio stop
```

---

#### 0.5 Déjà Vu Narrative Synthesis [HIGH - 4h]
**Issue:** UI shows raw percentage ("85% similar") instead of poetic synthesis
**Current:** "Déjà Rêvé! 85% similar to 'Ocean Journey'"
**Required:** "You're returning to the Ocean. But this time, you're not afraid."
**Location:** `components/pages/DreamDetailPage.tsx`, AI response `dreamConnections` field

**The Problem:** The `dreamConnections` field exists in AI response schema but isn't prominently displayed. This is described as a "$2M bug" - the compound value isn't visible to users.

**Remediation:**
```tsx
// In DreamDetailPage.tsx, find Déjà Vu display section:

// BEFORE:
{dejaVu && (
    <div className="deja-vu-badge">
        Déjà Rêvé! {dejaVu.similarity}% similar to '{dejaVu.matchedDream}'
    </div>
)}

// AFTER:
{dreamConnections && (
    <div className="deja-vu-narrative">
        <span className="label">Dream Echo</span>
        <p className="narrative">{dreamConnections.synthesis}</p>
        <span className="meta">
            Echoing '{dreamConnections.matchedDream}' from {dreamConnections.daysAgo} days ago
        </span>
    </div>
)}
```

**Backend Change Required:** Ensure AI prompt generates narrative synthesis, not just percentage.

---

#### 0.6 Onboarding Audio Optimization [MEDIUM - 2h]
**Issue:** Audio starts on slide 2, could start on slide 1 at 20% volume (below autoplay threshold)
**Current Flow:** Slide 1 (read) → Slide 2 (audio) → Slide 3 → Slide 4 → Auth → Journal
**Optimized Flow:** Slide 1 (audio at 20%) → Slide 2 (interactive volume control) → Auth → Journal
**Location:** `components/onboarding/OnboardingCarousel.tsx`

**Result:** Time-to-magic drops from 10-15s to 3-5 seconds.

**Remediation:**
```tsx
// Slide 1: Start audio at 20% volume immediately
useEffect(() => {
    if (currentSlide === 0) {
        audioService.playAmbient('abyssal_pressure', { volume: 0.2 });
    }
}, [currentSlide]);

// Slide 2: Add volume slider - user interaction unlocks full audio
<Slider 
    value={volume}
    onChange={(v) => {
        setVolume(v);
        audioService.setVolume(v); // User gesture = browser allows full audio
    }}
/>
```

---

#### 0.7 Dream Oracle Shareable Artifact [MEDIUM - 6h]
**Issue:** Current share cards are basic. Missing viral "archetype reveal" mechanic.
**Location:** `components/modals/ShareDreamModal.tsx`

**Upgrade Spec:**
- Archetype classification (THE ALCHEMIST, THE SEEKER, etc.)
- AI-generated abstract art (via existing image generation)
- Mystical quote (shareable without exposing private dream content)
- QR code to `somnia.ai/oracle`

**Viral Mechanics:**
- Everyone wants to know their "type" (MBTI effect)
- Abstract art is algorithm-friendly
- QR code = direct attribution + install tracking

---

### Priority 1 - Security (from SECURITY_AUDIT_REPORT.md)

#### 1.1 Crisis Detection UI [HIGH]
**Issue:** No client-side crisis indicator when AI detects distress
**Location:** `components/modals/DreamChatModal.tsx`, `components/pages/DreamDetailPage.tsx`

**Remediation:**
- Add visual indicator when crisis keywords detected in dream
- Link to mental health resources if crisis content present
- Required keywords to detect: "suicide", "self-harm", "hurting myself", "ending it"

```tsx
// Add to dream analysis display:
{hasCrisisContent && (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-4">
        <p className="text-red-400 text-sm font-medium">
            If you're experiencing difficult thoughts, help is available 24/7:
            <a href="tel:988" className="underline ml-1">988 Suicide & Crisis Lifeline</a>
        </p>
    </div>
)}
```

---

#### 1.2 Sync Status Indicator [MEDIUM]
**Issue:** Users don't know if dreams synced when offline
**Location:** `components/shared/OfflineIndicator.tsx`

**Remediation:**
- Add pending sync count badge
- Show "X dreams pending sync" when offline dreams exist

---

### Priority 2 - Launch Readiness (from handoff_dossier.md)

#### 2.1 Aria-Labels for Icon Buttons [MEDIUM]
**Issue:** Icon buttons may lack aria-labels
**Location:** Search for `<button>` with only SVG/icon children

**Remediation:**
- Add `aria-label="Description"` to all icon-only buttons
- Use `title` attribute as secondary fallback

---

#### 2.2 PWA Icons [MEDIUM]
**Issue:** Only placeholder SVG icon, no full icon set for app stores
**Location:** `public/` folder, `manifest.json`

**Remediation:**
- Generate full icon set (192x192, 512x512 for PWA)
- Add apple-touch-icon for iOS

---

#### 2.3 Sync Status Indicator Enhancement [MEDIUM]
**Issue:** Users don't know sync queue depth when offline
**Location:** `components/shared/OfflineIndicator.tsx`

**Remediation:**
- Show "X dreams pending sync" badge when queue not empty
- Add visual feedback when sync completes

---

### Priority 3 - Polish (from FRONTEND_AGENT_LOG.md)

#### 3.1 InsightsPage Bundle Optimization [LOW]
**Finding:** InsightsPage is 389KB (Cycle 2)
**Status:** Architecture already optimized (React.lazy)
**Action:** Consider intersection observer for render-on-view (future enhancement)

#### 3.2 React.memo Audit [LOW]
**Finding:** Insight components don't use React.memo (Cycle 2)
**Action:** Add React.memo to high-frequency render components if performance issues observed

---

## ALREADY COMPLETED (No Action Needed)

✅ **Sleep Data Capture Verification** - ALL VERIFIED:
   - `logBreathingActivity()` exists in `sleepSessionService.ts:90`, called from `GuidedRelaxationModal.tsx:276`
   - `saveWakeData()` exists in `AppContext.tsx`, called from `App.tsx` `handleAwake()`
   - Duration field names verified correct
   - addDream() creates entries for all sessions

✅ ManualSleepLogModal escape key (Cycle 3)
✅ SleepEntryCard useMemo (Cycle 5)
✅ Image lazy loading (Cycle 18)
✅ Audio race condition mutex (Cycle 35)
✅ Auto-sleep mode for blue light (Cycle 35)
✅ Prestige gamification system (Cycle 35)
✅ WCAG touch targets (mobile-first-optimization branch)
✅ ARIA accessibility (mobile-first-optimization branch)

---

## EXECUTION LOOP

```
for each item in VALIDATED_ITEMS:
    1. Check if already fixed
    2. Locate files
    3. Implement minimal fix
    4. Build and verify (npm run build)
    5. Document in frontend_agent_notes.md
    6. Commit with descriptive message
```

---

## CROSS-AGENT SYNC

Before starting:
// turbo
```bash
git fetch origin
cat .agent/backend_agent_notes.md
```

Check backend notes for:
- New API contracts
- Service changes affecting UI
- Type changes in services/

---

## VALIDATION COMMANDS

// turbo
```bash
npm run build 2>&1 | tail -10
```

// turbo
```bash
npx tsc --noEmit 2>&1 | head -20
```

---

## COMMIT FORMAT

```bash
git add -A && git commit -m "fix(frontend): [component] - [brief description]

Remediates: [AUDIT_ITEM_NUMBER]"
```

---

**START WITH PRIORITY 1 ITEMS. DO NOT SKIP TO LOWER PRIORITY.**
