/**
 * Sample Data Generator for Somnia.ai
 *
 * Generates 1000 realistic dreams with varied:
 * - Timestamps (spanning 2 years)
 * - Sleep quality ratings
 * - Moods
 * - Tags
 * - AI analyses
 * - Telemetry data
 * - Chat histories
 * - Sleep aids
 *
 * Usage in browser console:
 *   Copy the injectSampleDataBrowser code and paste in console
 *
 * Or run via node to generate JSON file
 */

import { Dream, SleepEntry, DreamMood, SleepAids, DreamAnalysis, ChatMessage, LucidTechnique } from '../types';

// Dream content templates for realistic variety
const DREAM_TEMPLATES = [
    { text: "I was soaring above {location}, feeling completely free. The wind rushed past me as I {action}. Below, I could see {detail}.", tags: ['flying', 'freedom'], category: 'flying' },
    { text: "Started running and suddenly lifted off the ground near {location}. I flew higher and higher until {event}. It felt {emotion}.", tags: ['flying', 'running'], category: 'flying' },
    { text: "Something was chasing me through {location}. I kept running but my legs felt heavy. Then {event}.", tags: ['chase', 'fear'], category: 'nightmare' },
    { text: "I was being pursued by {creature} in {location}. No matter how fast I ran, it kept getting closer. Finally {event}.", tags: ['chase', 'escape'], category: 'nightmare' },
    { text: "I found myself swimming in {water_location}. The water was {water_quality}. I could {water_action}.", tags: ['water', 'swimming'], category: 'water' },
    { text: "A massive wave approached from {direction}. I {wave_action}. The water felt {emotion}.", tags: ['water', 'ocean', 'waves'], category: 'water' },
    { text: "I was standing on {high_place} when suddenly the ground gave way. As I fell, I {falling_action}. Right before hitting the ground, {event}.", tags: ['falling'], category: 'falling' },
    { text: "I looked in the mirror and noticed my teeth were {teeth_condition}. I tried to {teeth_action} but {event}.", tags: ['teeth', 'body'], category: 'anxiety' },
    { text: "I was back in {school_type} and realized I had a {test_type} I hadn't studied for. I {school_action}.", tags: ['school', 'test', 'anxiety'], category: 'anxiety' },
    { text: "At work, {work_event}. My boss {boss_action}. I felt {emotion}.", tags: ['work', 'stress'], category: 'work' },
    { text: "My {family_member} appeared in my dream. We were {family_activity} in {location}. They told me {message}.", tags: ['family'], category: 'family' },
    { text: "I dreamed about my childhood home. {family_member} was there. We {family_activity}.", tags: ['family', 'childhood', 'home'], category: 'family' },
    { text: "I discovered a {discovery} in {location}. Inside, there were {contents}. I decided to {adventure_action}.", tags: ['adventure', 'discovery'], category: 'adventure' },
    { text: "I was on a quest to find {quest_object}. Along the way, I met {character} who {character_action}.", tags: ['adventure', 'quest'], category: 'adventure' },
    { text: "I suddenly realized I was dreaming while {activity}. I decided to {lucid_action}. Everything became {lucid_quality}.", tags: ['lucid'], category: 'lucid' },
    { text: "The moment I became aware I was dreaming, I {lucid_action}. The dream {lucid_response}.", tags: ['lucid', 'control'], category: 'lucid' },
    { text: "I was with {romantic_person} at {romantic_location}. We {romantic_activity}. I felt {emotion}.", tags: ['romance', 'love'], category: 'romantic' },
    { text: "A {animal} appeared in my dream. It {animal_action}. I {response}.", tags: ['animals'], category: 'animals' },
    { text: "I was transformed into a {animal}. I could {animal_ability}. The world looked {perception}.", tags: ['animals', 'transformation'], category: 'transformation' },
    { text: "I met {celebrity_type} at {celebrity_location}. They {celebrity_action}. We {activity}.", tags: ['celebrity'], category: 'celebrity' },
    { text: "I dreamed about {death_subject}. The atmosphere was {atmosphere}. I felt {emotion}.", tags: ['death', 'loss'], category: 'profound' },
    { text: "I was traveling to {travel_destination}. The journey was {journey_quality}. I saw {travel_sight}.", tags: ['travel', 'journey'], category: 'travel' },
    { text: "I encountered a {supernatural_being} in {supernatural_location}. It {supernatural_action}. I {response}.", tags: ['supernatural', 'mystical'], category: 'supernatural' },
    { text: "My phone {tech_malfunction}. I tried to {tech_action} but {tech_result}. Everyone around me {crowd_response}.", tags: ['technology'], category: 'modern' },
    { text: "I was walking through a {nature_location}. The {nature_element} was {nature_quality}. I discovered {nature_discovery}.", tags: ['nature'], category: 'nature' },
    { text: "I was at a {food_location} where they served {food_item}. When I tried to eat it, {food_event}.", tags: ['food'], category: 'daily' },
    { text: "I heard {music_type} music coming from {music_source}. It made me feel {emotion}. I {music_action}.", tags: ['music', 'sound'], category: 'sensory' },
    { text: "I was driving a {vehicle} through {vehicle_location}. Suddenly {vehicle_event}. I {vehicle_response}.", tags: ['vehicles', 'travel'], category: 'travel' },
    { text: "I discovered a hidden {room_type} in my house. Inside was {room_contents}. I felt {emotion}.", tags: ['house', 'discovery'], category: 'house' },
];

