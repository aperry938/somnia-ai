import { Dream } from '../types';

/**
 * Demo dreams for showcasing insights to new users
 * These populate the insights view when user has < 3 real dreams
 */
export const DEMO_DREAMS: Dream[] = [
    {
        id: -1,
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        dreamText: "I was flying over a vast ocean at sunset. The water below sparkled with golden light. I felt completely free and at peace. A friendly dolphin joined me, swimming through the air alongside me. We communicated without words.",
        sleepQuality: 5,
        title: "Flying Over Golden Waters",
        imageUrl: null,
        aiAnalysis: null,
        chatHistory: [],
        tags: ['flying', 'ocean', 'freedom', 'animals'],
        mood: 'peaceful'
    },
    {
        id: -2,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        dreamText: "I found myself in my childhood home, but it was much larger with secret rooms I had never discovered. My grandmother was there, cooking her famous soup. The smell was so vivid and comforting. She gave me advice about a problem I've been facing.",
        sleepQuality: 4,
        title: "Grandmother's Secret Kitchen",
        imageUrl: null,
        aiAnalysis: null,
        chatHistory: [],
        tags: ['family', 'childhood', 'home', 'wisdom'],
        mood: 'peaceful'
    },
    {
        id: -3,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        dreamText: "I was being chased through a dark forest by something I couldn't see. Every time I looked back, the shadows seemed closer. Then I realized I could control the dream - I stopped running, turned around, and the shadow transformed into a beautiful glowing butterfly.",
        sleepQuality: 3,
        title: "Shadow to Butterfly",
        imageUrl: null,
        aiAnalysis: null,
        chatHistory: [],
        tags: ['lucid', 'transformation', 'fear', 'nature'],
        mood: 'anxious'
    },
    {
        id: -4,
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        dreamText: "I was taking an exam in a huge auditorium but couldn't find the right room. The hallways kept shifting like a maze. Other students walked past me confidently. When I finally found the room, I realized I had studied the wrong subject entirely.",
        sleepQuality: 2,
        title: "The Endless Exam Maze",
        imageUrl: null,
        aiAnalysis: null,
        chatHistory: [],
        tags: ['school', 'anxiety', 'lost', 'stress'],
        mood: 'anxious'
    },
    {
        id: -5,
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        dreamText: "I was at a concert where the music created visible colors in the air. Each note painted swirls of purple, blue, and gold. I could taste the music - sweet and electric. My best friend was there, and we danced until dawn.",
        sleepQuality: 5,
        title: "Synesthesia Symphony",
        imageUrl: null,
        aiAnalysis: null,
        chatHistory: [],
        tags: ['music', 'colors', 'friends', 'joy'],
        mood: 'joyful'
    },
    {
        id: -6,
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        dreamText: "I discovered I could breathe underwater. I swam down into deep caves filled with bioluminescent creatures. An ancient turtle spoke to me about patience and the flow of time. I felt I understood something profound when I woke up.",
        sleepQuality: 4,
        title: "The Wise Ocean Deep",
        imageUrl: null,
        aiAnalysis: null,
        chatHistory: [],
        tags: ['water', 'wisdom', 'animals', 'spiritual'],
        mood: 'peaceful'
    },
    {
        id: -7,
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        dreamText: "I was driving a car but realized I was in the back seat with no one at the wheel. The car kept going faster on a winding mountain road. I climbed forward and took control just in time. The view from the summit was breathtaking.",
        sleepQuality: 3,
        title: "Taking the Wheel",
        imageUrl: null,
        aiAnalysis: null,
        chatHistory: [],
        tags: ['control', 'vehicles', 'fear', 'success'],
        mood: 'anxious'
    },
    {
        id: -8,
        timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        dreamText: "I met a version of myself from the future. They looked peaceful and content. We walked through a garden together, and they showed me that everything would work out. I woke up feeling hopeful and less worried about my decisions.",
        sleepQuality: 5,
        title: "Future Self Garden Walk",
        imageUrl: null,
        aiAnalysis: null,
        chatHistory: [],
        tags: ['future', 'self', 'garden', 'hope'],
        mood: 'joyful'
    }
];

export const isDemoDream = (dream: Dream): boolean => dream.id < 0;

/**
 * Calibration dream with full AI analysis to show new users
 * what Somnia can do before they log their first dream
 */
export const CALIBRATION_DREAM: Dream = {
    id: -100,
    timestamp: new Date().toISOString(),
    dreamText: "I was rushing through an unfamiliar building, trying to find a meeting room. The hallways kept changing—doors I remembered weren't where they should be. I checked my phone but the screen was blurry. Finally found the room, but everyone was already leaving. My old mentor from years ago was there and smiled at me, saying 'You made it. That's what matters.' The panic faded and I felt a wave of relief wash over me.",
    sleepQuality: 4,
    title: "The Shifting Hallways",
    imageUrl: null,
    aiAnalysis: {
        title: "Navigating Uncertainty",
        analysis: [
            {
                title: "🏢 The Labyrinth of Change",
                content: "Buildings that shift and change often represent transitional periods in life—when the familiar structures we relied on no longer feel stable. The changing hallways suggest you may be navigating a situation where 'the rules' feel unclear or the path forward isn't obvious. This is your psyche processing adaptation to new circumstances."
            },
            {
                title: "📱 The Blurred Screen",
                content: "Technology failing in dreams—phones not working, screens unreadable—typically signals that your usual coping mechanisms or 'quick fixes' feel inadequate right now. The blurry phone suggests a need to rely less on external validation or information, and more on internal navigation."
            },
            {
                title: "👤 The Mentor's Reassurance",
                content: "Your old mentor appearing at the resolution is significant—they represent internalized wisdom from your past. Their message 'You made it. That's what matters' reveals a core insight: your unconscious already knows that showing up matters more than perfection. This figure lives within you as a source of self-compassion."
            },
            {
                title: "🌊 The Relief Wave",
                content: "The emotional shift from panic to relief at the end indicates this isn't a stress dream—it's a processing dream. Your mind rehearsed anxiety and then resolved it, suggesting you're building emotional resilience around whatever uncertainty you're facing."
            }
        ],
        integration: {
            title: "✨ Integration Practice",
            content: "This dream is teaching you something important: the fear of being 'too late' or 'not enough' is often louder than reality. Today, when you notice perfectionist anxiety arising, recall your mentor's words. Consider: What would it mean to simply 'show up' rather than arrive perfectly? The relief you felt in the dream is available to you now—your unconscious has already rehearsed letting go."
        },
        telemetry: {
            valence: 0.45,
            arousal: 0.7,
            lucidity: 15,
            tags: ['transition', 'self-compassion', 'processing', 'reassurance']
        }
    },
    chatHistory: [],
    tags: ['buildings', 'searching', 'mentor', 'relief', 'technology'],
    mood: 'anxious'
};
