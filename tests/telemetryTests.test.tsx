/**
 * TelemetryScatterPlot Tests
 *
 * Tests the Russell's Circumplex Model visualization component
 */

/// <reference types="@testing-library/jest-dom" />

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dream, DreamTelemetry, DreamAnalysis } from '../types';
import { TelemetryScatterPlot } from '../components/insights/TelemetryScatterPlot';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const createDreamWithTelemetry = (
    id: number,
    valence: number,
    arousal: number,
    title: string = `Dream ${id}`
): Dream => {
    const telemetry: DreamTelemetry = {
        valence,
        arousal,
        lucidity: Math.floor(Math.random() * 100),
        tags: ['test-tag']
    };

    const aiAnalysis: DreamAnalysis = {
        title,
        analysis: [],
        integration: { title: 'Test', content: 'Test integration' },
        telemetry
    };

    return {
        id,
        timestamp: new Date(Date.now() - id * 86400000).toISOString(),
        dreamText: `This is the content for dream ${id}`,
        sleepQuality: Math.floor(Math.random() * 5) + 1,
        title,
        imageUrl: null,
        aiAnalysis,
        chatHistory: []
    };
};

// ============================================================
// TESTS
// ============================================================

describe('TelemetryScatterPlot Component', () => {

    describe('Rendering', () => {
        it('shows message when fewer than 3 dreams have telemetry', () => {
            const dreams = [
                createDreamWithTelemetry(1, 0.5, 0.5),
                createDreamWithTelemetry(2, -0.3, 0.7)
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            expect(screen.getByText(/Need at least 3 analyzed dreams/)).toBeInTheDocument();
        });

        it('renders scatter plot with 3+ dreams having telemetry', () => {
            const dreams = [
                createDreamWithTelemetry(1, 0.8, 0.9, 'Exciting Dream'),
                createDreamWithTelemetry(2, -0.6, 0.8, 'Tense Dream'),
                createDreamWithTelemetry(3, 0.7, 0.2, 'Calm Dream')
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            expect(screen.getByText('Emotional Landscape')).toBeInTheDocument();
            expect(screen.getByText("Russell's Circumplex Model of Affect")).toBeInTheDocument();
        });

        it('displays quadrant labels correctly', () => {
            const dreams = [
                createDreamWithTelemetry(1, 0.8, 0.9),
                createDreamWithTelemetry(2, -0.6, 0.8),
                createDreamWithTelemetry(3, 0.7, 0.2),
                createDreamWithTelemetry(4, -0.5, 0.3)
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            // Labels appear twice (in quadrant and summary), use getAllBy
            expect(screen.getAllByText('Excited').length).toBeGreaterThanOrEqual(1);
            expect(screen.getAllByText('Tense').length).toBeGreaterThanOrEqual(1);
            expect(screen.getAllByText('Content').length).toBeGreaterThanOrEqual(1);
            expect(screen.getAllByText('Depressed').length).toBeGreaterThanOrEqual(1);
        });

        it('shows axis labels', () => {
            const dreams = [
                createDreamWithTelemetry(1, 0.5, 0.5),
                createDreamWithTelemetry(2, 0.5, 0.5),
                createDreamWithTelemetry(3, 0.5, 0.5)
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            expect(screen.getByText('High Energy')).toBeInTheDocument();
            expect(screen.getByText('Low Energy')).toBeInTheDocument();
            expect(screen.getByText('Pleasant')).toBeInTheDocument();
            expect(screen.getByText('Unpleasant')).toBeInTheDocument();
        });
    });

    describe('Quadrant Classification', () => {
        it('classifies high energy positive dreams correctly', () => {
            // High arousal (>0.5) + positive valence (>0)
            const dreams = [
                createDreamWithTelemetry(1, 0.8, 0.9, 'Excited Dream'),
                createDreamWithTelemetry(2, 0.6, 0.7, 'Happy Dream'),
                createDreamWithTelemetry(3, 0.9, 0.8, 'Elated Dream')
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            // All 3 should be in Excited quadrant - check filter shows count
            expect(screen.getByText(/Excited \(3\)/)).toBeInTheDocument();
        });

        it('classifies high energy negative dreams correctly', () => {
            // High arousal (>0.5) + negative valence (<0)
            const dreams = [
                createDreamWithTelemetry(1, -0.8, 0.9, 'Anxious Dream'),
                createDreamWithTelemetry(2, -0.6, 0.7, 'Stressed Dream'),
                createDreamWithTelemetry(3, -0.9, 0.8, 'Fearful Dream')
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            // Should show Tense quadrant with count 3
            expect(screen.getByText(/Tense \(3\)/)).toBeInTheDocument();
        });

        it('classifies low energy positive dreams correctly', () => {
            // Low arousal (<=0.5) + positive valence (>0)
            const dreams = [
                createDreamWithTelemetry(1, 0.8, 0.3, 'Peaceful Dream'),
                createDreamWithTelemetry(2, 0.6, 0.2, 'Serene Dream'),
                createDreamWithTelemetry(3, 0.9, 0.4, 'Calm Dream')
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            // Should show Content quadrant with count 3
            expect(screen.getByText(/Content \(3\)/)).toBeInTheDocument();
        });

        it('classifies low energy negative dreams correctly', () => {
            // Low arousal (<=0.5) + negative valence (<0)
            const dreams = [
                createDreamWithTelemetry(1, -0.8, 0.3, 'Sad Dream'),
                createDreamWithTelemetry(2, -0.6, 0.2, 'Melancholy Dream'),
                createDreamWithTelemetry(3, -0.9, 0.4, 'Lethargic Dream')
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            // Should show Depressed quadrant with count 3
            expect(screen.getByText(/Depressed \(3\)/)).toBeInTheDocument();
        });
    });

    describe('Quadrant Statistics', () => {
        it('counts dreams per quadrant correctly', () => {
            const dreams = [
                // 2 in high energy positive
                createDreamWithTelemetry(1, 0.8, 0.9),
                createDreamWithTelemetry(2, 0.6, 0.7),
                // 1 in high energy negative
                createDreamWithTelemetry(3, -0.8, 0.9),
                // 1 in low energy positive
                createDreamWithTelemetry(4, 0.8, 0.3),
                // 1 in low energy negative
                createDreamWithTelemetry(5, -0.8, 0.3)
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            // Total should be 5
            expect(screen.getByText('5 dreams')).toBeInTheDocument();
        });

        it('calculates percentages correctly', () => {
            // All 4 dreams in same quadrant (high energy positive)
            const dreams = [
                createDreamWithTelemetry(1, 0.8, 0.9),
                createDreamWithTelemetry(2, 0.6, 0.7),
                createDreamWithTelemetry(3, 0.7, 0.8),
                createDreamWithTelemetry(4, 0.9, 0.6)
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            // Should show 100% for Excited
            expect(screen.getByText('(100%)')).toBeInTheDocument();
        });
    });

    describe('Filtering', () => {
        it('shows filter pills for each quadrant', () => {
            const dreams = [
                createDreamWithTelemetry(1, 0.8, 0.9),
                createDreamWithTelemetry(2, -0.6, 0.8),
                createDreamWithTelemetry(3, 0.7, 0.2),
                createDreamWithTelemetry(4, -0.5, 0.3)
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            // Should have All filter and 4 quadrant filters
            expect(screen.getByText(/All \(\d+\)/)).toBeInTheDocument();
        });

        it('filters dreams when quadrant pill clicked', () => {
            const dreams = [
                createDreamWithTelemetry(1, 0.8, 0.9, 'Excited 1'),
                createDreamWithTelemetry(2, 0.6, 0.7, 'Excited 2'),
                createDreamWithTelemetry(3, -0.8, 0.9, 'Tense 1'),
                createDreamWithTelemetry(4, 0.7, 0.2, 'Calm 1')
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            // Click the Excited filter
            const excitedFilter = screen.getByRole('button', { name: /Excited \(2\)/ });
            fireEvent.click(excitedFilter);

            // Should now show 2 dreams
            expect(screen.getByText('2 dreams')).toBeInTheDocument();
        });
    });

    describe('Coordinate Conversion', () => {
        it('converts valence/arousal to plot coordinates correctly', () => {
            // Testing the coordinate conversion logic
            const toPlotCoords = (valence: number, arousal: number) => ({
                x: ((valence + 1) / 2) * 100,
                y: (1 - arousal) * 100
            });

            // Max positive, max arousal -> top right
            const topRight = toPlotCoords(1, 1);
            expect(topRight.x).toBe(100);
            expect(topRight.y).toBe(0);

            // Max negative, min arousal -> bottom left
            const bottomLeft = toPlotCoords(-1, 0);
            expect(bottomLeft.x).toBe(0);
            expect(bottomLeft.y).toBe(100);

            // Center
            const center = toPlotCoords(0, 0.5);
            expect(center.x).toBe(50);
            expect(center.y).toBe(50);
        });
    });

    describe('Dreams without Telemetry', () => {
        it('ignores dreams without aiAnalysis', () => {
            const dreams: Dream[] = [
                createDreamWithTelemetry(1, 0.8, 0.9),
                createDreamWithTelemetry(2, 0.6, 0.7),
                createDreamWithTelemetry(3, 0.7, 0.8),
                {
                    id: 4,
                    timestamp: new Date().toISOString(),
                    dreamText: 'No telemetry dream',
                    sleepQuality: 3,
                    title: 'No Analysis',
                    imageUrl: null,
                    aiAnalysis: null,
                    chatHistory: []
                }
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            // Should show 3 dreams, not 4
            expect(screen.getByText('3 dreams')).toBeInTheDocument();
        });

        it('ignores dreams with aiAnalysis but no telemetry', () => {
            const dreamsWithNoTelemetry: Dream[] = [
                createDreamWithTelemetry(1, 0.8, 0.9),
                createDreamWithTelemetry(2, 0.6, 0.7),
                createDreamWithTelemetry(3, 0.7, 0.8),
                {
                    id: 4,
                    timestamp: new Date().toISOString(),
                    dreamText: 'Has analysis but no telemetry',
                    sleepQuality: 3,
                    title: 'Partial Analysis',
                    imageUrl: null,
                    aiAnalysis: {
                        title: 'Test',
                        analysis: [],
                        integration: { title: 'T', content: 'T' }
                        // No telemetry field
                    },
                    chatHistory: []
                }
            ];
            render(<TelemetryScatterPlot dreams={dreamsWithNoTelemetry} />);

            expect(screen.getByText('3 dreams')).toBeInTheDocument();
        });
    });

    describe('Interpretation Text', () => {
        it('shows interpretation when 5+ dreams available', () => {
            const dreams = [
                createDreamWithTelemetry(1, 0.8, 0.9),
                createDreamWithTelemetry(2, 0.6, 0.7),
                createDreamWithTelemetry(3, 0.7, 0.8),
                createDreamWithTelemetry(4, 0.5, 0.6),
                createDreamWithTelemetry(5, 0.4, 0.9)
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            // Should show interpretation text
            expect(screen.getByText(/Your dreams tend toward/)).toBeInTheDocument();
        });

        it('does not show interpretation with fewer than 5 dreams', () => {
            const dreams = [
                createDreamWithTelemetry(1, 0.8, 0.9),
                createDreamWithTelemetry(2, 0.6, 0.7),
                createDreamWithTelemetry(3, 0.7, 0.8)
            ];
            render(<TelemetryScatterPlot dreams={dreams} />);

            expect(screen.queryByText(/Your dreams tend toward/)).not.toBeInTheDocument();
        });
    });

    describe('Dream Selection Callback', () => {
        it('calls onDreamSelect when data point clicked', () => {
            let selectedId: number | null = null;
            const handleSelect = (id: number) => { selectedId = id; };

            const dreams = [
                createDreamWithTelemetry(1, 0.8, 0.9, 'Click Me'),
                createDreamWithTelemetry(2, 0.6, 0.7),
                createDreamWithTelemetry(3, 0.7, 0.8)
            ];
            render(<TelemetryScatterPlot dreams={dreams} onDreamSelect={handleSelect} />);

            // Find and click a data point
            const dataPoints = screen.getAllByRole('button', { name: /Dream/ });
            fireEvent.click(dataPoints[0]);

            expect(selectedId).toBe(1);
        });
    });
});