const FILL_VALUES: Record<string, string[]> = {
    location: ['a vast meadow', 'my childhood neighborhood', 'a futuristic city', 'an ancient forest', 'a beach at sunset', 'downtown', 'a mountain peak', 'a mysterious castle', 'a shopping mall', 'a hospital corridor', 'a train station', 'an airport', 'a library', 'a museum', 'an abandoned building'],
    action: ['swooped down toward the trees', 'performed loops in the air', 'flew toward the sun', 'glided effortlessly', 'struggled to stay airborne', 'raced against birds'],
    detail: ['tiny houses and winding rivers', 'people pointing up at me', 'my own body still on the ground', 'endless green fields', 'a sprawling city'],
    event: ['I woke up', 'the scene shifted completely', 'everything went dark', 'I found myself somewhere else', 'time seemed to stop', 'I gained a new ability'],
    emotion: ['incredibly peaceful', 'anxious and worried', 'euphoric', 'confused', 'nostalgic', 'terrified', 'serene', 'melancholic', 'excited', 'overwhelmed'],
    creature: ['a shadowy figure', 'a wild animal', 'someone I knew', 'a monster', 'multiple people', 'something invisible'],
    water_location: ['a crystal clear lake', 'the deep ocean', 'a swimming pool', 'a flooded street', 'an underground cave with water'],
    water_quality: ['warm and inviting', 'cold and dark', 'glowing with bioluminescence', 'perfectly still', 'turbulent'],
    water_action: ['breathe underwater', 'see everything clearly', 'communicate with sea creatures', 'swim incredibly fast'],
    direction: ['the horizon', 'behind me', 'all directions at once'],
    wave_action: ['dove under it', 'tried to run', 'surfed it', 'was swept away'],
    high_place: ['a tall building', 'a cliff', 'a bridge', 'stairs that went nowhere', 'a floating platform'],
    falling_action: ['felt strangely calm', 'screamed', 'tried to fly', 'watched the ground approach'],
    teeth_condition: ['falling out', 'crumbling', 'growing longer', 'turning to dust', 'completely gone'],
    teeth_action: ['catch them', 'put them back', 'hide it from others'],
    school_type: ['high school', 'college', 'elementary school', 'a school I didn\'t recognize'],
    test_type: ['final exam', 'presentation', 'important test', 'class I forgot I was enrolled in'],
    school_action: ['panicked and searched for the classroom', 'realized I was also not wearing pants', 'tried to fake my way through'],
    work_event: ['I had an important meeting I forgot about', 'my computer wouldn\'t work', 'I couldn\'t find my desk', 'everyone was speaking a language I didn\'t understand'],
    boss_action: ['was disappointed in me', 'turned into someone else', 'gave me an impossible task', 'didn\'t recognize me'],
    family_member: ['mother', 'father', 'grandmother', 'grandfather', 'sibling', 'cousin', 'uncle', 'aunt', 'childhood friend'],
    family_activity: ['having dinner', 'looking at old photos', 'celebrating something', 'having an important conversation', 'doing everyday activities'],
    message: ['something I needed to hear', 'a warning', 'that they were proud of me', 'something cryptic I couldn\'t understand'],
    discovery: ['hidden door', 'secret passage', 'treasure chest', 'ancient artifact', 'glowing portal'],
    contents: ['old photographs', 'gold coins', 'strange symbols', 'a letter addressed to me', 'nothing but darkness'],
    adventure_action: ['explore further', 'take something', 'run away', 'call for help'],
    quest_object: ['a magical artifact', 'a lost city', 'a cure', 'answers about my past', 'a missing person'],
    character: ['a wise old person', 'a talking animal', 'a mysterious stranger', 'a version of myself', 'someone from my past'],
    character_action: ['gave me a cryptic clue', 'warned me of danger', 'joined my journey', 'betrayed me'],
    activity: ['walking through a garden', 'having a conversation', 'watching the sunset', 'exploring a new place'],
    lucid_action: ['fly', 'change the scenery', 'summon someone', 'explore the dream world', 'ask the dream questions'],
    lucid_quality: ['incredibly vivid', 'slightly unstable', 'hyper-real', 'more controlled'],
    lucid_response: ['stabilized', 'started to fade', 'became even more vivid', 'shifted to something else'],
    romantic_person: ['someone I know', 'a stranger who felt familiar', 'my partner', 'a celebrity', 'someone from my past'],
    romantic_location: ['a beautiful garden', 'a cozy restaurant', 'a moonlit beach', 'a rooftop with city views'],
    romantic_activity: ['talked for hours', 'danced', 'shared a meaningful moment', 'walked together'],
    animal: ['wolf', 'eagle', 'snake', 'cat', 'horse', 'dolphin', 'bear', 'owl', 'lion', 'deer'],
    animal_action: ['spoke to me', 'guided me somewhere', 'protected me', 'attacked', 'transformed into something else'],
    animal_ability: ['run incredibly fast', 'see in the dark', 'fly', 'sense things humans can\'t', 'communicate with other animals'],
    perception: ['completely different', 'more colorful', 'in slow motion', 'sharper and more detailed'],
    response: ['followed it', 'ran away', 'tried to communicate', 'watched in amazement', 'felt a deep connection'],
    celebrity_type: ['a famous musician', 'an actor', 'a historical figure', 'a world leader', 'a sports star'],
    celebrity_location: ['a party', 'backstage', 'on the street', 'at their home'],
    celebrity_action: ['recognized me', 'asked for my advice', 'performed just for me', 'revealed a secret'],
    death_subject: ['losing someone close', 'my own death', 'attending a funeral', 'visiting a cemetery'],
    atmosphere: ['peaceful', 'heavy with grief', 'strangely beautiful', 'dreamlike and surreal'],
    travel_destination: ['a country I\'ve always wanted to visit', 'somewhere completely unknown', 'a place from my childhood', 'a fictional world'],
    journey_quality: ['smooth and pleasant', 'full of obstacles', 'surreal with changing landscapes', 'never-ending'],
    travel_sight: ['incredible architecture', 'people speaking languages I understood', 'myself in another life', 'impossible landscapes'],
    supernatural_being: ['ghost', 'angel', 'demon', 'spirit guide', 'alien', 'mythical creature'],
    supernatural_location: ['an otherworldly realm', 'my bedroom', 'between dimensions', 'a sacred place'],
    supernatural_action: ['delivered a message', 'showed me visions', 'tested me', 'offered me a choice'],
    tech_malfunction: ['wouldn\'t turn on', 'showed strange messages', 'connected me to unknown people', 'displayed my secrets'],
    tech_action: ['fix it', 'get help', 'use it anyway'],
    tech_result: ['it got worse', 'everyone could see what was happening', 'it worked in unexpected ways'],
    crowd_response: ['stared at me', 'helped', 'ignored the situation', 'experienced the same thing'],
    nature_location: ['dense forest', 'open field of flowers', 'misty mountain', 'desert', 'jungle'],
    nature_element: ['sunlight', 'wind', 'silence', 'wildlife', 'vegetation'],
    nature_quality: ['magical', 'overwhelming', 'peaceful', 'ominous', 'alive with energy'],
    nature_discovery: ['a hidden waterfall', 'ancient ruins', 'a creature watching me', 'a path I felt compelled to follow'],
    food_location: ['restaurant', 'banquet', 'street market', 'my kitchen'],
    food_item: ['the most delicious food I\'d ever seen', 'something strange', 'food from my childhood', 'an endless buffet'],
    food_event: ['it tasted like nothing', 'it kept multiplying', 'I couldn\'t eat no matter how hard I tried', 'the taste was indescribable'],
    music_type: ['hauntingly beautiful', 'familiar but unplaceable', 'otherworldly', 'from my childhood'],
    music_source: ['nowhere and everywhere', 'a distant room', 'inside my own head', 'a mysterious musician'],
    music_action: ['followed the sound', 'started to dance', 'tried to find the source', 'became part of the music'],
    vehicle: ['car', 'train', 'airplane', 'bus', 'spaceship', 'bicycle', 'motorcycle'],
    vehicle_location: ['an unfamiliar city', 'an endless highway', 'underwater', 'through the sky', 'through time'],
    vehicle_event: ['the brakes stopped working', 'I lost control', 'the vehicle transformed', 'we arrived somewhere impossible'],
    vehicle_response: ['stayed calm', 'panicked', 'enjoyed the ride', 'tried to escape'],
    room_type: ['room', 'basement', 'attic', 'wing of the house', 'underground tunnel'],
    room_contents: ['furniture from my past', 'people I\'d forgotten', 'treasures', 'my deepest fears', 'another version of my home'],
};

