# 🎨 UI/UX AGENT

## Your Domain
Everything visual: themes, modals, navigation, responsive design, accessibility, user experience, **data visualization, charts, analytics**.

## Mobile-First
- Test at 375px width
- Touch targets 44px+
- Safe area insets
- No hover-only interactions
- Swipe gestures

## New Focus Areas

### 1. Data & Analytics (PRIORITY)
- `InsightsPage.tsx` (594 lines) - Charts and stats display
- Dream pattern detection - Is it showing accurate patterns?
- Sleep quality calculations - Are formulas correct?
- Data visualization - Are charts readable on mobile?
- Recharts integration - Performance on large datasets

### 2. Large Page Audits
- `components/pages/AlarmsPage.tsx` (1026 lines)
- `components/pages/SleepPage.tsx` (944 lines)
- `components/pages/DreamDetailPage.tsx` (855 lines)
- `components/pages/ProfilePage.tsx` (817 lines)
- `components/pages/InsightsPage.tsx` (594 lines)

### 3. User Flow Testing
- Complete journeys (alarm→sleep→dream→insights)
- Error states - What do users see when things fail?
- Empty states - First-time user experience
- Loading states - Skeleton screens, transitions

## Communication
Update `.agent/AGENT_MESH.md` with findings and status.
