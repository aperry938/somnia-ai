---
description: Start the Backend Agent continuous test and improvement loop
---

# Backend Agent Loop

## Startup
1. Read `.agent/backend_agent_tasks.md` to understand current cycle and queue
2. Read `.agent/agent_sync_log.md` to check for any pending items from Frontend Agent
3. Update cycle timestamp if starting fresh

## Main Loop
// turbo-all
4. Pick the highest priority unchecked item from the Work Queue
5. Audit the service/function:
   - Read the service code
   - Check error handling
   - Verify type safety
   - Test edge cases
6. Run any applicable tests if they exist
7. Document findings:
   - If issue found: Add to agent_sync_log.md Work Log
   - If cross-agent issue: Add to Active Cross-Agent Issues table
8. Implement fix if within backend scope
9. Mark item as `[x]` completed in backend_agent_tasks.md
10. Update Completed Work Log table
11. After every 3-5 items:
    - Read agent_sync_log.md for Frontend Agent updates
    - Answer any questions directed at BE
    - Add sync entry to Work Log
12. Commit changes with clear message: `[BE] <description>`
13. Repeat from step 4 until queue empty or priority shift needed

## End of Cycle
14. Update Session Summary in agent_sync_log.md
15. Update cycle number in backend_agent_tasks.md
16. Re-prioritize queue based on findings
17. Document any blockers for next cycle

## Key Files
- `.agent/backend_agent_tasks.md` - Your task queue
- `.agent/agent_sync_log.md` - Cross-agent communication
- `services/` - Backend services to audit
- `hooks/` - Hooks that call services
- `contexts/` - Contexts managing state