const MOODS: DreamMood[] = ['peaceful', 'anxious', 'joyful', 'confused', 'nostalgic', 'fearful', 'sad', 'neutral', 'hopeful'];
const ALL_TAGS = ['flying', 'falling', 'chase', 'water', 'ocean', 'swimming', 'family', 'work', 'school', 'lucid', 'nightmare', 'recurring', 'vivid', 'prophetic', 'adventure', 'romance', 'death', 'animals', 'transformation', 'supernatural', 'travel', 'food', 'music', 'nature', 'technology', 'celebrity', 'childhood', 'future', 'past', 'strangers', 'friends', 'house', 'vehicle', 'teeth', 'naked', 'late', 'lost', 'trapped', 'discovery', 'peaceful', 'intense', 'symbolic', 'abstract', 'realistic', 'fantasy'];
const ANALYSIS_THEMES = ['transformation and change', 'inner conflict', 'desire for freedom', 'unresolved emotions', 'fear of loss', 'search for meaning', 'personal growth', 'relationship dynamics', 'career anxieties', 'self-discovery', 'letting go', 'embracing the unknown', 'confronting fears', 'healing journey', 'creative expression', 'life transitions'];
const SYMBOLS = ['water (emotions, unconscious)', 'flying (freedom, ambition)', 'falling (loss of control)', 'teeth (anxiety, self-image)', 'house (self, psyche)', 'animals (instincts)', 'vehicles (life direction)', 'chase (avoidance)', 'death (transformation)', 'stairs (progress, transition)', 'doors (opportunities)', 'mirrors (self-reflection)'];
const SOUNDSCAPES = ['rain', 'ocean', 'forest', 'fireplace', 'white-noise', 'pink-noise', 'binaural-theta'];
const RELAXATIONS = ['body-scan', 'breathing-4-7-8', 'progressive-relaxation', 'guided-visualization'];
const LUCID_TECHNIQUES: LucidTechnique[] = ['WILD', 'MILD', 'WBTB', 'SSILD', 'reality_check', 'none'];

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: readonly T[] | T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomChoices<T>(arr: readonly T[] | T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function fillTemplate(template: string): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
        const values = FILL_VALUES[key];
        return values ? randomChoice(values) : `{${key}}`;
    });
}

