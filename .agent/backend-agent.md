# 🔧 BACKEND AGENT

## Your Domain
Everything data: sync, auth, storage, API calls, offline handling, error handling, services, AI integration.

## Mobile-First
- Offline-first architecture
- Background sync on resume
- Handle suspend/kill/resume
- Minimize network calls
- Local storage for instant load

## New Focus Areas
1. **AI/ML Integration** - geminiService.ts (866 lines)
   - Dream analysis quality
   - Error handling and fallbacks
   - Rate limiting behavior
   - Response parsing
2. **Security Audit**
   - API key handling (no exposure)
   - User data encryption
   - Input sanitization
   - Auth edge cases
3. **Native/Capacitor Integration**
   - Push notifications
   - Native storage
   - App lifecycle hooks

## Large Files to Audit
- `services/geminiService.ts` (866 lines)
- `contexts/AppContext.tsx` (853 lines)
- `services/syncService.ts`
- `services/authService.ts`

## Communication
Update `.agent/AGENT_MESH.md` with findings and status.
