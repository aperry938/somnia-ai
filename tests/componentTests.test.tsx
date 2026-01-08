/**
 * Component Rendering Tests
 *
 * Tests that insight components render correctly with mock data
 * and handle edge cases gracefully.
 */

/// <reference types="@testing-library/jest-dom" />

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dream, DreamTelemetry, DreamAnalysis, SleepAids } from '../types';

// Import components to test
import { AvgSleepQuality } from '../components/insights/AvgSleepQuality';
import { DreamConsistency } from '../components/insights/DreamConsistency';
import { TopTags } from '../components/insights/TopTags';
import { DreamGrowth } from '../components/insights/DreamGrowth';
import { LongestShortestDream } from '../components/insights/LongestShortestDream';
import { FirstDreamLastDream } from '../components/insights/FirstDreamLastDream';

// ============================================================
// MOCK DATA FACTORY
// ============================================================

const createMockDream = (overrides: Partial<Dream> = {}): Dream => {
    const baseTimestamp = new Date();
    return {
        id: Math.random() * 1000000,
        timestamp: baseTimestamp.toISOString(),
        dreamText: 'I was walking through a forest and discovered a hidden waterfall. The water was crystal clear and I could see fish swimming below.',
        sleepQuality: 4,
        title: 'Forest Discovery',
        imageUrl: null,
        aiAnalysis: null,
        chatHistory: [],
        tags: ['nature', 'water', 'discovery'],
        mood: 'peaceful',
        sleepAids: {
            dayRating: 4,
            sound: 'Rain'
        },
        ...overrides
    };
};

// Generate array of dreams with varying dates
const generateDreamsForDays = (dayCount: number): Dream[] => {
    const dreams: Dream[] = [];
    const today = new Date();

    for (let i = 0; i < dayCount; i++) {
        const dreamDate = new Date(today);
        dreamDate.setDate(today.getDate() - i);

        // Vary the content length
        const baseText = 'I was walking through a forest and discovered a hidden waterfall.';
        const extraText = i % 3 === 0 ? ' There were many more details I remember vividly.' : '';

        dreams.push(createMockDream({
            id: i + 1,
            timestamp: dreamDate.toISOString(),
            dreamText: baseText + extraText + ` Day ${i} specific content here.`,
            sleepQuality: (i % 5) + 1,
            title: `Dream ${i + 1}`,
            tags: i % 2 === 0 ? ['flying', 'freedom'] : ['water', 'nature']
        }));
    }

    return dreams;
};

// ============================================================
// COMPONENT TESTS
// ============================================================