function generateAnalysis(dreamText: string, tags: string[]): DreamAnalysis {
    const theme = randomChoice(ANALYSIS_THEMES);
    const symbols = randomChoices(SYMBOLS, randomInt(1, 3));

    return {
        title: randomChoice(['Journey Through the Unconscious', 'Reflections of the Inner Self', 'Messages from the Dream World', 'Symbols of Transformation', 'The Language of Dreams', 'Whispers of the Subconscious', 'Echoes of the Soul', 'Visions of Change']),
        analysis: [
            { title: 'Core Theme', content: `This dream appears to center around ${theme}. The imagery suggests your subconscious is processing ${randomChoice(['recent experiences', 'deep-seated emotions', 'upcoming challenges', 'past memories', 'future possibilities'])}.` },
            { title: 'Symbolic Elements', content: `Key symbols present include: ${symbols.join(', ')}. These elements often represent ${randomChoice(['aspects of your inner world', 'external pressures', 'hidden desires', 'unacknowledged fears', 'potential for growth'])}.` },
            { title: 'Emotional Landscape', content: `The emotional tone of this dream suggests ${randomChoice(['a need for reflection', 'processing of daily stress', 'excitement about possibilities', 'working through anxieties', 'integration of experiences'])}. Pay attention to how these feelings manifest in your waking life.` }
        ],
        integration: { title: 'Integration Practice', content: randomChoice(['Consider journaling about what aspects of this dream resonate with your current life situation.', 'Try a brief meditation focusing on the central image from this dream.', 'Notice if similar themes appear in your waking thoughts today.', 'Discuss this dream with someone you trust to gain new perspectives.', 'Draw or sketch the most vivid scene from this dream.']) },
        imagePrompt: `Dreamlike ${randomChoice(['surreal', 'ethereal', 'mystical', 'atmospheric'])} scene of ${dreamText.slice(0, 50)}...`,
        telemetry: { valence: randomInt(-100, 100) / 100, arousal: randomInt(0, 100) / 100, lucidity: randomInt(0, 100), tags: [...tags, ...randomChoices(['Analyzed', 'Symbolic', 'Emotional', 'Vivid', 'Recurring'], randomInt(1, 3))] }
    };
}

