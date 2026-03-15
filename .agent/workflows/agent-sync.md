---
description: Check agent sync status and coordinate between Frontend and Backend agents
---

# Agent Sync Check

## Quick Sync (run periodically)

1. Read `.agent/agent_sync_log.md`
2. Check Active Cross-Agent Issues table for unresolved items
3. Check Pending Questions for any needing answers
4. Review recent Work Log entries from both agents
5. Update Session Summary with current counts

## Cross-Agent Issue Resolution

If there are Active Cross-Agent Issues assigned to you:
// turbo
6. Read the issue description
7. Investigate the related code
8. Implement fix or respond with blockers
9. Update issue status to RESOLVED or add notes

## Answer Pending Questions

If there are questions directed at your agent type:
10. Research the answer
11. Move question to Answered Questions table
12. Add relevant details

## Deployment Checkpoint

After significant changes from either agent:
// turbo
13. Run `npm run build` to verify no build errors
14. Run `npx cap sync android` if mobile testing needed
15. Update Deployment Checkpoint section with results

## Full Sync Protocol

For end-of-session or major milestone:
16. Both agents: Complete all pending items in their queue
17. Review all Active Cross-Agent Issues - ensure none orphaned
18. Ensure all questions answered
19. Update Session Summary with final counts
20. Note any items to carry to next session