describe('Insight Component Rendering Tests', () => {

    describe('AvgSleepQuality Component', () => {
        it('renders null with less than 3 dreams', () => {
            const { container } = render(<AvgSleepQuality dreams={[createMockDream()]} />);
            expect(container.firstChild).toBeNull();
        });

        it('renders correctly with sufficient dreams', () => {
            const dreams = generateDreamsForDays(10);
            render(<AvgSleepQuality dreams={dreams} />);

            expect(screen.getByText('Avg Sleep Quality')).toBeInTheDocument();
            expect(screen.getByText(/From \d+ nights/)).toBeInTheDocument();
        });

        it('shows correct rating category', () => {
            // Create dreams with high sleep quality
            const goodDreams = Array(5).fill(null).map((_, i) =>
                createMockDream({ id: i, sleepQuality: 5 })
            );
            render(<AvgSleepQuality dreams={goodDreams} />);

            expect(screen.getByText('Great')).toBeInTheDocument();
        });

        it('handles dreams with null sleep quality', () => {
            const mixedDreams = [
                createMockDream({ id: 1, sleepQuality: 4 }),
                createMockDream({ id: 2, sleepQuality: null }),
                createMockDream({ id: 3, sleepQuality: 3 }),
                createMockDream({ id: 4, sleepQuality: 5 })
            ];
            render(<AvgSleepQuality dreams={mixedDreams} />);

            // Should only count the 3 with quality
            expect(screen.getByText('From 3 nights')).toBeInTheDocument();
        });
    });

    describe('DreamConsistency Component', () => {
        it('renders null with less than 7 dreams', () => {
            const dreams = generateDreamsForDays(5);
            const { container } = render(<DreamConsistency dreams={dreams} />);
            expect(container.firstChild).toBeNull();
        });

        it('renders correctly with sufficient dreams', () => {
            const dreams = generateDreamsForDays(15);
            render(<DreamConsistency dreams={dreams} />);

            expect(screen.getByText('Journaling Consistency')).toBeInTheDocument();
            expect(screen.getByText(/\d+%/)).toBeInTheDocument();
        });

        it('shows days logged in last 30 days', () => {
            const dreams = generateDreamsForDays(20);
            render(<DreamConsistency dreams={dreams} />);

            expect(screen.getByText(/\d+ days logged in the last 30 days/)).toBeInTheDocument();
        });
    });

    describe('TopTags Component', () => {
        it('renders null with no tags', () => {
            const dreams = [createMockDream({ tags: [] })];
            const { container } = render(<TopTags dreams={dreams} />);
            expect(container.firstChild).toBeNull();
        });

        it('renders correctly with tags', () => {
            const dreams = [
                createMockDream({ id: 1, tags: ['flying', 'freedom', 'sky'] }),
                createMockDream({ id: 2, tags: ['flying', 'water'] }),
                createMockDream({ id: 3, tags: ['flying', 'ocean', 'water'] })
            ];
            render(<TopTags dreams={dreams} />);

            expect(screen.getByText('Top 5 Tags')).toBeInTheDocument();
            expect(screen.getByText('#flying')).toBeInTheDocument();
        });

        it('shows tag counts correctly', () => {
            const dreams = [
                createMockDream({ id: 1, tags: ['flying'] }),
                createMockDream({ id: 2, tags: ['flying'] }),
                createMockDream({ id: 3, tags: ['flying'] })
            ];
            render(<TopTags dreams={dreams} />);

            expect(screen.getByText('3')).toBeInTheDocument(); // flying count
        });
    });

    describe('DreamGrowth Component', () => {
        it('renders null with less than 10 dreams', () => {
            const dreams = generateDreamsForDays(5);
            const { container } = render(<DreamGrowth dreams={dreams} />);
            expect(container.firstChild).toBeNull();
        });

        it('renders correctly with sufficient dreams', () => {
            const dreams = generateDreamsForDays(15);
            render(<DreamGrowth dreams={dreams} />);

            expect(screen.getByText('Detail Growth')).toBeInTheDocument();
            expect(screen.getByText('Earlier')).toBeInTheDocument();
            expect(screen.getByText('Recent')).toBeInTheDocument();
        });

        it('shows growth percentage', () => {
            const dreams = generateDreamsForDays(15);
            render(<DreamGrowth dreams={dreams} />);

            expect(screen.getByText(/[+-]?\d+% detail growth/)).toBeInTheDocument();
        });
    });

    describe('LongestShortestDream Component', () => {
        it('renders null with less than 5 dreams', () => {
            const dreams = generateDreamsForDays(3);
            const { container } = render(<LongestShortestDream dreams={dreams} />);
            expect(container.firstChild).toBeNull();
        });

        it('renders correctly with sufficient dreams', () => {
            const dreams = [
                createMockDream({ id: 1, dreamText: 'Short dream.' }),
                createMockDream({ id: 2, dreamText: 'A much longer dream with many more words and details about what happened.' }),
                createMockDream({ id: 3, dreamText: 'Medium length dream here.' }),
                createMockDream({ id: 4, dreamText: 'Another dream.' }),
                createMockDream({ id: 5, dreamText: 'Yet another dream entry.' })
            ];
            render(<LongestShortestDream dreams={dreams} />);

            expect(screen.getByText('Dream Extremes')).toBeInTheDocument();
        });
    });

    describe('FirstDreamLastDream Component', () => {
        it('renders null with less than 2 dreams', () => {
            const dreams = [createMockDream()];
            const { container } = render(<FirstDreamLastDream dreams={dreams} />);
            expect(container.firstChild).toBeNull();
        });

        it('renders correctly with multiple dreams', () => {
            const dreams = generateDreamsForDays(10);
            render(<FirstDreamLastDream dreams={dreams} />);

            expect(screen.getByText('Your Journey')).toBeInTheDocument();
            expect(screen.getByText('First Dream')).toBeInTheDocument();
            expect(screen.getByText('Latest Dream')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('all components handle empty arrays gracefully', () => {
            const emptyDreams: Dream[] = [];

            const { container: c1 } = render(<AvgSleepQuality dreams={emptyDreams} />);
            expect(c1.firstChild).toBeNull();

            const { container: c2 } = render(<DreamConsistency dreams={emptyDreams} />);
            expect(c2.firstChild).toBeNull();

            const { container: c3 } = render(<TopTags dreams={emptyDreams} />);
            expect(c3.firstChild).toBeNull();

            const { container: c4 } = render(<DreamGrowth dreams={emptyDreams} />);
            expect(c4.firstChild).toBeNull();
        });

        it('components handle dreams with missing optional fields', () => {
            const minimalDreams: Dream[] = [
                {
                    id: 1,
                    timestamp: new Date().toISOString(),
                    dreamText: 'A simple dream.',
                    sleepQuality: 3,
                    title: '',
                    imageUrl: null,
                    aiAnalysis: null,
                    chatHistory: []
                    // No tags, no mood, no sleepAids
                }
            ];

            // These should not throw
            expect(() => render(<TopTags dreams={minimalDreams} />)).not.toThrow();
            expect(() => render(<AvgSleepQuality dreams={minimalDreams} />)).not.toThrow();
        });
    });
});