function generateChatHistory(): ChatMessage[] {
    if (Math.random() > 0.3) return [];
    const exchanges = randomInt(1, 4);
    const history: ChatMessage[] = [];
    let msgId = 1;
    const userQuestions = ['What do you think the water symbolized?', 'Why do I keep having dreams like this?', 'Is this dream trying to tell me something?', 'What does the recurring theme mean?', 'How can I have more lucid dreams?', 'Should I be worried about this dream?', 'What does my subconscious want me to know?'];
    const assistantResponses = ['The water in your dream often represents emotions and the unconscious mind.', 'Recurring dreams often indicate unresolved issues or persistent thoughts.', 'Dreams communicate through symbols and metaphors.', 'This theme might relate to changes or transitions in your waking life.', 'Lucid dreaming can be cultivated through reality checks, dream journaling, and intention setting.', 'Most dreams are simply processing daily experiences.', 'Your subconscious communicates through imagery and emotion.'];

    for (let i = 0; i < exchanges; i++) {
        history.push({ id: msgId++, role: 'user', parts: [{ text: randomChoice(userQuestions) }] });
        history.push({ id: msgId++, role: 'model', parts: [{ text: randomChoice(assistantResponses) }] });
    }
    return history;
}

function generateSleepAids(): SleepAids {
    const aids: SleepAids = {};
    if (Math.random() > 0.5) aids.sound = randomChoice(SOUNDSCAPES);
    if (aids.sound && Math.random() > 0.3) aids.soundDuration = randomInt(15, 60);
    if (aids.sound && Math.random() > 0.5) aids.volume = randomInt(30, 80) / 100;
    if (Math.random() > 0.6) aids.relaxation = randomChoice(RELAXATIONS);
    if (aids.relaxation && Math.random() > 0.3) aids.relaxationDuration = randomInt(5, 20);
    if (Math.random() > 0.7) aids.dayRating = randomInt(1, 5);
    if (Math.random() > 0.8) aids.dayNotes = randomChoice(['Had a stressful day at work', 'Feeling good today', 'Exercised in the morning', 'Late night, tired', 'Relaxing day off', 'Important meeting tomorrow', 'Celebrated with friends']);
    if (Math.random() > 0.6) aids.lucidTechnique = randomChoice(LUCID_TECHNIQUES);
    if (Math.random() > 0.7) aids.realityChecksPerformed = randomInt(0, 10);
    if (Math.random() > 0.8) aids.totalPrepTime = randomInt(300, 1800);
    return aids;
}

