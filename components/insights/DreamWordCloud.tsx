import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface WordCloudProps {
    dreams: Dream[];
}

// Common words to exclude from the cloud - expanded for dream narratives
const STOP_WORDS = new Set([
    // Pronouns and possessives
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
    'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
    'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
    'who', 'whom', 'whose', 'this', 'that', 'these', 'those',

    // Articles, conjunctions, prepositions
    'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of',
    'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on',
    'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'any', 'every',

    // Common auxiliary/modal verbs
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having',
    'do', 'does', 'did', 'doing', 'can', 'will', 'would', 'could', 'should', 'may', 'might',
    'must', 'shall',

    // Common narrative verbs (appear frequently in dream descriptions)
    'went', 'go', 'going', 'gone', 'come', 'came', 'coming', 'get', 'got', 'getting',
    'make', 'made', 'making', 'take', 'took', 'taking', 'taken', 'give', 'gave', 'giving',
    'see', 'saw', 'seen', 'seeing', 'look', 'looked', 'looking', 'seem', 'seemed', 'seeming',
    'feel', 'felt', 'feeling', 'think', 'thought', 'thinking', 'know', 'knew', 'knowing',
    'want', 'wanted', 'wanting', 'need', 'needed', 'needing', 'try', 'tried', 'trying',
    'start', 'started', 'starting', 'begin', 'began', 'beginning', 'keep', 'kept', 'keeping',
    'turn', 'turned', 'turning', 'move', 'moved', 'moving', 'walk', 'walked', 'walking',
    'run', 'ran', 'running', 'stand', 'stood', 'standing', 'sit', 'sat', 'sitting',
    'say', 'said', 'saying', 'tell', 'told', 'telling', 'ask', 'asked', 'asking',
    'call', 'called', 'calling', 'put', 'putting', 'set', 'setting', 'let', 'letting',
    'leave', 'left', 'leaving', 'find', 'found', 'finding', 'become', 'became', 'becoming',
    'happen', 'happened', 'happening', 'appear', 'appeared', 'appearing', 'change', 'changed',
    'notice', 'noticed', 'noticing', 'realize', 'realized', 'realizing', 'remember', 'remembered',
    'decide', 'decided', 'hear', 'heard', 'hearing', 'stop', 'stopped', 'stopping',
    'hold', 'held', 'holding', 'bring', 'brought', 'reach', 'reached', 'open', 'opened',
    'close', 'closed', 'pull', 'pulled', 'push', 'pushed', 'woke', 'wake', 'waking',

    // Common filler/abstract words
    'just', 'really', 'like', 'back', 'still', 'also', 'even', 'much', 'many', 'more',
    'less', 'well', 'always', 'never', 'sometimes', 'often', 'soon', 'later', 'finally',
    'suddenly', 'slowly', 'quickly', 'actually', 'probably', 'maybe', 'almost', 'already',
    'completely', 'totally', 'entirely', 'able', 'away', 'else', 'enough', 'around',

    // Generic nouns that don't add meaning
    'thing', 'things', 'something', 'anything', 'nothing', 'everything', 'someone', 'anyone',
    'everyone', 'nobody', 'somebody', 'place', 'places', 'time', 'times', 'moment', 'point',
    'part', 'parts', 'kind', 'kinds', 'sort', 'way', 'ways', 'lot', 'lots', 'bit',

    // Numbers
    'one', 'two', 'three', 'four', 'five', 'first', 'second', 'last', 'next',

    // Contractions (after apostrophe removal these remain)
    's', 't', 'd', 'll', 've', 're', 'don', 'didn', 'doesn', 'won', 'wouldn', 'couldn',
    'shouldn', 'isn', 'aren', 'wasn', 'weren', 'hasn', 'haven', 'hadn'
]);

/**
 * Extract and count significant words from dream content.
 */
const extractWords = (dreams: Dream[]): Map<string, number> => {
    const wordCounts = new Map<string, number>();

    dreams.forEach(dream => {
        const text = dream.dreamText.toLowerCase();
        const words: string[] = text.match(/[a-z]+/g) || [];

        words.forEach(word => {
            if (word.length > 3 && !STOP_WORDS.has(word)) {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            }
        });
    });

    return wordCounts;
};

export const DreamWordCloud: React.FC<WordCloudProps> = ({ dreams }) => {
    const words = useMemo(() => {
        if (dreams.length === 0) return [];

        const wordCounts = extractWords(dreams);
        const sorted = Array.from(wordCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 40); // Top 40 words

        if (sorted.length === 0) return [];

        const maxCount = sorted[0]?.[1] ?? 0;
        const minCount = sorted[sorted.length - 1]?.[1] ?? 0;
        const range = maxCount - minCount || 1;

        return sorted.map(([word, count]) => ({
            word,
            count,
            size: 12 + ((count - minCount) / range) * 16, // 12px to 28px
            opacity: 0.5 + ((count - minCount) / range) * 0.5, // 50% to 100%
        }));
    }, [dreams]);

    if (dreams.length < 3 || words.length === 0) {
        return null;
    }

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Dream Vocabulary
            </h3>

            <div className="flex flex-wrap gap-2 justify-center items-center min-h-[80px]" role="img" aria-label={`Word cloud showing top ${words.length} dream vocabulary words. Most common: ${words.slice(0, 5).map(w => w.word).join(', ')}`}>
                {words.map(({ word, count, size, opacity }) => (
                    <span
                        key={word}
                        style={{ fontSize: `${size}px`, opacity }}
                        className="text-day-accent dark:text-night-accent hover:opacity-100 cursor-default transition-opacity"
                        title={`"${word}" appears ${count} time${count !== 1 ? 's' : ''}`}
                        aria-hidden="true"
                    >
                        {word}
                    </span>
                ))}
            </div>

            <p className="text-xs text-day-text-secondary dark:text-night-text-secondary text-center mt-3">
                Top {words.length} words across {dreams.length} dreams
            </p>
        </div>
    );
};
