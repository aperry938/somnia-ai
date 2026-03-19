# Somnia.ai

### An Intelligent Sleep & Dream Wellness Application

![Somnia.ai Screenshot](https://raw.githubusercontent.com/aperry938/somnia-ai-wellness-app/main/somnia_promo.png) 

**Live Demo:** [https://aperry938.github.io/somnia-ai/](https://aperry938.github.io/somnia-ai/)

---

## Project Vision

Somnia.ai is a comprehensive wellness application designed to transform our relationship with sleep and the subconscious. It replaces the traditional alarm clock with an intelligent, multi-functional ecosystem that assists the user through the entire sleep cycle—from pre-sleep relaxation to post-waking dream analysis. By leveraging a state-of-the-art AI, Somnia.ai serves as a personalized sleep coach, dream interpreter, and data analyst, providing users with profound insights into their inner world.

## Core Features

### 🌙 The Sleep Gateway: Prepare for Rest
- **AI Sleep Coach:** A conversational AI providing personalized, evidence-based advice for improving sleep hygiene.
- **Evening Reflection:** Log qualitative data about your day—including a 1-5 rating and personal notes—to provide the AI with crucial context for analysis.
- **Science-Backed Soundscapes:** A library of programmatically generated audio environments (White, Pink, Brown Noise), binaural beats (Delta, Theta, Alpha waves), and high-fidelity natural sounds.
- **Live Guided Relaxation:** Interactive, multi-sensory breathing exercises (4-7-8 Breathing, Box Breathing) with perfectly synchronized audio-visual cues.
- **Sleep Preparation Checklist:** An interactive checklist to encourage scientifically-backed sleep hygiene practices.

### ☀️ The Ascent: Awaken with Intention
- **Adaptive Progressive Alarm:** A gentle yet effective alarm that starts with low-frequency tones and gradually increases in volume and complexity.
- **Smart Snooze:** 5-minute snooze that actually re-triggers the alarm after the delay.
- **The Dream Scribe:** Immediate dream capture via text or voice-to-text transcription powered by the browser's SpeechRecognition API.
- **Voice Control:** Hands-free commands (e.g., "Log Dream") to trigger key actions without touching the screen.
- **Morning Briefing:** Automated Text-to-Speech summary upon alarm dismissal, greeting you and reminding you to log your dreams.
- **Sleep Quality Rating:** A star-rating system to log subjective sleep quality for data correlation.

### 🔮 The Chronicle: Explore Your Inner World
- **AI-Powered Dream Analysis:** Each dream is analyzed by "The Oneironaut," an AI persona delivering deep interpretations based on psychology, mythology, and somatic wisdom.
- **Personalized Analysis:** The AI considers your biometrics (age, gender, sleep patterns) for more relevant interpretations.
- **AI-Generated Dream Visualization:** A unique artistic image is generated for every dream using Gemini's image generation.
- **Interactive AI Dialogue:** Engage in follow-up conversations with the AI to explore specific symbols and themes.
- **Persistent Journal:** A chronological log of all dreams with AI-generated titles and visual thumbnails.

### 📊 The Insights Hub: Discover Yourself
- **Biometrics & Personalization:** Log personal data (age, gender, average sleep) to fuel deeper AI customization.
- **Sleep Quality Trends:** A responsive line chart visualizing sleep quality over time.
- **AI Dream Weaving:** Synthesizes your entire dream journal to identify recurring themes and patterns.
- **AI Sleep Science:** Correlates sleep preparation habits with quality outcomes, providing data-driven recommendations.

### 🎨 Theme System
- **Auto Day/Night:** Theme automatically switches based on time of day (6am-7pm = day mode).
- **Manual Override:** Toggle between Auto, Day, and Night modes from the navigation bar.

### 🔗 Hardware Integration (Beta)
- **Bluetooth Sync:** Connect compatible sleep wearables (e.g., LucidMask) to import biometric data.
- **Biometric Correlation:** Analyzes heart rate and movement data to refine sleep stages (mock implementation).

---

## Technical Architecture

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS 4 (PostCSS) |
| **AI Integration** | Google Gemini API (gemini-2.5-flash, gemini-2.5-pro) |
| **Audio** | Web Audio API (programmatic synthesis) |
| **Mobile** | Capacitor 8 (iOS + Android) |
| **Data** | LocalStorage + Supabase (optional sync) |
| **Monetization** | RevenueCat |

---

## Setup & Running

### Prerequisites
- Node.js 18+ 
- npm or yarn
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Installation

```bash
# Clone the repository
git clone https://github.com/aperry938/somnia-ai-wellness-app.git
cd somnia-ai-wellness-app

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your Gemini API key to .env.local
# GEMINI_API_KEY=your_api_key_here
```

### Development

```bash
# Start the development server (runs on port 3001)
npm run dev

# Open http://localhost:3001 in your browser
```

### Production Build

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

---

## Project Structure

```
somnia-ai/
├── components/
│   ├── modals/          # Modal dialogs (AlarmRing, DreamScribe, etc.)
│   ├── pages/           # Main page components
│   └── shared/          # Reusable components (ErrorBoundary, LoadingStates)
├── contexts/
│   └── AppContext.tsx   # Global state management
├── hooks/
│   ├── useAlarmManager.ts
│   ├── useClock.ts
│   └── useSpeechRecognition.ts
├── services/
│   ├── audioService.ts  # Web Audio API engine
│   └── geminiService.ts # AI API integration
├── App.tsx
├── index.tsx            # React entry point
├── types.ts             # TypeScript type definitions
└── constants.ts         # App constants
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key for AI features |

---

## License

MIT License - Created by **Anthony Perry**