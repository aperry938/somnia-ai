/**
 * Sleep Monitor Card
 *
 * Displays real-time audio classification during sleep monitoring.
 * Uses TensorFlow.js to detect sleep talk, snoring, and movement.
 *
 * Privacy-first: All audio processing happens on-device.
 */

import React, { useState } from 'react';
import { useAudioClassification } from '../../hooks/useAudioClassification';
import { SleepAudioEvent } from '../../services/mlService';

const EVENT_COLORS: Record<SleepAudioEvent['type'], string> = {
    speech: 'bg-purple-500',
    snoring: 'bg-blue-500',
    movement: 'bg-yellow-500',
    silence: 'bg-gray-500',
    ambient: 'bg-green-500'
};

const EVENT_LABELS: Record<SleepAudioEvent['type'], string> = {
    speech: 'Speech',
    snoring: 'Snoring',
    movement: 'Movement',
    silence: 'Silence',
    ambient: 'Ambient'
};

export const SleepMonitorCard: React.FC = () => {
    const {
        isRecording,
        isInitialized,
        currentClassification,
        events,
        error,
        permissionDenied,
        startRecording,
        stopRecording,
        clearEvents
    } = useAudioClassification();

    const [expanded, setExpanded] = useState(false);

    const formatDuration = (ms: number): string => {
        const seconds = Math.round(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    };

    const formatTime = (timestamp: number): string => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get event summary
    const eventSummary = events.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <button
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                className="w-full flex items-center justify-between min-h-[56px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-day-accent dark:focus:ring-night-accent rounded-lg"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-day-accent/10 dark:bg-night-accent/10'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRecording ? 'text-red-500' : 'text-day-accent dark:text-night-accent'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h3 className="font-serif text-lg">Sleep Monitor</h3>
                        <p className="text-xs text-day-text-secondary dark:text-night-text-secondary">
                            {isRecording ? 'Recording...' : 'ML-powered audio analysis'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {events.length > 0 && (
                        <span className="text-xs bg-day-accent/20 dark:bg-night-accent/20 px-2 py-0.5 rounded-full">
                            {events.length} events
                        </span>
                    )}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 text-day-text-secondary dark:text-night-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {expanded && (
                <div className="mt-4 space-y-4 animate-fadeIn">
                    {/* Error/Permission State */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <p className="text-sm text-red-400">{error}</p>
                            {permissionDenied && (
                                <p className="text-xs text-red-400/70 mt-1">
                                    Grant microphone access in your browser settings to use this feature.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Privacy Notice */}
                    <div className="flex items-start gap-2 text-xs text-day-text-secondary dark:text-night-text-secondary bg-day-accent/5 dark:bg-night-accent/5 rounded-lg p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>All audio is processed locally using TensorFlow.js. No recordings leave your device.</span>
                    </div>

                    {/* Current Classification */}
                    {isRecording && currentClassification && (
                        <div className="flex items-center justify-between bg-white/50 dark:bg-black/20 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${EVENT_COLORS[currentClassification.label as SleepAudioEvent['type']] || 'bg-gray-500'}`} />
                                <span className="text-sm font-medium capitalize">{currentClassification.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-day-accent dark:bg-night-accent transition-all"
                                        style={{ width: `${currentClassification.confidence * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs opacity-70">{Math.round(currentClassification.confidence * 100)}%</span>
                            </div>
                        </div>
                    )}

                    {/* Control Button */}
                    <button
                        onClick={() => isRecording ? stopRecording() : startRecording()}
                        disabled={!isInitialized}
                        className={`w-full py-3 rounded-lg font-medium transition-colors ${
                            isRecording
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-day-accent dark:bg-night-accent text-white hover:opacity-90'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {!isInitialized ? 'Initializing ML...' : isRecording ? 'Stop Monitoring' : 'Start Sleep Monitor'}
                    </button>

                    {/* Event Summary */}
                    {Object.keys(eventSummary).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(eventSummary).map(([type, count]) => (
                                <div key={type} className="flex items-center gap-1.5 bg-white/30 dark:bg-black/20 px-2 py-1 rounded-full text-xs">
                                    <div className={`w-2 h-2 rounded-full ${EVENT_COLORS[type as SleepAudioEvent['type']]}`} />
                                    <span>{EVENT_LABELS[type as SleepAudioEvent['type']]}: {count}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Event Log */}
                    {events.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">Event Log</h4>
                                <button
                                    onClick={clearEvents}
                                    className="text-xs text-day-text-secondary dark:text-night-text-secondary hover:text-day-accent dark:hover:text-night-accent"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {events.slice(-20).reverse().map((event, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs bg-white/20 dark:bg-black/10 rounded px-2 py-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${EVENT_COLORS[event.type]}`} />
                                            <span className="capitalize">{event.type}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-day-text-secondary dark:text-night-text-secondary">
                                            <span>{formatDuration(event.duration)}</span>
                                            <span>{formatTime(event.timestamp)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
