---
description: Backend Agent - Audit Remediation Loop
---

# Backend Agent Remediation Workflow

**Mission:** Implement validated remediation items from security audit. Focus on data integrity and security.

---

## VALIDATED REMEDIATION ITEMS

### Priority -1 - EXISTENTIAL (from Forensic Product Audit)

> [!CAUTION]
> **NO-GO UNTIL RESOLVED** - This is a launch-blocking critical failure.

#### -1.1 Server-Side Subscription Verification [EXISTENTIAL]
**Issue:** Premium status validation is entirely client-side. Bypass in 30 seconds:
```javascript
localStorage.setItem('somnia_premium_status', 'true');
location.reload(); // All premium features unlocked permanently
```

**Architecture Flaws:**
1. `isPremium()` in `secureSubscriptionService.ts:163` returns cached localStorage value
2. AI credit system in localStorage (`somnia_ai_credits`) - no backend validation
3. No server-side verification before Gemini API calls (free AI, you pay)
4. DEV mode toggle may leak to production
5. Superuser email list in env vars = attack surface

**Remediation - Create Server-Side Entitlements:**

```sql
-- New migration: subscription_verification.sql
CREATE TABLE user_subscriptions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'lifetime')),
    expires_at TIMESTAMPTZ,
    ai_credits_remaining INTEGER DEFAULT 5,
    ai_credits_reset_at DATE,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can only read their own subscription
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- RPC to verify and deduct credits
CREATE OR REPLACE FUNCTION verify_ai_access(user_id_input UUID)
RETURNS JSON AS $$
DECLARE
    sub RECORD;
BEGIN
    SELECT * INTO sub FROM user_subscriptions WHERE user_id = user_id_input;
    
    IF sub IS NULL THEN
        RETURN json_build_object('allowed', false, 'reason', 'no_subscription');
    END IF;
    
    IF sub.tier = 'premium' AND (sub.expires_at IS NULL OR sub.expires_at > NOW()) THEN
        RETURN json_build_object('allowed', true, 'tier', 'premium');
    END IF;
    
    IF sub.ai_credits_remaining > 0 THEN
        UPDATE user_subscriptions 
        SET ai_credits_remaining = ai_credits_remaining - 1
        WHERE user_id = user_id_input;
        RETURN json_build_object('allowed', true, 'tier', 'free', 'credits_remaining', sub.ai_credits_remaining - 1);
    END IF;
    
    RETURN json_build_object('allowed', false, 'reason', 'no_credits');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Files to Create:**
- `supabase/migrations/YYYYMMDD_subscription_verification.sql`

**Verification:**
- [ ] localStorage manipulation does NOT grant premium access
- [ ] Free users hit credit limit after 5 AI calls
- [ ] Premium status verified on every AI request

---

#### -1.2 Gate Gemini API at Backend [HIGH - Post-Launch]
**Issue:** Gemini API key exposed to client - anyone can make unlimited AI calls
**Location:** `services/geminiService.ts`

**Remediation:** Move Gemini calls to Supabase Edge Function:
- Frontend sends dream text to Edge Function
- Edge Function calls `verify_ai_access()` first
- Edge Function calls Gemini, returns result
- Client never has direct Gemini access

---

### Priority 0 - CRITICAL SECURITY

#### 0.1 Sync Conflict Resolution [CRITICAL] (from infra-security-ai-safety audit)
**Issue:** Last-write-wins is dangerous - can cause data loss with twin-write scenarios (iPad online + Phone offline)
**Location:** `supabase/functions/sync/index.ts`, `services/syncService.ts`
**Status:** ⚠️ NOT IMPLEMENTED

**Remediation:**
1. Add `updated_at` and `version` columns to dreams table
2. On sync conflict (409):
   - Compare timestamps
   - Server newer → accept server, show toast
   - Client newer → client wins
   - Both have unique edits → merge or prompt user

```typescript
// Add to dream sync logic
if (response.status === 409) {
    const serverVersion = await fetchServerVersion(dreamId);
    if (serverVersion.updated_at > localDream.updated_at) {
        // Server wins, update local
        await updateLocalDream(serverVersion);
        showToast('Dream synced from another device');
    } else {
        // Client wins, retry push
        await pushWithForce(localDream);
    }
}
```

---

#### 0.2 Offline Sync Token Refresh [CRITICAL]
**Issue:** Tokens expire during 8+ hour sleep, causing data loss on wake
**Location:** `services/syncService.ts:48-79`
**Status:** ⚠️ NOT IMPLEMENTED

**Remediation:**
```typescript
// Add to syncService.ts before processSyncQueue():

