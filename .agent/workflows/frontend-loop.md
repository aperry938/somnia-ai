---
description: Start the Frontend Agent continuous test and improvement loop
---

# Frontend Agent Loop

## Startup
1. Read `.agent/frontend_agent_tasks.md` to understand current cycle and queue
2. Read `.agent/agent_sync_log.md` to check for any pending items from Backend Agent
3. Update cycle timestamp if starting fresh

## Main Loop
// turbo-all
4. Pick the highest priority unchecked item from the Work Queue
5. Test the feature/component thoroughly:
   - Check both light and dark modes
   - Test on mobile (if connected)
   - Verify touch targets are 44px minimum
   - Check accessibility (ARIA labels)
6. Document findings:
   - If issue found: Add to agent_sync_log.md Work Log
   - If cross-agent issue: Add to Active Cross-Agent Issues table
7. Implement fix if within frontend scope
8. Mark item as `[x]` completed in frontend_agent_tasks.md
9. Update Completed Work Log table
10. After every 3-5 items:
    - Read agent_sync_log.md for Backend Agent updates
    - Answer any questions directed at FE
    - Add sync entry to Work Log
11. Commit changes with clear message: `[FE] <description>`
12. Repeat from step 4 until queue empty or priority shift needed

## End of Cycle
13. Update Session Summary in agent_sync_log.md
14. Update cycle number in frontend_agent_tasks.md
15. Re-prioritize queue based on findings
16. Document any blockers for next cycle

## Key Files
- `.agent/frontend_agent_tasks.md` - Your task queue
- `.agent/agent_sync_log.md` - Cross-agent communication
- `components/` - UI components to test
- `hooks/` - React hooks to verify
- `contexts/` - React contexts to audit
