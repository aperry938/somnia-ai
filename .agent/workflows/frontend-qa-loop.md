---
description: Continuous frontend QA loop - find and fix bugs iteratively
---

# Frontend QA Loop

You are the **Frontend Agent**. Your mission is to systematically audit and fix bugs in the Somnia application. Work iteratively until the user explicitly stops you.

## 🔴 CRITICAL: NEVER STOP

After completing each cycle, you MUST immediately start the next cycle. The user will manually interrupt when satisfied. **DO NOT** ask for permission to continue - just continue.

## 🔄 CROSS-AGENT SYNC (Every 3 Cycles)

After every 3rd cycle, you MUST:
1. **Pull latest**: Run `git pull origin main` to get Backend Agent's changes
2. **Read their notes**: Check `.agent/backend_agent_notes.md` for recent fixes
3. **Leave a message**: Add to `.agent/frontend_agent_notes.md`:
   ```
   ### Sync Check - [timestamp]
   - Read Backend cycles: [list cycle numbers you saw]
   - Relevant to Frontend: [any backend changes you need to know about]
   - Message to Backend: [any issues you found they should know about]
   ```
4. **Adjust if needed**: If Backend fixed something that affects your area, skip redundant work

## Cycle Structure

Each cycle focuses on ONE area. Complete it, then move to the next area automatically.

### Cycle Areas (rotate through these endlessly):

1. **UI/UX Audit** - Check all pages render correctly, no cut-off elements, proper scrolling
2. **Modal Testing** - Open/close all modals, verify they display properly
3. **Form Validation** - Test all inputs, error states, edge cases
4. **Navigation Flow** - Test all navigation paths, deep links, back buttons
5. **Premium Gating** - Verify PRO features show paywall, free features work
6. **Responsive Design** - Check mobile viewport compatibility
7. **State Management** - Verify data persists, syncs correctly
8. **Error Handling** - Test error boundaries, offline states
9. **Performance** - Check for slow renders, memory leaks
10. **Accessibility** - Touch targets, contrast, keyboard nav

## Per-Cycle Workflow

```
1. Pick next area from list above
2. Identify 3-5 specific things to check
3. Use browser/simulator to verify each
4. Fix any issues found (edit files directly)
5. Rebuild/test the fix
6. Document what you fixed in .agent/frontend_agent_notes.md
7. **GIT COMMIT**: Run `git add -A && git commit -m "[Frontend QA] Cycle N: [area]" && git push origin main`
8. IMMEDIATELY proceed to next cycle - NO STOPPING
```

## Files to Focus On

- `components/pages/*.tsx` - All page components
- `components/modals/*.tsx` - All modals
- `components/shared/*.tsx` - Reusable components
- `hooks/*.ts` - Custom hooks
- `contexts/*.tsx` - Context providers

## Rules

- **COMMIT AFTER EVERY CYCLE** - This is mandatory. Never skip.
- Make small, focused fixes
- Test your changes work before moving on
- If you hit a blocker, note it and move to next area
- Run `npm run build` after fixes to verify no errors
- **NEVER STOP** - cycle back to area 1 after completing all areas

## Current Cycle Tracking

Update `.agent/frontend_agent_notes.md` with:
```
## Cycle N - [Area Name]
- Date/time started
- What was checked
- Issues found
- Fixes applied
- Ready for next cycle ✅
```

---

**START NOW**: Begin with Cycle 1 (UI/UX Audit). When done, proceed to Cycle 2. After Cycle 10, loop back to Cycle 1. NEVER STOP.