async function ensureValidToken(): Promise<string | null> {
    const supabase = await import('./supabaseClient').then(m => m.default);
    if (!supabase) return null;
    
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            // Try to refresh
            const { data } = await supabase.auth.refreshSession();
            return data.session?.access_token ?? null;
        }
        return session.access_token;
    } catch {
        return null;
    }
}

// Then in processSyncQueue():
export async function processSyncQueue() {
    const token = await ensureValidToken();
    if (!token) {
        logger.warn('No valid token for sync, will retry later');
        return { success: false, processed: 0 };
    }
    // ... rest of existing logic
}
```

---

#### 0.3 Déjà Vu Narrative AI Synthesis [HIGH] (from Gold Master Audit)
**Issue:** AI response shows raw percentage match, not poetic narrative synthesis
**Current Output:** "85% similar to 'Ocean Journey'"
**Required Output:** "You're returning to the Ocean. But this time, you're not afraid."
**Location:** `services/geminiService.ts` - dream analysis prompt
**Status:** ⚠️ NOT IMPLEMENTED

**The Problem:** The `dreamConnections` field exists in the AI response schema but only returns similarity scores. The compound value of long-term dream memory isn't visible to users. This is described as a "$2M bug" in the Gold Master Audit.

**Remediation:**
```typescript
// In geminiService.ts, update the dream analysis prompt:

// Add to system prompt or dream analysis instructions:
const DEJA_VU_SYNTHESIS_PROMPT = `
When similar past dreams are found (>70% similarity):
- DO NOT just return percentage match
- Generate a 1-2 sentence poetic synthesis that:
  1. Names the recurring element/theme
  2. Notes any evolution or change between dreams
  3. Uses second-person ("You're returning to...")

Examples:
- "You're returning to the Ocean. But this time, you're not afraid."
- "The serpent appears again, but now you see it as ally, not threat."
- "Three times now you've dreamed of flying—each time, higher."

Return in dreamConnections.synthesis field.
`;

