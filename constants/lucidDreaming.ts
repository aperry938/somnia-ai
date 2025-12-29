// Lucid Dreaming Techniques and Reality Checks

export interface LucidDreamTechnique {
    id: string;
    name: string;
    description: string;
    steps: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const REALITY_CHECKS = [
    { check: 'Look at your hands', description: 'In dreams, hands often look distorted or have wrong finger count' },
    { check: 'Read text twice', description: 'Text changes between readings in dreams' },
    { check: 'Check the time', description: 'Clocks behave erratically in dreams' },
    { check: 'Breathe through pinched nose', description: 'You can still breathe in dreams' },
    { check: 'Try to push finger through palm', description: 'Physics break in dreams' },
    { check: 'Look in a mirror', description: 'Reflections are often distorted or missing' },
    { check: 'Flip a light switch', description: 'Lights rarely work correctly in dreams' },
];

export const LUCID_TECHNIQUES: LucidDreamTechnique[] = [
    {
        id: 'mild',
        name: 'MILD (Mnemonic Induction)',
        description: 'Use intention and visualization to trigger lucidity',
        difficulty: 'beginner',
        steps: [
            'Set intention before sleep: "I will realize I\'m dreaming"',
            'Visualize becoming lucid in a recent dream',
            'Repeat your intention as you fall asleep',
            'Focus on recognizing dream signs'
        ]
    },
    {
        id: 'wbtb',
        name: 'WBTB (Wake Back to Bed)',
        description: 'Wake during REM-rich sleep and return with intention',
        difficulty: 'intermediate',
        steps: [
            'Set alarm for 5-6 hours after falling asleep',
            'Stay awake for 20-60 minutes',
            'Read about lucid dreaming or set intentions',
            'Return to sleep with lucid intention'
        ]
    },
    {
        id: 'wild',
        name: 'WILD (Wake Initiated)',
        description: 'Maintain awareness while transitioning into dream',
        difficulty: 'advanced',
        steps: [
            'Lie completely still with closed eyes',
            'Focus on hypnagogic imagery',
            'Maintain awareness as you fall asleep',
            'Enter the dream consciously'
        ]
    }
];

/**
 * Get a random reality check for prompting
 */
export const getRandomRealityCheck = () => {
    return REALITY_CHECKS[Math.floor(Math.random() * REALITY_CHECKS.length)];
};

/**
 * Get technique by difficulty
 */
export const getTechniquesByDifficulty = (difficulty: LucidDreamTechnique['difficulty']) => {
    return LUCID_TECHNIQUES.filter(t => t.difficulty === difficulty);
};
