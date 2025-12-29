// Dream Symbol Meanings - Common symbols and their interpretations
// These are based on common psychological interpretations, not definitive meanings

export interface DreamSymbol {
    symbol: string;
    keywords: string[];
    meaning: string;
    category: 'emotion' | 'action' | 'object' | 'place' | 'person' | 'animal';
}

export const DREAM_SYMBOLS: DreamSymbol[] = [
    // Animals
    { symbol: 'Snake', keywords: ['snake', 'serpent', 'viper'], meaning: 'Transformation, hidden fears, or healing energy. May represent something you fear confronting.', category: 'animal' },
    { symbol: 'Dog', keywords: ['dog', 'puppy', 'canine'], meaning: 'Loyalty, friendship, and protection. May reflect your relationships or instincts.', category: 'animal' },
    { symbol: 'Cat', keywords: ['cat', 'kitten', 'feline'], meaning: 'Independence, intuition, and feminine energy. May indicate need for self-care.', category: 'animal' },
    { symbol: 'Bird', keywords: ['bird', 'flying bird', 'eagle', 'crow', 'raven'], meaning: 'Freedom, perspective, and spiritual messages. Direction of flight matters.', category: 'animal' },
    { symbol: 'Spider', keywords: ['spider', 'web', 'tarantula'], meaning: 'Creativity, patience, or feeling trapped. May represent weaving your destiny.', category: 'animal' },

    // Places
    { symbol: 'House', keywords: ['house', 'home', 'room', 'building'], meaning: 'Your psyche or self. Different rooms represent different aspects of yourself.', category: 'place' },
    { symbol: 'Water', keywords: ['water', 'ocean', 'river', 'lake', 'swimming'], meaning: 'Emotions and the unconscious. Calm water = peace; rough water = emotional turmoil.', category: 'place' },
    { symbol: 'Forest', keywords: ['forest', 'woods', 'trees', 'jungle'], meaning: 'The unknown, your unconscious mind, or a journey of self-discovery.', category: 'place' },
    { symbol: 'School', keywords: ['school', 'classroom', 'exam', 'test', 'teacher'], meaning: 'Learning life lessons, feeling tested, or past unresolved issues.', category: 'place' },
    { symbol: 'Road', keywords: ['road', 'path', 'highway', 'street', 'journey'], meaning: 'Your life path and direction. Condition of road reflects your current journey.', category: 'place' },

    // Actions
    { symbol: 'Flying', keywords: ['flying', 'floating', 'soaring'], meaning: 'Freedom, ambition, and transcending limitations. Difficulty flying may indicate obstacles.', category: 'action' },
    { symbol: 'Falling', keywords: ['falling', 'dropping', 'plummeting'], meaning: 'Loss of control, anxiety, or letting go. May indicate insecurity in waking life.', category: 'action' },
    { symbol: 'Being Chased', keywords: ['chased', 'running', 'pursued', 'escaping'], meaning: 'Avoidance of issues, anxiety, or running from aspects of yourself.', category: 'action' },
    { symbol: 'Teeth Falling Out', keywords: ['teeth', 'losing teeth', 'tooth'], meaning: 'Concerns about appearance, communication, or powerlessness.', category: 'action' },
    { symbol: 'Naked in Public', keywords: ['naked', 'nude', 'exposed', 'undressed'], meaning: 'Vulnerability, fear of exposure, or feeling unprepared.', category: 'action' },

    // Objects
    { symbol: 'Mirror', keywords: ['mirror', 'reflection'], meaning: 'Self-reflection and how you perceive yourself. Changes in reflection reveal inner conflicts.', category: 'object' },
    { symbol: 'Keys', keywords: ['key', 'keys', 'lock', 'unlock'], meaning: 'Access, solutions, or secrets. Finding keys = discovering answers.', category: 'object' },
    { symbol: 'Phone', keywords: ['phone', 'calling', 'telephone', 'cell phone'], meaning: 'Communication and connection. Broken phone = communication difficulties.', category: 'object' },
    { symbol: 'Car', keywords: ['car', 'driving', 'vehicle', 'automobile'], meaning: 'Your drive and direction in life. Being in control = self-empowerment.', category: 'object' },
    { symbol: 'Money', keywords: ['money', 'cash', 'coins', 'wealth'], meaning: 'Self-worth, power, and energy exchange. Losing money = fear of loss.', category: 'object' },

    // People
    { symbol: 'Baby', keywords: ['baby', 'infant', 'child', 'newborn'], meaning: 'New beginnings, innocence, or vulnerability. May represent new projects.', category: 'person' },
    { symbol: 'Death', keywords: ['death', 'dying', 'dead', 'funeral'], meaning: 'Transformation and endings. Often represents change rather than literal death.', category: 'person' },
    { symbol: 'Stranger', keywords: ['stranger', 'unknown person', 'mysterious figure'], meaning: 'Unknown aspects of yourself or guidance from your unconscious.', category: 'person' },
    { symbol: 'Ex-Partner', keywords: ['ex', 'former partner', 'old relationship'], meaning: 'Unresolved feelings, lessons learned, or aspects of self they represented.', category: 'person' },

    // Emotions/States
    { symbol: 'Lost', keywords: ['lost', 'confused', 'wandering', 'maze'], meaning: 'Uncertainty in life direction or feeling disconnected from your path.', category: 'emotion' },
    { symbol: 'Late', keywords: ['late', 'rushing', 'missing', 'behind'], meaning: 'Fear of missing opportunities or not meeting expectations.', category: 'emotion' },
    { symbol: 'Trapped', keywords: ['trapped', 'stuck', 'imprisoned', 'confined'], meaning: 'Feeling limited or unable to escape a situation in waking life.', category: 'emotion' },
];

/**
 * Find matching symbols in dream text
 */
export const findDreamSymbols = (dreamText: string): DreamSymbol[] => {
    const lowerText = dreamText.toLowerCase();
    const found: DreamSymbol[] = [];
    const seenSymbols = new Set<string>();

    for (const symbol of DREAM_SYMBOLS) {
        if (seenSymbols.has(symbol.symbol)) continue;

        const hasMatch = symbol.keywords.some(keyword =>
            lowerText.includes(keyword.toLowerCase())
        );

        if (hasMatch) {
            found.push(symbol);
            seenSymbols.add(symbol.symbol);
        }
    }

    return found;
};