// Update the response schema to include:
dreamConnections: {
    matchedDreamId: string,
    matchedDreamTitle: string,
    similarity: number,
    daysAgo: number,
    synthesis: string  // <-- The poetic narrative
}
```

**Verification:**
- [ ] AI returns `synthesis` field when similar dreams found
- [ ] Synthesis is poetic, not technical
- [ ] Frontend displays synthesis prominently (see frontend remediation 0.5)

---

### Priority 1 - HIGH

#### 1.1 Gemini Rate Limit Retry Logic [HIGH]
**Issue:** No retry logic with exponential backoff for Gemini API calls
**Location:** `services/geminiService.ts`
**Risk:** User frustration on transient failures

**Remediation:**
```typescript
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
): Promise<T> {
    let lastError: Error;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (error.message?.includes('429')) {
                // Rate limited - wait with exponential backoff
                await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
            } else {
                throw error; // Non-retryable error
            }
        }
    }
    throw lastError!;
}
```

Apply to: `analyzeDream()`, `generateDreamTitle()`, `generateDreamImage()`, `chat()`

---

#### 1.2 Test Coverage Foundation [HIGH]
**Issue:** Zero automated tests (HIGH regression risk)
**Location:** `tests/` directory
**Risk:** Breaking changes go unnoticed

**Remediation:**
- Add basic integration tests for critical flows:
  1. Dream creation flow
  2. Alarm scheduling
  3. Sleep session lifecycle
- Use existing `vitest` setup
- Target: 5 critical path tests minimum

---

### Priority 2 - MEDIUM (Scale-Dependent)

#### 2.1 HNSW Index Migration [MEDIUM]
**Issue:** IVFFlat index degrades at scale (>100k vectors)
**Current Status:** Not critical until user base grows significantly

**Remediation (when needed):**
```sql
-- Create HNSW index (better for high-accuracy vector search)
DROP INDEX IF EXISTS dream_embeddings_embedding_idx;
CREATE INDEX dream_embeddings_embedding_hnsw_idx 
ON dream_embeddings 
USING hnsw (embedding vector_cosine_ops);
```

#### 2.2 Thundering Herd / AI Queue System [HIGH - Scale Readiness]
**Issue:** No server-side queue. 10K users waking at 7AM will overwhelm Gemini API.
**Source:** Red Team Audit (Phase 1)
**Current Status:** Not critical for launch, REQUIRED before growth phase

**The Problem:**
- All AI calls go directly from client to Gemini API
- No rate limiting at backend level
- No queue to smooth traffic spikes
- Morning "thundering herd" (7AM wake-up surge) will hit API quotas

**Remediation Architecture:**

##### Phase 1: Supabase Edge Function Gateway
Move all Gemini calls through a single Edge Function:

```typescript
// supabase/functions/ai-gateway/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per user

serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // 1. Verify auth
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error } = await supabase.auth.getUser(
        authHeader?.replace('Bearer ', '')
    );
    if (error || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    // 2. Check rate limit (stored in Redis/KV)
    const rateLimitKey = `ai_rate:${user.id}`;
    const currentCount = await getRequestCount(rateLimitKey);
    if (currentCount >= RATE_LIMIT_MAX) {
        return new Response(JSON.stringify({ 
            error: 'Rate limited', 
            retryAfter: 60 
        }), { status: 429 });
    }
    
    // 3. Verify subscription/credits
    const { data: sub } = await supabase.rpc('verify_ai_access', { user_id_input: user.id });
    if (!sub?.allowed) {
        return new Response(JSON.stringify({ error: 'No AI credits' }), { status: 403 });
    }
    
    // 4. Queue the request (for high-scale, use QStash/BullMQ)
    const body = await req.json();
    
    // 5. Call Gemini with retry
    const result = await callGeminiWithRetry(body, 3);
    
    // 6. Increment rate limit counter
    await incrementRequestCount(rateLimitKey, RATE_LIMIT_WINDOW);
    
    return new Response(JSON.stringify(result), { status: 200 });
});

async function callGeminiWithRetry(body: any, maxRetries: number) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': Deno.env.get('GEMINI_API_KEY')!
                },
                body: JSON.stringify(body)
            });
            
            if (response.status === 429) {
                // Rate limited by Gemini, exponential backoff
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
                continue;
            }
            
            return await response.json();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
    }
}
```

##### Phase 2: For 100K+ Users - Add Queue
Use Upstash QStash or similar for proper queuing:

```typescript
// Add to Edge Function for high scale
import { Client } from '@upstash/qstash';

const qstash = new Client({ token: Deno.env.get('QSTASH_TOKEN')! });

// Instead of direct Gemini call, queue it
await qstash.publishJSON({
    url: 'https://your-project.supabase.co/functions/v1/process-ai',
    body: { userId: user.id, type: 'analyze_dream', payload: body },
    retries: 3,
    delay: '0s'
});

// Return job ID, client polls for result
return new Response(JSON.stringify({ jobId: jobId, status: 'queued' }));
```

##### Quota Monitoring & Graceful Degradation
```typescript
// Monitor Gemini quota usage
const DAILY_QUOTA = 50000; // tokens
let dailyUsage = 0;