export function generateSampleDreams(count: number = 1000): Dream[] {
    const dreams: Dream[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.pow(Math.random(), 0.5) * 730);
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - daysAgo);
        timestamp.setHours(randomInt(5, 10), randomInt(0, 59), 0, 0);

        const template = randomChoice(DREAM_TEMPLATES);
        const dreamText = fillTemplate(template.text);
        const baseTags = [...template.tags];
        const additionalTags = randomChoices(ALL_TAGS, randomInt(0, 3));
        const allTags = [...baseTags, ...additionalTags];
        const tags = allTags.filter((tag, index) => allTags.indexOf(tag) === index);

        const hasAnalysis = Math.random() > 0.2;
        const mood = Math.random() > 0.3 ? randomChoice(MOODS) : undefined;
        const sleepQuality = Math.random() > 0.1 ? randomInt(1, 5) : null;

        const dream: Dream = {
            id: i + 1,
            timestamp: timestamp.toISOString(),
            dreamText,
            title: hasAnalysis ? randomChoice(['Journey Through ' + randomChoice(['Mist', 'Light', 'Shadow', 'Time', 'Memory']), 'The ' + randomChoice(['Hidden', 'Lost', 'Forgotten', 'Secret', 'Endless']) + ' ' + randomChoice(['Path', 'Door', 'Room', 'Garden', 'Ocean']), randomChoice(['Echoes', 'Whispers', 'Visions', 'Dreams', 'Memories']) + ' of ' + randomChoice(['Tomorrow', 'Yesterday', 'Home', 'Change', 'Hope']), 'A ' + randomChoice(['Strange', 'Vivid', 'Peaceful', 'Wild', 'Silent']) + ' ' + randomChoice(['Night', 'Journey', 'Encounter', 'Discovery', 'Flight'])]) : 'Untitled Dream',
            sleepQuality,
            imageUrl: hasAnalysis && Math.random() > 0.5 ? `https://picsum.photos/seed/${i}/400/300` : null,
            aiAnalysis: hasAnalysis ? generateAnalysis(dreamText, tags) : null,
            chatHistory: generateChatHistory(),
            sleepAids: Math.random() > 0.4 ? generateSleepAids() : undefined,
            mood,
            tags: tags.length > 0 ? tags : undefined,
        };

        if (hasAnalysis && Math.random() > 0.7) {
            dream.embedding = Array.from({ length: 768 }, () => (Math.random() - 0.5) * 2);
        }

        dreams.push(dream);
    }

    dreams.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    dreams.forEach((dream, index) => { dream.id = index + 1; });

    return dreams;
}

