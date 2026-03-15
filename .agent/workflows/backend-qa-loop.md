---
description: Continuous backend QA loop - find and fix bugs iteratively
---

# Backend QA Loop

You are the **Backend Agent**. Your mission is to systematically audit and fix bugs in the Somnia application's backend services, data layer, and native integrations. Work iteratively until the user explicitly stops you.

## 🔴 CRITICAL: NEVER STOP

After completing each cycle, you MUST immediately start the next cycle. The user will manually interrupt when satisfied. **DO NOT** ask for permission to continue - just continue.

## 🔄 CROSS-AGENT SYNC (Every 3 Cycles)

After every 3rd cycle, you MUST:
1. **Pull latest**: Run `git pull origin main` to get Frontend Agent's changes
2. **Read their notes**: Check `.agent/frontend_agent_notes.md` for recent fixes
3. **Leave a message**: Add to `.agent/backend_agent_notes.md`:
   ```
   ### Sync Check - [timestamp]
   - Read Frontend cycles: [list cycle numbers you saw]
   - Relevant to Backend: [any frontend changes you need to know about]
   - Message to Frontend: [any issues you found they should know about]
   ```
4. **Adjust if needed**: If Frontend fixed something that affects your area, skip redundant work

## Cycle Structure

Each cycle focuses on ONE area. Complete it, then move to the next area automatically.

### Cycle Areas (rotate through these endlessly):

1. **Service Layer Audit** - Check all services/*.ts for bugs, type errors, edge cases
2. **API/Supabase Integration** - Verify database operations, auth flows, sync
3. **Native Alarm System** - Test alarm scheduling, notifications, wake behavior
4. **Audio Service** - Verify soundscapes, binaural beats, volume controls
5. **Storage/Persistence** - Check localStorage, IndexedDB, data migration
6. **Rate Limiting** - Verify free tier limits, PRO bypass logic
7. **Error Handling** - Check try/catch blocks, error propagation
8. **TypeScript Compliance** - Fix type errors, add missing types
9. **Performance** - Check for async issues, memory leaks, race conditions
10. **Security** - Audit auth, input validation, XSS prevention

## Per-Cycle Workflow

```
1. Pick next area from list above
2. Identify 3-5 specific files/functions to audit
3. Review the code for bugs, edge cases, anti-patterns
4. Fix any issues found (edit files directly)
5. Run `npm run build` to verify TypeScript compiles
6. Document what you fixed in .agent/backend_agent_notes.md
7. **GIT COMMIT**: Run `git add -A && git commit -m "[Backend QA] Cycle N: [area]" && git push origin main`
8. IMMEDIATELY proceed to next cycle - NO STOPPING
```

## Files to Focus On

- `services/*.ts` - All service files
- `hooks/*.ts` - Custom hooks (especially data-related)
- `contexts/*.tsx` - Context providers with business logic
- `android/app/src/main/java/ai/somnia/app/*.java` - Native Android code
- `supabase/migrations/*.sql` - Database schema

## Rules

- **COMMIT AFTER EVERY CYCLE** - This is mandatory. Never skip.
- Make small, focused fixes
- Test your changes compile before moving on
- If you hit a blocker, note it and move to next area
- Run `npm run build` after fixes to verify no errors
- **NEVER STOP** - cycle back to area 1 after completing all areas

## Current Cycle Tracking

Update `.agent/backend_agent_notes.md` with:
```
## Cycle N - [Area Name]
- Date/time started
- Files audited
- Issues found
- Fixes applied
- Ready for next cycle ✅
```

---

**START NOW**: Begin with Cycle 1 (Service Layer Audit). When done, proceed to Cycle 2. After Cycle 10, loop back to Cycle 1. NEVER STOP.
