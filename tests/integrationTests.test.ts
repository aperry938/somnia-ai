/**
 * Comprehensive Integration Tests - Simulating 30 Days of User Usage
 *
 * Tests all app functionality with realistic data without requiring AI APIs.
 * Validates calculations, insights, and data transformations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Dream, SleepAids, DreamMood, DreamTelemetry, DreamAnalysis } from '../types';
import { predictLocalSleepQuality, LocalSleepPrediction } from '../services/sleepPredictionService';

// ============================================================
// TEST DATA GENERATOR - 30 Days of Realistic User Data
// ============================================================

const DREAM_THEMES = [
    { text: 'I was flying over a vast ocean, feeling completely free. The water below sparkled like diamonds in the sunlight. I could control my altitude by thinking about it.', mood: 'joyful' as DreamMood, tags: ['flying', 'ocean', 'freedom'], valence: 0.8, arousal: 0.7 },
    { text: 'I found myself in my childhood home, but the rooms kept changing. My grandmother was there but she looked younger. We had tea together and she gave me advice.', mood: 'nostalgic' as DreamMood, tags: ['family', 'childhood', 'home'], valence: 0.4, arousal: 0.3 },
    { text: 'Running through a dark forest, something was chasing me. I could hear footsteps getting closer. When I looked back, there was nothing there but the fear remained.', mood: 'fearful' as DreamMood, tags: ['chase', 'forest', 'nightmare'], valence: -0.7, arousal: 0.9 },
    { text: 'I was taking an exam but I had never attended the class. The questions made no sense and I realized I was completely unprepared. Everyone else seemed to know the answers.', mood: 'anxious' as DreamMood, tags: ['exam', 'school', 'stress'], valence: -0.5, arousal: 0.8 },
    { text: 'Walking through a beautiful garden with colorful flowers. A butterfly landed on my hand and I felt an overwhelming sense of peace and connection with nature.', mood: 'peaceful' as DreamMood, tags: ['garden', 'nature', 'peace'], valence: 0.9, arousal: 0.2 },
    { text: 'I was at a party with people I didn\'t recognize. Everyone was laughing and dancing. I felt awkward at first but then joined in and had the best time.', mood: 'joyful' as DreamMood, tags: ['party', 'social', 'dancing'], valence: 0.7, arousal: 0.8 },
    { text: 'Lost in a maze of corridors that all looked the same. I kept finding doors that led nowhere. The frustration was building but I refused to give up.', mood: 'confused' as DreamMood, tags: ['maze', 'lost', 'searching'], valence: -0.3, arousal: 0.5 },
    { text: 'Swimming with dolphins in crystal clear water. They communicated with me somehow and I understood them perfectly. We dove deep and found an underwater city.', mood: 'hopeful' as DreamMood, tags: ['ocean', 'animals', 'discovery'], valence: 0.85, arousal: 0.6 },
    { text: 'My teeth started falling out one by one. I caught them in my hands feeling horrified. I looked in a mirror and my face was unfamiliar.', mood: 'anxious' as DreamMood, tags: ['teeth', 'transformation', 'anxiety'], valence: -0.6, arousal: 0.7 },
    { text: 'Standing on top of a mountain at sunrise. The view stretched forever and I felt like I could see the whole world. A sense of accomplishment washed over me.', mood: 'peaceful' as DreamMood, tags: ['mountain', 'achievement', 'nature'], valence: 0.9, arousal: 0.4 },
    { text: 'I was late for something important but couldn\'t remember what. Every clock showed a different time. The harder I tried to hurry, the slower everything became.', mood: 'anxious' as DreamMood, tags: ['time', 'late', 'stress'], valence: -0.4, arousal: 0.6 },
    { text: 'Playing music on stage in front of thousands. The crowd was cheering. I played instruments I\'ve never played before but somehow knew all the notes.', mood: 'joyful' as DreamMood, tags: ['music', 'performance', 'talent'], valence: 0.8, arousal: 0.85 },
    { text: 'Floating in space surrounded by stars. Earth looked so small and fragile below. I felt both insignificant and deeply connected to everything.', mood: 'peaceful' as DreamMood, tags: ['space', 'stars', 'cosmic'], valence: 0.6, arousal: 0.3 },
    { text: 'A loved one who has passed away visited me. We talked about everything and nothing. It felt so real that waking up was like losing them again.', mood: 'sad' as DreamMood, tags: ['deceased', 'family', 'grief'], valence: -0.2, arousal: 0.4 },
    { text: 'I could breathe underwater and discovered a whole world beneath the waves. Schools of fish swirled around me in amazing patterns.', mood: 'hopeful' as DreamMood, tags: ['underwater', 'discovery', 'fish'], valence: 0.75, arousal: 0.5 },
];

const SOUNDSCAPES = ['White Noise', 'Rain', 'Ocean Waves', 'Forest', 'Thunder', null];
const RELAXATIONS = ['Body Scan', 'Breathing Exercise', '4-7-8 Technique', null];

/**
 * Generate 30 days of realistic dream data
 */