export function generateSampleSleepEntries(dreams: Dream[]): SleepEntry[] {
    const entries: SleepEntry[] = [];
    const dreamsByDate = new Map<string, Dream[]>();

    dreams.forEach(dream => {
        const dateKey = new Date(dream.timestamp).toISOString().split('T')[0];
        if (!dreamsByDate.has(dateKey)) dreamsByDate.set(dateKey, []);
        dreamsByDate.get(dateKey)!.push(dream);
    });

    let entryId = 1;
    dreamsByDate.forEach((dateDreams, dateKey) => {
        const createdAt = new Date(dateDreams[0].timestamp);
        createdAt.setHours(randomInt(6, 10), randomInt(0, 59), 0, 0);

        const entry: SleepEntry = {
            id: entryId++,
            date: dateKey,
            sleepQuality: dateDreams[0].sleepQuality || randomInt(1, 5),
            sleepAids: dateDreams[0].sleepAids,
            alarmTime: `${String(randomInt(5, 9)).padStart(2, '0')}:${String(randomInt(0, 5) * 10).padStart(2, '0')}`,
            alarmSoundId: randomChoice(['somnia', 'gentle', 'progressive', 'chime']),
            dreamIds: dateDreams.map(d => d.id),
            createdAt: createdAt.toISOString(),
        };

        if (Math.random() > 0.5) {
            entry.wakeData = { snoozeCount: randomInt(0, 3), timeToSilence: randomInt(5, 60), alertnessBoostUsed: Math.random() > 0.7, alarmType: Math.random() > 0.3 ? 'manual' : 'smart' };
        }

        entries.push(entry);
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function generateSampleData(dreamCount: number = 1000) {
    console.log(`Generating ${dreamCount} sample dreams...`);
    const dreams = generateSampleDreams(dreamCount);
    const sleepEntries = generateSampleSleepEntries(dreams);

    const data = {
        dreams,
        sleepEntries,
        generatedAt: new Date().toISOString(),
        stats: {
            totalDreams: dreams.length,
            dreamsWithAnalysis: dreams.filter(d => d.aiAnalysis).length,
            dreamsWithImages: dreams.filter(d => d.imageUrl).length,
            dreamsWithTags: dreams.filter(d => d.tags && d.tags.length > 0).length,
            dreamsWithMood: dreams.filter(d => d.mood).length,
            dreamsWithChat: dreams.filter(d => d.chatHistory && d.chatHistory.length > 0).length,
            dreamsWithEmbedding: dreams.filter(d => d.embedding).length,
            sleepEntries: sleepEntries.length,
            dateRange: { oldest: dreams[dreams.length - 1]?.timestamp, newest: dreams[0]?.timestamp }
        }
    };

    console.log('Generation complete:', data.stats);
    return data;
}

export function injectSampleData(dreamCount: number = 1000): void {
    const data = generateSampleData(dreamCount);
    localStorage.setItem('somnia_dreams', JSON.stringify(data.dreams));
    localStorage.setItem('somnia_sleep_entries', JSON.stringify(data.sleepEntries));
    console.log('Sample data injected into localStorage!');
    console.log('Stats:', data.stats);
    console.log('Refresh the page to see the data.');
}

// COPY THIS INTO BROWSER CONSOLE TO INJECT 1000 DREAMS:
export const BROWSER_INJECT_SCRIPT = `
(function() {
    const DREAM_TEXTS = [
        "I was flying over a beautiful landscape, feeling completely free.",
        "Something was chasing me through dark corridors.",
        "I found myself swimming in crystal clear water.",
        "I was falling from a great height but felt strangely calm.",
        "My teeth started falling out one by one.",
        "I was back in school for an exam I hadn't studied for.",
        "I met my grandmother who passed away years ago.",
        "I discovered a hidden room in my house.",
        "I could suddenly speak every language.",
        "I was transformed into an eagle soaring through clouds.",
        "I was at a party but didn't recognize anyone.",
        "I was driving a car but couldn't control the brakes.",
        "I was underwater but could breathe normally.",
        "I was running but my legs felt like they were stuck in mud.",
        "I was on stage but forgot all my lines."
    ];
    const MOODS = ['peaceful', 'anxious', 'joyful', 'confused', 'nostalgic', 'fearful', 'sad', 'neutral', 'hopeful'];
    const TAGS = ['flying', 'falling', 'water', 'family', 'lucid', 'nightmare', 'adventure', 'animals', 'supernatural', 'chase', 'school', 'work'];

    function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    const dreams = [];
    const sleepEntries = [];
    const now = new Date();
    const dreamsByDate = {};

    for (let i = 0; i < 1000; i++) {
        const daysAgo = Math.floor(Math.pow(Math.random(), 0.5) * 730);
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - daysAgo);
        timestamp.setHours(randomInt(5, 10), randomInt(0, 59), 0, 0);

        const hasAnalysis = Math.random() > 0.2;
        const dateKey = timestamp.toISOString().split('T')[0];

        const dream = {
            id: i + 1,
            timestamp: timestamp.toISOString(),
            dreamText: randomChoice(DREAM_TEXTS) + " " + randomChoice(DREAM_TEXTS),
            title: hasAnalysis ? "Dream " + (i + 1) : "Untitled Dream",
            sleepQuality: Math.random() > 0.1 ? randomInt(1, 5) : null,
            imageUrl: hasAnalysis && Math.random() > 0.5 ? "https://picsum.photos/seed/" + i + "/400/300" : null,
            aiAnalysis: hasAnalysis ? {
                title: "Dream Analysis",
                analysis: [
                    { title: "Core Theme", content: "This dream explores transformation and inner growth." },
                    { title: "Symbols", content: "Key symbols represent aspects of your inner world." },
                    { title: "Emotions", content: "The emotional tone suggests processing of experiences." }
                ],
                integration: { title: "Practice", content: "Reflect on recent changes in your life." },
                telemetry: { valence: Math.random() * 2 - 1, arousal: Math.random(), lucidity: randomInt(0, 100), tags: ["Analyzed"] }
            } : null,
            chatHistory: [],
            mood: Math.random() > 0.3 ? randomChoice(MOODS) : undefined,
            tags: Math.random() > 0.3 ? [randomChoice(TAGS), randomChoice(TAGS)].filter((v,i,a) => a.indexOf(v) === i) : undefined,
            sleepAids: Math.random() > 0.5 ? { sound: randomChoice(['rain', 'ocean', 'forest']), dayRating: randomInt(1, 5) } : undefined
        };

        dreams.push(dream);

        if (!dreamsByDate[dateKey]) dreamsByDate[dateKey] = [];
        dreamsByDate[dateKey].push(dream.id);
    }

    dreams.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    dreams.forEach((d, i) => { d.id = i + 1; });

    // Update dreamsByDate with new IDs
    const newDreamsByDate = {};
    dreams.forEach(d => {
        const dateKey = d.timestamp.split('T')[0];
        if (!newDreamsByDate[dateKey]) newDreamsByDate[dateKey] = [];
        newDreamsByDate[dateKey].push(d.id);
    });

    let entryId = 1;
    Object.keys(newDreamsByDate).sort().reverse().forEach(dateKey => {
        sleepEntries.push({
            id: entryId++,
            date: dateKey,
            sleepQuality: randomInt(1, 5),
            alarmTime: String(randomInt(5, 9)).padStart(2, '0') + ':' + String(randomInt(0, 5) * 10).padStart(2, '0'),
            alarmSoundId: randomChoice(['somnia', 'gentle', 'progressive']),
            dreamIds: newDreamsByDate[dateKey],
            createdAt: new Date(dateKey + 'T08:00:00').toISOString()
        });
    });

    localStorage.setItem('somnia_dreams', JSON.stringify(dreams));
    localStorage.setItem('somnia_sleep_entries', JSON.stringify(sleepEntries));
    console.log('1000 dreams + ' + sleepEntries.length + ' sleep entries injected!');
    console.log('Stats: ' + dreams.filter(d => d.aiAnalysis).length + ' with analysis, ' + dreams.filter(d => d.mood).length + ' with mood');
    console.log('Refresh the page to see the data.');
})();
`;

console.log('To inject sample data, copy BROWSER_INJECT_SCRIPT to browser console');