if (dailyUsage > DAILY_QUOTA * 0.9) {
    // Approaching limit - degrade gracefully
    return new Response(JSON.stringify({
        error: 'AI service at capacity',
        fallback: 'Please try again in a few hours',
        estimatedWait: '2h'
    }), { status: 503 });
}
```

**Files to Create:**
- `supabase/functions/ai-gateway/index.ts`
- `supabase/functions/process-ai/index.ts` (for queue processing)

**Frontend Changes:**
- Update `geminiService.ts` to call Edge Function instead of direct Gemini
- Add loading state for queued requests
- Handle 429/503 gracefully with user-friendly messages

**Verification:**
- [ ] Load test: 1000 concurrent requests don't crash
- [ ] Rate limit works: 11th request in 1 minute returns 429
- [ ] Quota monitoring logs daily usage
- [ ] Client handles queue delays gracefully

---

## ALREADY COMPLETED (No Action Needed)

✅ **match_dreams RLS Vulnerability** - FIXED in `supabase/migrations/20260109020000_security_fixes.sql`
   - Makes `user_id_input` mandatory (no default)
   - Adds explicit `IF user_id_input IS NULL THEN RAISE EXCEPTION` check
   - Adds `IF auth.uid() != user_id_input THEN RAISE EXCEPTION 'Access denied'` check
   - Access restricted to `authenticated` users only

✅ **Vector Dimension** - VERIFIED as `vector(768)` in migrations (correct for Gemini text-embedding-004)
   - `20240108_vector_analytics.sql` and `20260109020000_security_fixes.sql` both use 768-dim
   - The `vector(1536)` concern was a false alarm

✅ **Crisis Detection Pre-Screening** - IMPLEMENTED in `services/crisisDetectionService.ts`
   - Contains hardcoded `CRISIS_KEYWORDS` array
   - Exports `detectCrisis()` function with `CRISIS_RESPONSE`
   - Integrated into `geminiService.ts` (import confirmed)

✅ **logBreathingActivity()** - EXISTS in `services/sleepSessionService.ts:90`
   - Called from `GuidedRelaxationModal.tsx:276`

✅ **saveWakeData()** - EXISTS in `contexts/AppContext.tsx`
   - Called from `App.tsx` in `handleAwake()`

✅ SpeechGrammarList typing (Cycle 1)
✅ Console → logger in nativeAlarmService (Cycle 16)
✅ Console → logger in App.tsx (Cycle 18)
✅ Dead code LinguisticsTab removed (backend-agent-loop branch)
✅ All hooks verified for memory leaks (Cycle 11)
✅ All services verified for error handling (Cycles 1-6)

---

## FALSE POSITIVES (No Action Needed)

❌ "No TensorFlow/ML" - Marketing issue, not code issue
❌ "Wiretap Risk" - Already compliant (on-device speech-to-text)
❌ "Vector Dimension Mismatch" - Database uses correct 768-dim for Gemini

---

## EXECUTION LOOP

```
for each item in VALIDATED_ITEMS (by priority):
    1. Check if migration/service exists
    2. Implement fix
    3. Test locally
    4. Document in backend_agent_notes.md
    5. Commit with descriptive message
```

---

## CROSS-AGENT SYNC

Before starting:
// turbo
```bash
git fetch origin
cat .agent/frontend_agent_notes.md
```

Check frontend notes for:
- UI components needing backend data
- New data requirements
- Crisis detection UI implementation status

---

## VALIDATION COMMANDS

// turbo
```bash
npx tsc --noEmit 2>&1 | head -20
```

// turbo
```bash
npm run build 2>&1 | tail -10
```

---

## COMMIT FORMAT

```bash
git add -A && git commit -m "fix(backend): [service] - [brief description]

Remediates: [AUDIT_ITEM_NUMBER]
Security: [CRITICAL/HIGH/MEDIUM]"
```

---

**START WITH PRIORITY 0 (CRITICAL SECURITY). DO NOT SKIP.**
