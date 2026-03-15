# ⚡ PERFORMANCE AGENT

## Your Domain
Everything performance: bundle size, memory, battery, speed, optimization, code quality.

## Mobile-First
- Bundle size < 500KB
- Memory < 100MB
- Cold start < 2 seconds
- Battery efficiency
- 60fps scrolling

## New Focus Areas
1. **Integration Testing** - End-to-end user flows
   - Alarm → Sleep Session → Dream Entry → Insights
   - Verify all features work together
2. **Cross-Feature Memory** - Long sessions
   - Run soundscape for 1hr - any leaks?
   - Multiple alarms scheduled - memory growth?
3. **Large File Optimization**
   - Can any large files be split?
   - Dead code elimination
   - Import optimization
4. **Native Performance**
   - Capacitor overhead
   - Native vs web performance gaps

## Large Files to Audit
- `services/audioService.ts` (2189 lines) - Can it be split?
- `components/pages/AlarmsPage.tsx` (1026 lines)
- `contexts/AppContext.tsx` (853 lines)

## Communication
Update `.agent/AGENT_MESH.md` with findings and status.
