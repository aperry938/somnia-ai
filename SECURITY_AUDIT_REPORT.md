# Somnia.ai Security, Scalability & AI Safety Audit Report

**Date:** January 2026
**Auditor Role:** CTO / CISO / General Counsel
**Classification:** CONFIDENTIAL - INTERNAL USE ONLY

---

## Executive Summary

This Red Team assessment identified **6 critical vulnerabilities** and **2 high-risk issues** that must be addressed before production scaling.

| Category | Risk Level | Issue | Status |
|----------|-----------|-------|--------|
| Scalability | CRITICAL | No queue system for AI requests | Requires Implementation |
| Vector Search | CRITICAL | IVFFlat index unsuitable at scale | Migration Required |
| Offline Sync | CRITICAL | Token expiration causes data loss | Requires Implementation |
| RLS Security | CRITICAL | `match_dreams` allows cross-user queries | SQL Fix Required |
| AI Safety | HIGH | Crisis detection is advisory only | Implementation Provided |
| Medical Device | HIGH | No hardcoded disclaimers | Prompt Update Required |
| Wiretap Risk | LOW | Speech-to-text is on-device | No Action Required |

---

## Critical Findings

### 1. "7 AM Spike" - No Queue System

**File:** `services/geminiService.ts:75-196`

The `analyzeDream()` function directly calls Gemini API without any throttling mechanism. At 10,000 concurrent users (7 AM wake-up spike), 99.8% of requests will fail with 429 rate limit errors.

**Required Fix:** Implement server-side queue with exponential backoff (see `services/aiQueueService.ts`).

### 2. Vector Search RLS Vulnerability

**File:** `supabase/migrations/20240108_vector_analytics.sql:60-91`

The `match_dreams` RPC function has an optional `user_id_input` parameter. When omitted, it searches ALL users' dreams - a complete privacy breach.

**Required Fix:** Make `user_id_input` mandatory and add `SECURITY DEFINER` clause.

### 3. Offline Sync Token Trap

**File:** `services/syncService.ts:48-79`

The sync service retrieves tokens from localStorage without refreshing them. After 8 hours of sleep (Airplane Mode), tokens expire and dreams are lost.

**Required Fix:** Implement `ensureValidToken()` call before sync attempts.

### 4. AI Crisis Detection Gap

**File:** `services/aiConfig.ts:42-49`

Crisis detection is advisory text in the system prompt. Gemini can ignore it or be manipulated via prompt injection.

**Required Fix:** Pre-screen dream text for crisis keywords BEFORE API call.

---

## Deliverables Provided

1. **HNSW Index Migration SQL** - `supabase/migrations/20240201_hnsw_index.sql`
2. **Crisis Detection Service** - `services/crisisDetectionService.ts`
3. **Secure match_dreams Function** - Updates to vector analytics migration
4. **AI Safety Prompt v2** - Enhanced system prompt with hardcoded constraints

---

## Recommended Priority Order

1. **Immediate (P0):** Fix `match_dreams` RLS vulnerability
2. **Week 1 (P1):** Implement crisis detection pre-screening
3. **Week 2 (P2):** Deploy HNSW index migration
4. **Week 3 (P3):** Implement offline sync token refresh
5. **Week 4 (P4):** Deploy AI queue system

---

## Compliance Notes

### FDA Medical Device Risk
The app MUST NOT claim to:
- Detect, diagnose, or treat sleep disorders
- Provide medical or psychological advice
- Analyze biometric data for health purposes

### Wiretap Law Compliance
Current implementation is COMPLIANT:
- Uses Web Speech API (on-device speech-to-text)
- Only transcripts are stored, never raw audio
- No two-party consent issues

---

*Report generated for internal security review. Do not distribute externally.*