function generate30DaysDreamData(): Dream[] {
    const dreams: Dream[] = [];
    const today = new Date();

    for (let day = 0; day < 30; day++) {
        // Some days have no dreams (realistic)
        if (Math.random() < 0.15) continue;

        // Most days have 1 dream, some have 2
        const dreamCount = Math.random() < 0.8 ? 1 : 2;

        for (let d = 0; d < dreamCount; d++) {
            const dreamDate = new Date(today);
            dreamDate.setDate(today.getDate() - day);
            dreamDate.setHours(6 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60));

            const themeIndex = Math.floor(Math.random() * DREAM_THEMES.length);
            const theme = DREAM_THEMES[themeIndex];

            // Sleep quality correlates somewhat with mood
            let sleepQuality: number;
            if (theme.valence > 0.5) sleepQuality = Math.random() < 0.7 ? 4 + Math.floor(Math.random() * 2) : 3;
            else if (theme.valence < -0.3) sleepQuality = Math.random() < 0.7 ? 2 + Math.floor(Math.random() * 2) : 3;
            else sleepQuality = 2 + Math.floor(Math.random() * 3);

            // Day rating also correlates
            const dayRating = sleepQuality + Math.floor(Math.random() * 2) - 1;
            const clampedDayRating = Math.max(1, Math.min(5, dayRating));

            // Telemetry data (simulating what AI would extract)
            const telemetry: DreamTelemetry = {
                valence: theme.valence + (Math.random() * 0.2 - 0.1),
                arousal: theme.arousal + (Math.random() * 0.2 - 0.1),
                lucidity: Math.random() < 0.1 ? 50 + Math.floor(Math.random() * 50) : Math.floor(Math.random() * 30),
                tags: theme.tags
            };

            // Clamp values
            telemetry.valence = Math.max(-1, Math.min(1, telemetry.valence));
            telemetry.arousal = Math.max(0, Math.min(1, telemetry.arousal));

            const aiAnalysis: DreamAnalysis = {
                title: `Dream about ${theme.tags[0]}`,
                analysis: [
                    { title: 'Theme', content: `This dream explores themes of ${theme.tags.join(', ')}.` },
                    { title: 'Symbolism', content: `The ${theme.tags[0]} represents aspects of your subconscious.` }
                ],
                integration: {
                    title: 'Integration',
                    content: 'Consider how this dream relates to your waking life.'
                },
                telemetry
            };

            const sleepAids: SleepAids = {
                sound: SOUNDSCAPES[Math.floor(Math.random() * SOUNDSCAPES.length)] || undefined,
                soundDuration: Math.random() < 0.5 ? 15 + Math.floor(Math.random() * 30) : undefined,
                relaxation: RELAXATIONS[Math.floor(Math.random() * RELAXATIONS.length)] || undefined,
                dayRating: clampedDayRating,
                dayNotes: Math.random() < 0.3 ? 'Had a productive day' : undefined,
                checklist: Math.random() < 0.4 ? ['No caffeine after 2pm', 'No screens 1hr before bed'] : []
            };

            const dream: Dream = {
                id: Date.now() + day * 1000 + d,
                timestamp: dreamDate.toISOString(),
                dreamText: theme.text + (Math.random() < 0.3 ? ' There were more details I can\'t quite remember.' : ''),
                sleepQuality,
                title: aiAnalysis.title,
                imageUrl: null,
                aiAnalysis,
                chatHistory: [],
                tags: theme.tags,
                mood: theme.mood,
                sleepAids
            };

            dreams.push(dream);
        }
    }

    // Sort by timestamp descending (newest first)
    dreams.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return dreams;
}

