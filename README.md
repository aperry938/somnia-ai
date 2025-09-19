Somnia.ai - Intelligent Alarm & Dream Journal
Developed by Anthony Perry

Overview
Somnia.ai is a forward-thinking web application designed to be a comprehensive sleep and dream wellness companion. It integrates an intelligent alarm system, a sophisticated dream journal with AI-powered analysis and visualization, and a suite of science-backed relaxation tools. The core mission of this project is to provide users with a deeper understanding of their subconscious world while promoting healthier sleep habits through modern technology.

This application is built as a single-page application using modern HTML, CSS, and vanilla JavaScript, leveraging browser technologies like the Web Audio API and Local Storage for a seamless, client-side experience.

Core Features
Dynamic Day/Night UI: The application's aesthetic intelligently shifts between a light "Day" theme and a dark "Night" theme based on the user's local time, creating an environment conducive to both waking and winding down.

Progressive Alarm System: The alarm sound is designed for a gentle awakening, starting with a soft, low-frequency tone that gradually increases in volume and complexity to wake the user at the lowest necessary intensity.

AI-Powered Dream Journal:

Dream Scribe: Users can log their dreams via text or voice-to-text transcription immediately upon waking.

AI Analysis: Each dream is analyzed by an AI to provide thematic insights and a concluding integration prompt for self-reflection.

AI Visualization: A unique, surrealist image is generated for each dream, providing a stunning visual representation of the subconscious narrative.

Deepen Analysis: Users can engage in a follow-up conversation with the AI to explore specific symbols and themes from their dreams in more detail.

Sleep Gateway: A comprehensive suite of tools to prepare for restful sleep:

AI Sleep Coach: A conversational AI that provides personalized, science-based sleep advice and guidance.

Soundscapes: A library of six programmatically generated, high-fidelity audio environments (White, Pink, Brown noise; Delta, Theta, Alpha waves) with customizable timers.

Guided Relaxation: Interactive, audio-visual breathing exercises (4-7-8 and Box Breathing) and a pre-sleep checklist to promote good sleep hygiene.

The Observatory (User Profile):

Data Visualization: A dynamic radar chart visualizes recurring dream themes over time.

Gamification: An intelligent achievement system rewards users for consistent journaling and mindful practices.

Personalization: Users can input biometric data to create a foundation for future AI-driven personalization.

Technical Stack
Frontend: HTML5, CSS3, Vanilla JavaScript (ESM)

Styling: Tailwind CSS for rapid, utility-first styling.

APIs:

Web Audio API: Used for programmatically generating all alarm sounds, soundscapes, and synchronized breathing exercise audio.

Web Speech API: Powers the voice-to-text transcription feature in the Dream Scribe.

Google AI JavaScript SDK: The underlying technology for all generative AI features, including dream analysis, image generation, and the AI Sleep Coach.

Storage: Browser Local Storage is used for all client-side data persistence (alarms, dreams, preferences).

Setup & Installation
As a self-contained HTML file, Somnia.ai requires no complex setup.

Clone the repository:

git clone [https://github.com/your-username/somnia-ai.git](https://github.com/your-username/somnia-ai.git)

Open the somnia_app.html file in any modern web browser.

Future Development
While this project is a robust proof-of-concept, future iterations could include:

Backend Integration: Migrating from Local Storage to a database like Firebase for cross-device synchronization and more robust data management.

Advanced Data Analysis: Leveraging user biometric and sleep habit data to provide more personalized AI insights and proactive recommendations.

Native Application: Developing native iOS and Android versions to fully integrate with OS-level features like notifications and background processes.

This project was conceived and developed by Anthony Perry.