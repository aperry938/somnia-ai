# Somnia AI/ML Architecture: Expert Assessment Document

> **Purpose**: Comprehensive technical document for AI expert review of Somnia's analytics and ML integration. Contains full architecture details, implementation rationale, and specific questions for assessment.

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Application Overview](#application-overview)
3. [AI/ML Systems Inventory](#aiml-systems-inventory)
4. [Technical Implementation Details](#technical-implementation-details)
5. [Analytics Architecture](#analytics-architecture)
6. [Design Decisions & Rationale](#design-decisions--rationale)
7. [Current Limitations](#current-limitations)
8. [Specific Questions for Assessment](#specific-questions-for-assessment)
9. [Appendix: Full Code References](#appendix-full-code-references)

---

## Executive Summary

**Somnia** is a premium sleep wellness and dream journaling application built with React 19 + TypeScript + Capacitor (iOS/Android). The app integrates AI/ML at multiple levels to provide users with dream analysis, sleep insights, and coaching.

### Current AI Stack
| Component | Technology | Model |
|-----------|------------|-------|
| Dream Analysis | Google Gemini API | gemini-2.5-flash |
| Image Generation | Google Gemini API | gemini-2.5-flash-image |
| Sleep Coaching | Google Gemini API | gemini-2.5-flash |
| ML Analytics | Google Gemini API | gemini-2.5-flash |
| Client-side Analytics | Pure JavaScript | Keyword matching, statistical averaging |

### Monetization
- **Free tier**: 3 AI credits/day, demo analytics data
- **Premium ($6.99/mo)**: Unlimited AI analysis, personal analytics, ML features

---

## Application Overview

### Technology Stack
```
Frontend:     React 19 + TypeScript + Vite
Mobile:       Capacitor 8 (iOS/Android)
Backend:      Supabase (Auth, Database, Storage)
AI Provider:  Google Gemini API (@google/genai)
Styling:      Tailwind-like custom CSS
Charts:       Recharts
```

### Core User Journey
1. **Sleep Gateway** → Pre-sleep preparation (soundscapes, breathing exercises, intention setting)
2. **Alarm** → Wake up with smart alarm
3. **Dream Logging** → Voice or text dream entry
4. **AI Analysis** → Gemini-powered dream interpretation
5. **Insights** → Analytics dashboard with patterns and trends

---

## AI/ML Systems Inventory

### 1. DREAM ANALYSIS (Core Feature)
**File**: `services/geminiService.ts` → `analyzeDream()`

**Input**:
- Dream text (user's written/transcribed dream)
- Sleep aids context (soundscape used, relaxation technique, day rating)
- User biometrics (optional: age, gender, avg sleep hours)
- Analysis personality (oneironaut, jungian, scientific)

**Output** (JSON schema enforced):
```typescript
interface DreamAnalysis {
    title: string;           // "The Lighthouse at World's End"
    analysis: {              // 2-3 thematic insights
        title: string;       // "The Archetype of the Guardian"
        content: string;     // Deep psychological analysis
    }[];
    integration: {
        title: string;       // "The Integration"
        content: string;     // Actionable question/ritual
    };
    imagePrompt?: string;    // 80-150 word image generation prompt
}
```

**Model Used**: `gemini-2.5-flash`

**Prompt Engineering**: Full persona-based system with 3 distinct analysis styles:
1. **The Oneironaut** - Poetic, mythological, integrative (default)
2. **The Shadow Walker** - Jungian depth psychology, archetypes
3. **Dr. REM** - Neuroscience-based, cognitive patterns

**Rate Limiting**: 
- Free users: 3 credits/day (stored in localStorage, verified server-side)
- Premium: Unlimited with 1 analysis/dream soft limit

---

### 2. DREAM IMAGE GENERATION
**File**: `services/geminiService.ts` → `generateDreamImage()`

**Input**: Dream text + art style selection

**Art Styles** (8 presets):
```typescript
type DreamArtStyle = 
    'surreal' | 'watercolor' | 'oil-painting' | 'anime' | 
    'photorealistic' | 'abstract' | 'fantasy' | 'minimalist';
```

**Model Used**: `gemini-2.5-flash-image` with `responseModalities: [Modality.IMAGE]`

**Output**: Base64 encoded image data

**Prompt Template Example**:
```
A dream of: "{dreamText}". Photorealistic surrealism, ethereal lighting, 
atmospheric, style of Salvador Dalí and Remedios Varo, dreamlike impossible 
geometry, emotionally resonant, sophisticated, cinematic, trending on artstation.
```

---

### 3. AI SLEEP COACH (Chat Interface)
**File**: `services/geminiService.ts` → `getCoachResponse()`

**Input**: Chat history array + personality mode (mystical/scientific)

**Personas**:
1. **The Oneironaut** (mystical) - Ritualistic, symbolic, soothing
2. **Dr. Somnia** (scientific) - CBT-I based, evidence-driven, practical

**Model Used**: `gemini-2.5-flash`

**Context Injection**:
- Time of day awareness (calmer responses at night)
- User's recent dream themes
- Sleep quality trends

---

### 4. DREAM CHAT (Follow-up Conversations)
**File**: `services/geminiService.ts` → `getDreamChatResponse()`

**Purpose**: Continue discussion about a specific dream after initial analysis

**Context Includes**:
- Original dream text
- Previous analysis title and themes
- Sleep quality rating
- Dream mood
- Full chat history

**Behavior Guidelines** (from prompt):
- Don't repeat initial analysis
- Ask deepening questions
- Connect to waking life
- One insight at a time

---

### 5. DREAM SYNTHESIS (Multi-Dream Analysis)
**File**: `services/geminiService.ts` → `synthesizeDreamThemes()`

**Input**: Array of Dream objects (last 20)

**Output**:
```typescript
interface DreamSynthesis {
    overallSummary: string;           // "A portrait of the dreamer's inner landscape"
    recurringThemes: {
        theme: string;                // "Journeys of Transformation"
        description: string;          // Deep interpretation
        exampleDreamIds: number[];    // Which dreams contain this
    }[];
    emotionalTrajectory?: string;     // How dreams are trending
    integrationSuggestion?: string;   // What to explore
}
```

**Model Used**: `gemini-2.5-flash`

**Availability**: Premium only, once per week rate limit

---

### 6. SLEEP HABIT ANALYSIS
**File**: `services/geminiService.ts` → `analyzeSleepHabits()`

**Input**: Dreams with sleepQuality and sleepAids data

**Data Sent to Model**:
```
Date: Quality X/5 | Day Y/5 | Aids: [list] | Notes: "context"
```

**Output**:
```typescript
interface SleepHabitAnalysis {
    positiveCorrelations: { habit: string; insight: string }[];
    negativeCorrelations: { habit: string; insight: string }[];
    recommendations: string[];
    dataNote?: string;  // Honest assessment of data quality
}
```

**Model Used**: `gemini-2.5-flash`

---

### 7. ML ANALYTICS SERVICE (NEW - Just Implemented)
**File**: `services/mlAnalyticsService.ts`

**Functions**:

#### 7.1 analyzeMLSentiment(dreamText)
- **Purpose**: Nuanced emotional analysis beyond pos/neg
- **Output**: Primary sentiment + emotions array with intensity + nuance string + valence (-1 to 1) + arousal (0-1)

#### 7.2 extractSemanticThemes(dreams[])
- **Purpose**: Jungian archetype-aware theme extraction
- **Requires**: 3+ dreams
- **Output**: Theme name, symbols, interpretation, strength, optional archetype

#### 7.3 detectNarrativePatterns(dreams[])
- **Purpose**: Find recurring characters, locations, emotional arcs, symbol chains
- **Requires**: 5+ dreams
- **Output**: Pattern type, frequency, first/last seen, evolution description

#### 7.4 predictSleepQuality(sleepAids, biometrics, recentDreams)
- **Purpose**: Predict tonight's sleep quality
- **Output**: Predicted quality (1-5), confidence, factors array, recommendations

---

### 8. CLIENT-SIDE ANALYTICS (No AI)
**Location**: `components/insights/` (112 insight card components)

**Approach**: Pure JavaScript keyword matching and statistical calculations

**Example - Sentiment Analysis** (`PositiveNegativeRatio.tsx`):
```typescript
const POSITIVE_KEYWORDS = ['happy', 'joy', 'love', 'peace', 'calm', 
    'beautiful', 'wonderful', 'fun', 'exciting', 'amazing', 'success', 
    'win', 'laugh', 'smile', 'comfort'];
const NEGATIVE_KEYWORDS = ['sad', 'angry', 'fear', 'scary', 'anxious', 
    'worried', 'nightmare', 'dark', 'death', 'chase', 'attack', 'fail', 
    'lose', 'cry', 'pain'];
```

**Example - Pattern Detection** (`constants/dreamPatterns.ts`):
```typescript
const PATTERN_KEYWORDS = [
    // Locations
    'house', 'home', 'school', 'work', 'office', 'beach', 'forest', 'city',
    // People
    'family', 'friend', 'stranger', 'mother', 'father', 'child', 'partner',
    // Actions
    'flying', 'falling', 'running', 'chasing', 'hiding', 'fighting',
    // Themes
    'death', 'water', 'fire', 'animals', 'teeth', 'naked', 'exam', 'late'
];
```

**Full List of Client-Side Insight Cards** (112 total):
- Emotion cards: JoyDreams, FearDreams, AngerDreams, SadnessDreams, etc.
- Content cards: DreamLocations, DreamCharacters, DreamObjects, DreamColors
- Statistical cards: AvgSleepQuality, DreamConsistency, LongestShortestDream
- Temporal cards: DayOfWeekAnalysis, SeasonalPattern, MoonPhaseInsight
- Trend cards: SentimentChart, SleepQualityTrend, DreamGrowth

---

### 9. ALGORITHMIC SLEEP PREDICTION (Non-AI)
**File**: `services/sleepPredictionService.ts`

**Method**: Statistical correlation from historical data
- Matches current day rating to similar historical days
- Matches soundscape to historical usage
- Returns weighted average prediction

**Confidence Levels**: low/medium/high based on data points

---

## Technical Implementation Details

### Model Selection: Why Gemini 2.5 Flash?

| Factor | Decision |
|--------|----------|
| **Cost** | ~$0.075/1M input, ~$0.30/1M output (10x cheaper than Pro) |
| **Latency** | ~500-800ms typical response time |
| **JSON Mode** | Native `responseMimeType: "application/json"` with schema enforcement |
| **Multimodal** | Image generation with `gemini-2.5-flash-image` variant |
| **Context Window** | 1M tokens (sufficient for 30+ dream analysis) |

### Prompt Architecture

**Layered System**:
```
Layer 1: SOMNIA_IDENTITY (Core personality, safety mandates)
    ↓
Layer 2: PERSONA (Oneironaut/Jungian/Scientific)
    ↓
Layer 3: CONTEXT (User profile, sleep aids, time of day)
    ↓
Layer 4: TASK (Specific instruction + output schema)
```

**Example Prompt Structure**:
```
[SOMNIA_IDENTITY - 49 lines]
---
CURRENT ROLE: The Oneironaut (Dream Explorer)
[PERSONA_STYLE - personality specific]

TONE: Poetic, warm, insightful
FOCUS: Symbolic meaning, emotional resonance

[USER_CONTEXT - if available]
[SLEEP_CONTEXT - if available]

TASK: Analyze the following dream...
FORMAT: Respond with JSON...

DREAM TEXT:
"""
{user's dream}
"""
```

### JSON Schema Enforcement

All AI responses use Gemini's native JSON mode:
```typescript
config: {
    responseMimeType: "application/json",
    responseSchema: {
        type: Type.OBJECT,
        properties: { ... },
        required: ['title', 'analysis', 'integration']
    }
}
```

**Validation Layer**: Post-response validation in code:
```typescript
if (!result.title || !result.analysis || !result.integration) {
    throw new Error("AI returned incomplete analysis");
}
```

### Caching Strategy

**Title Generation Cache**:
```typescript
const dreamTitleCache = new Map<string, string>();
const pendingTitleRequests = new Map<string, Promise<string>>();

// Deduplication: prevent parallel identical requests
const pending = pendingTitleRequests.get(cacheKey);
if (pending) return pending;
```

### Rate Limiting

**Multi-layer approach**:
1. **localStorage**: Track daily usage client-side
2. **Server validation**: Supabase RLS on subscription status
3. **Weekly limits**: Dream Synthesis, Sleep Analytics (premium features)

```typescript
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const canUseDreamSynth = (): boolean => {
    const last = localStorage.getItem(DREAM_SYNTH_KEY);
    if (!last) return true;
    return Date.now() - parseInt(last, 10) >= WEEK_MS;
};
```

---

## Analytics Architecture

### Data Flow

```
User Dreams (localStorage/Supabase)
        ↓
┌───────────────────────────────────────┐
│         INSIGHTS PAGE                  │
├───────────────────────────────────────┤
│  Tab 1: "My Dreams"                   │
│  - Client-side keyword analytics      │
│  - Statistical calculations           │
│  - 112 insight card components        │
├───────────────────────────────────────┤
│  Tab 2: "Analysis"                    │
│  - AI-powered (Gemini)                │
│  - Dream Weaving (synthesis)          │
│  - Sleep Analytics (correlations)     │
│  - ML Analytics (sentiment, themes,   │
│    patterns, predictions)             │
└───────────────────────────────────────┘
```

### Analytics Categories

| Category | Method | Premium Required |
|----------|--------|------------------|
| Quick Stats | Statistical | Preview only |
| Emotion Analysis | Keyword matching | Preview only |
| Theme Detection | Keyword matching | Preview only |
| Recurring Patterns | Keyword matching | Preview only |
| Dream Synthesis | Gemini ML | Yes |
| Sleep Correlations | Gemini ML | Yes |
| ML Sentiment | Gemini ML | Yes |
| Semantic Themes | Gemini ML | Yes |
| Narrative Patterns | Gemini ML | Yes |
| Sleep Prediction | Gemini ML | Yes |

---

## Design Decisions & Rationale

### 1. Why Gemini over OpenAI/Claude?
- **Cost**: 10x cheaper than GPT-4
- **Native JSON mode**: Schema enforcement reduces parsing errors
- **Image generation**: Single provider for text + image
- **Google ecosystem**: We're already on Firebase/GCP

### 2. Why Flash over Pro?
- Dream analysis doesn't require Pro's reasoning capability
- User-facing latency matters more than marginally better output
- Cost savings fund more features

### 3. Why Keyword-Based Analytics for Free Tier?
- Zero API cost
- Instant results (no latency)
- Works offline
- Provides value before paywall

### 4. Why Persona-Based Prompts?
- User choice increases engagement
- Different users want different styles
- Easier to maintain distinct voices
- A/B testable for optimization

### 5. Why Weekly Limits on Premium ML Features?
- Prevent API cost abuse
- Encourage daily journaling (need more data for better analysis)
- Create anticipation/value perception

### 6. Why No TensorFlow.js Client-Side ML?
- Bundle size (~300KB) impacts mobile performance
- Gemini API is fast enough (~500ms)
- Simpler maintenance (single ML provider)
- Mobile memory constraints

---

## Current Limitations

### Technical Limitations
1. **No embeddings storage**: Can't do vector similarity search across dreams
2. **No persistent ML cache**: Expensive analyses aren't cached in DB
3. **No streaming**: Full response wait (could improve perceived latency)
4. **No fine-tuning**: Using base Gemini, not domain-tuned

### Accuracy Limitations
1. **Keyword analytics**: Miss semantic meaning (e.g., "not happy" counted as positive)
2. **No user feedback loop**: Can't learn from user corrections
3. **English-centric**: Keyword lists are English only
4. **Single-language prompts**: Non-English dreams may get worse analysis

### Data Limitations
1. **Cold start**: New users see demo data until 3+ dreams logged
2. **Sparse biometrics**: Many users don't fill profile
3. **No wearable integration**: Sleep quality is self-reported

---

## Specific Questions for Assessment

### Model & API Questions
1. Is `gemini-2.5-flash` the right model for dream analysis, or would a different model (Claude, GPT-4o-mini) provide meaningfully better interpretations?
2. Should we use a different model for different tasks (e.g., cheaper model for titles, better model for deep analysis)?
3. Is our prompt architecture (layered identity → persona → context → task) optimal, or is there a better structure?

### Analytics Strategy Questions
4. Are keyword-based emotion/theme analytics still valuable, or do they look amateurish compared to AI alternatives?
5. Should we replace keyword analytics with embedding-based similarity, and if so, how?
6. What analytics do users of dream/sleep apps actually care about?
7. What would make our analytics genuinely impressive/differentiated vs competitors?

### Feature Prioritization
8. What ML capabilities should we ADD that would be high-value for sleep/dream apps?
9. What are we doing that we should REMOVE as not useful or misleading?
10. Should we invest in client-side ML (TensorFlow.js) for offline/instant features?

### Technical Recommendations
11. Should we store dream embeddings in Supabase for similarity search?
12. Is our current rate limiting strategy (weekly for premium ML) appropriate?
13. How should we handle non-English dreams?
14. Should we add user feedback mechanisms to improve AI quality over time?

### User Value Questions
15. Which of our current 112 insight cards are genuinely useful vs "vanity metrics"?
16. What's the right balance between AI-generated content and user reflection?
17. Are personality-based analysis styles (Oneironaut vs Dr. REM) actually valuable to users?

---

## Appendix: Full Code References

### Core AI Files
- [aiConfig.ts](file:///Users/aperry938/Desktop/projects/copy-of-somnia-ai_-intelligent-dream-journal/services/aiConfig.ts) - 519 lines, all prompts and personas
- [geminiService.ts](file:///Users/aperry938/Desktop/projects/copy-of-somnia-ai_-intelligent-dream-journal/services/geminiService.ts) - 563 lines, all Gemini API calls
- [mlAnalyticsService.ts](file:///Users/aperry938/Desktop/projects/copy-of-somnia-ai_-intelligent-dream-journal/services/mlAnalyticsService.ts) - 437 lines, new ML analytics

### Analytics Files
- [InsightsPage.tsx](file:///Users/aperry938/Desktop/projects/copy-of-somnia-ai_-intelligent-dream-journal/components/pages/InsightsPage.tsx) - Main insights dashboard
- [InsightsGrid.tsx](file:///Users/aperry938/Desktop/projects/copy-of-somnia-ai_-intelligent-dream-journal/components/insights/InsightsGrid.tsx) - Grid of insight cards
- [dreamPatterns.ts](file:///Users/aperry938/Desktop/projects/copy-of-somnia-ai_-intelligent-dream-journal/constants/dreamPatterns.ts) - Pattern detection keywords

### Type Definitions
- [types.ts](file:///Users/aperry938/Desktop/projects/copy-of-somnia-ai_-intelligent-dream-journal/types.ts) - All AI-related type definitions

### Rate Limiting & Subscription
- [rateLimitService.ts](file:///Users/aperry938/Desktop/projects/copy-of-somnia-ai_-intelligent-dream-journal/services/rateLimitService.ts)
- [secureSubscriptionService.ts](file:///Users/aperry938/Desktop/projects/copy-of-somnia-ai_-intelligent-dream-journal/services/secureSubscriptionService.ts)

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total services | 30 |
| AI-powered functions | 12 |
| Insight card components | 112 |
| Lines of prompt configuration | 519 |
| Unique AI personas | 5 |
| Art style presets | 8 |
| Keyword lists (for analytics) | 15+ |
| Premium ML features | 6 |

---

*Document generated: 2026-01-08*
*Somnia version: 1.1.0*
*For expert AI/ML architecture review*