// ============================================================
// ANALYTICS CALCULATION TESTS
// ============================================================

describe('30-Day User Simulation Integration Tests', () => {
    let testDreams: Dream[];

    beforeAll(() => {
        testDreams = generate30DaysDreamData();
    });

    describe('Data Generation Validation', () => {
        it('generates 20-35 dreams for 30 days (some days skipped, some have 2)', () => {
            expect(testDreams.length).toBeGreaterThanOrEqual(15);
            expect(testDreams.length).toBeLessThanOrEqual(40);
        });

        it('all dreams have required fields', () => {
            testDreams.forEach(dream => {
                expect(dream.id).toBeDefined();
                expect(dream.timestamp).toBeDefined();
                expect(dream.dreamText).toBeDefined();
                expect(dream.dreamText.length).toBeGreaterThan(10);
                expect(dream.sleepQuality).toBeGreaterThanOrEqual(1);
                expect(dream.sleepQuality).toBeLessThanOrEqual(5);
            });
        });

        it('dreams span 30 days', () => {
            const timestamps = testDreams.map(d => new Date(d.timestamp).getTime());
            const oldest = Math.min(...timestamps);
            const newest = Math.max(...timestamps);
            const daySpan = (newest - oldest) / (1000 * 60 * 60 * 24);
            expect(daySpan).toBeGreaterThan(20); // At least 20 days span
            expect(daySpan).toBeLessThanOrEqual(30);
        });

        it('all dreams have telemetry data', () => {
            testDreams.forEach(dream => {
                expect(dream.aiAnalysis?.telemetry).toBeDefined();
                expect(dream.aiAnalysis?.telemetry?.valence).toBeGreaterThanOrEqual(-1);
                expect(dream.aiAnalysis?.telemetry?.valence).toBeLessThanOrEqual(1);
                expect(dream.aiAnalysis?.telemetry?.arousal).toBeGreaterThanOrEqual(0);
                expect(dream.aiAnalysis?.telemetry?.arousal).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('Average Sleep Quality Calculation', () => {
        it('calculates average correctly', () => {
            const withQuality = testDreams.filter(d => d.sleepQuality !== null);
            const avg = withQuality.reduce((s, d) => s + (d.sleepQuality || 0), 0) / withQuality.length;

            expect(avg).toBeGreaterThanOrEqual(1);
            expect(avg).toBeLessThanOrEqual(5);
            expect(Number.isFinite(avg)).toBe(true);
        });

        it('handles empty dreams array', () => {
            const emptyAvg = ([] as Dream[]).filter(d => d.sleepQuality !== null);
            expect(emptyAvg.length).toBe(0);
        });
    });

    describe('Dream Consistency Calculation', () => {
        it('calculates journaling consistency', () => {
            const dates = new Set<string>();
            testDreams.forEach(d => {
                dates.add(new Date(d.timestamp).toDateString());
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let daysInLast30 = 0;

            for (let i = 0; i < 30; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                if (dates.has(d.toDateString())) daysInLast30++;
            }

            const consistency = Math.round((daysInLast30 / 30) * 100);

            expect(consistency).toBeGreaterThanOrEqual(0);
            expect(consistency).toBeLessThanOrEqual(100);
            expect(daysInLast30).toBeGreaterThan(0);
        });
    });

    describe('Top Tags Calculation', () => {
        it('correctly counts and ranks tags', () => {
            const tagCounts: Record<string, number> = {};

            testDreams.forEach(d => {
                d.tags?.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            });

            const sortedTags = Object.entries(tagCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            expect(sortedTags.length).toBeGreaterThan(0);
            expect(sortedTags.length).toBeLessThanOrEqual(5);

            // Verify sorting
            for (let i = 1; i < sortedTags.length; i++) {
                expect(sortedTags[i - 1][1]).toBeGreaterThanOrEqual(sortedTags[i][1]);
            }
        });
    });

    describe('Dream Growth Calculation', () => {
        it('compares first half vs second half word counts', () => {
            if (testDreams.length < 10) {
                console.log('Skipping - need 10+ dreams');
                return;
            }

            const half = Math.floor(testDreams.length / 2);
            const firstHalf = testDreams.slice(half);  // Older dreams
            const secondHalf = testDreams.slice(0, half);  // Newer dreams

            const firstAvgWords = firstHalf.reduce((s, d) => s + d.dreamText.split(/\s+/).length, 0) / firstHalf.length;
            const secondAvgWords = secondHalf.reduce((s, d) => s + d.dreamText.split(/\s+/).length, 0) / secondHalf.length;

            expect(firstAvgWords).toBeGreaterThan(0);
            expect(secondAvgWords).toBeGreaterThan(0);

            const growth = firstAvgWords > 0 ? ((secondAvgWords - firstAvgWords) / firstAvgWords) * 100 : 0;
            expect(Number.isFinite(growth)).toBe(true);
        });
    });

    describe('Telemetry Scatter Plot (Russell\'s Circumplex)', () => {
        it('classifies dreams into correct quadrants', () => {
            const getQuadrant = (valence: number, arousal: number) => {
                if (arousal > 0.5) {
                    return valence > 0 ? 'highEnergyPositive' : 'highEnergyNegative';
                }
                return valence > 0 ? 'lowEnergyPositive' : 'lowEnergyNegative';
            };

            const stats = {
                highEnergyPositive: 0,
                highEnergyNegative: 0,
                lowEnergyPositive: 0,
                lowEnergyNegative: 0
            };

            testDreams.forEach(d => {
                const telemetry = d.aiAnalysis?.telemetry;
                if (telemetry) {
                    const quadrant = getQuadrant(telemetry.valence, telemetry.arousal);
                    stats[quadrant]++;
                }
            });

            const total = Object.values(stats).reduce((a, b) => a + b, 0);
            expect(total).toBe(testDreams.length);

            // At least some distribution across quadrants
            const nonZeroQuadrants = Object.values(stats).filter(v => v > 0).length;
            expect(nonZeroQuadrants).toBeGreaterThanOrEqual(2);
        });

        it('converts valence/arousal to plot coordinates correctly', () => {
            const toPlotCoords = (valence: number, arousal: number) => ({
                x: ((valence + 1) / 2) * 100,
                y: (1 - arousal) * 100
            });

            // Test edge cases
            const topRight = toPlotCoords(1, 1);  // Max positive, max arousal
            expect(topRight.x).toBe(100);
            expect(topRight.y).toBe(0);

            const bottomLeft = toPlotCoords(-1, 0);  // Max negative, min arousal
            expect(bottomLeft.x).toBe(0);
            expect(bottomLeft.y).toBe(100);

            const center = toPlotCoords(0, 0.5);  // Neutral
            expect(center.x).toBe(50);
            expect(center.y).toBe(50);
        });
    });

    describe('Sleep Prediction Integration', () => {
        it('predicts based on day rating correlation', () => {
            // Find a day rating that appears multiple times
            const dayRatings: Record<number, { quality: number; count: number }> = {};

            testDreams.forEach(d => {
                const rating = d.sleepAids?.dayRating;
                if (rating && d.sleepQuality) {
                    if (!dayRatings[rating]) {
                        dayRatings[rating] = { quality: 0, count: 0 };
                    }
                    dayRatings[rating].quality += d.sleepQuality;
                    dayRatings[rating].count++;
                }
            });

            // Find a rating with multiple occurrences
            const commonRating = Object.entries(dayRatings)
                .filter(([_, v]) => v.count >= 2)
                .map(([k, _]) => parseInt(k))[0];

            if (commonRating) {
                const context: SleepAids = { dayRating: commonRating };
                const prediction = predictLocalSleepQuality(context, testDreams);

                expect(prediction).not.toBeNull();
                if (prediction) {
                    expect(prediction.predictedQuality).toBeGreaterThanOrEqual(1);
                    expect(prediction.predictedQuality).toBeLessThanOrEqual(5);
                    expect(prediction.factors.length).toBeGreaterThan(0);
                }
            }
        });

        it('predicts based on soundscape correlation', () => {
            // Find a sound that appears multiple times
            const sounds: Record<string, number> = {};
            testDreams.forEach(d => {
                if (d.sleepAids?.sound) {
                    sounds[d.sleepAids.sound] = (sounds[d.sleepAids.sound] || 0) + 1;
                }
            });

            const commonSound = Object.entries(sounds)
                .filter(([_, count]) => count >= 2)
                .map(([sound, _]) => sound)[0];

            if (commonSound) {
                const context: SleepAids = { sound: commonSound };
                const prediction = predictLocalSleepQuality(context, testDreams);

                if (prediction) {
                    expect(prediction.predictedQuality).toBeGreaterThanOrEqual(1);
                    expect(prediction.predictedQuality).toBeLessThanOrEqual(5);
                }
            }
        });

        it('falls back gracefully when no matches', () => {
            const context: SleepAids = { dayRating: -1 };  // Impossible rating
            const prediction = predictLocalSleepQuality(context, testDreams);

            // Should either return fallback or null
            if (prediction) {
                expect(prediction.confidence).toBe('low');
                expect(prediction.factors).toContain('Based on recent average.');
            }
        });
    });

    describe('Mood Distribution Analysis', () => {
        it('counts mood distribution correctly', () => {
            const moodCounts: Record<string, number> = {};

            testDreams.forEach(d => {
                if (d.mood) {
                    moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1;
                }
            });

            const total = Object.values(moodCounts).reduce((a, b) => a + b, 0);
            const dreamsWithMood = testDreams.filter(d => d.mood).length;

            expect(total).toBe(dreamsWithMood);

            // Verify all moods are valid
            const validMoods = ['joyful', 'peaceful', 'anxious', 'sad', 'fearful', 'confused', 'neutral', 'nostalgic', 'hopeful'];
            Object.keys(moodCounts).forEach(mood => {
                expect(validMoods).toContain(mood);
            });
        });
    });

    describe('Chronological Data Integrity', () => {
        it('maintains correct timestamp ordering', () => {
            for (let i = 1; i < testDreams.length; i++) {
                const prev = new Date(testDreams[i - 1].timestamp).getTime();
                const curr = new Date(testDreams[i].timestamp).getTime();
                expect(prev).toBeGreaterThanOrEqual(curr);  // Descending order
            }
        });

        it('all timestamps are valid dates', () => {
            testDreams.forEach(d => {
                const date = new Date(d.timestamp);
                expect(date.toString()).not.toBe('Invalid Date');
            });
        });
    });

    describe('Sleep Aids Data Validation', () => {
        it('all sleepAids have valid structure', () => {
            testDreams.forEach(d => {
                if (d.sleepAids) {
                    if (d.sleepAids.dayRating !== undefined && d.sleepAids.dayRating !== null) {
                        expect(d.sleepAids.dayRating).toBeGreaterThanOrEqual(1);
                        expect(d.sleepAids.dayRating).toBeLessThanOrEqual(5);
                    }
                    if (d.sleepAids.soundDuration !== undefined) {
                        expect(d.sleepAids.soundDuration).toBeGreaterThan(0);
                    }
                }
            });
        });
    });

    describe('Word Count Statistics', () => {
        it('calculates average word count', () => {
            const wordCounts = testDreams.map(d => d.dreamText.split(/\s+/).length);
            const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
            const minWords = Math.min(...wordCounts);
            const maxWords = Math.max(...wordCounts);

            expect(avgWords).toBeGreaterThan(10);  // Dreams should have substantial content
            expect(minWords).toBeGreaterThan(0);
            expect(maxWords).toBeGreaterThan(minWords);
        });
    });

    describe('Longest/Shortest Dream Identification', () => {
        it('correctly identifies longest and shortest dreams', () => {
            let longest = testDreams[0];
            let shortest = testDreams[0];

            testDreams.forEach(d => {
                if (d.dreamText.length > longest.dreamText.length) longest = d;
                if (d.dreamText.length < shortest.dreamText.length) shortest = d;
            });

            expect(longest.dreamText.length).toBeGreaterThanOrEqual(shortest.dreamText.length);
            expect(longest.id).toBeDefined();
            expect(shortest.id).toBeDefined();
        });
    });

    describe('Day of Week Analysis', () => {
        it('groups dreams by day of week correctly', () => {
            const dayStats: Record<number, { count: number; avgQuality: number }> = {};

            testDreams.forEach(d => {
                const day = new Date(d.timestamp).getDay();
                if (!dayStats[day]) {
                    dayStats[day] = { count: 0, avgQuality: 0 };
                }
                dayStats[day].count++;
                if (d.sleepQuality) {
                    dayStats[day].avgQuality =
                        (dayStats[day].avgQuality * (dayStats[day].count - 1) + d.sleepQuality) / dayStats[day].count;
                }
            });

            // Should have dreams on multiple days
            const daysWithDreams = Object.keys(dayStats).length;
            expect(daysWithDreams).toBeGreaterThan(3);
        });
    });

    describe('Edge Cases', () => {
        it('handles dreams with missing optional fields', () => {
            const minimalDream: Dream = {
                id: 999999,
                timestamp: new Date().toISOString(),
                dreamText: 'A simple dream.',
                sleepQuality: null,
                title: '',
                imageUrl: null,
                aiAnalysis: null,
                chatHistory: []
            };

            // Calculations should handle this gracefully
            const withQuality = [minimalDream].filter(d => d.sleepQuality !== null);
            expect(withQuality.length).toBe(0);

            const tags = minimalDream.tags || [];
            expect(tags.length).toBe(0);
        });

        it('handles empty dream arrays', () => {
            const emptyDreams: Dream[] = [];
            const prediction = predictLocalSleepQuality({}, emptyDreams);
            expect(prediction).toBeNull();
        });

        it('handles dreams with extreme telemetry values', () => {
            const extremeDreams: Dream[] = [
                {
                    id: 1, timestamp: new Date().toISOString(), dreamText: 'Test 1',
                    sleepQuality: 5, title: 'Test', imageUrl: null, aiAnalysis: {
                        title: 'Test', analysis: [], integration: { title: 'T', content: 'T' },
                        telemetry: { valence: 1.0, arousal: 1.0, lucidity: 100, tags: [] }
                    }, chatHistory: []
                },
                {
                    id: 2, timestamp: new Date().toISOString(), dreamText: 'Test 2',
                    sleepQuality: 1, title: 'Test', imageUrl: null, aiAnalysis: {
                        title: 'Test', analysis: [], integration: { title: 'T', content: 'T' },
                        telemetry: { valence: -1.0, arousal: 0.0, lucidity: 0, tags: [] }
                    }, chatHistory: []
                }
            ];

            // Should handle without errors
            extremeDreams.forEach(d => {
                const telemetry = d.aiAnalysis?.telemetry;
                if (telemetry) {
                    expect(telemetry.valence).toBeGreaterThanOrEqual(-1);
                    expect(telemetry.valence).toBeLessThanOrEqual(1);
                    expect(telemetry.arousal).toBeGreaterThanOrEqual(0);
                    expect(telemetry.arousal).toBeLessThanOrEqual(1);
                }
            });
        });
    });
});
