import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { Dream, DreamMood } from '../../types';

interface SentimentChartProps {
    dreams: Dream[];
}

// Map mood to sentiment score (-100 to 100)
const MOOD_SENTIMENT: Record<DreamMood, number> = {
    joyful: 80,
    hopeful: 60,
    peaceful: 50,
    nostalgic: 20,
    neutral: 0,
    confused: -20,
    anxious: -40,
    sad: -50,
    fearful: -60,
    nightmare: -80
};

export const SentimentChart: React.FC<SentimentChartProps> = ({ dreams }) => {
    const { theme } = useTheme();

    const data = useMemo(() => {
        const sorted = [...dreams]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-14); // Last 14 entries

        return sorted.map((dream, index) => {
            // Use actual mood data if available, otherwise fall back to sleep quality
            let sentiment: number;

            if (dream.mood && MOOD_SENTIMENT[dream.mood] !== undefined) {
                sentiment = MOOD_SENTIMENT[dream.mood];
            } else if (dream.sleepQuality) {
                sentiment = (dream.sleepQuality - 3) * 25; // 1->-50, 3->0, 5->50
            } else {
                sentiment = 0; // Default to neutral if no data
            }

            // Format date - use index for x-axis to handle same-day dreams
            const dateObj = new Date(dream.timestamp);
            const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

            return {
                xLabel: `#${index + 1}`,
                fullDate: `${dateStr} ${timeStr}`,
                shortDate: dateStr,
                sentiment,
                title: dream.title,
                mood: dream.mood
            };
        });
    }, [dreams]);

    if (data.length < 2) return null;

    const isDark = theme === 'night';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const areaColor = isDark ? '#818cf8' : '#6366f1';
    const textColor = isDark ? '#9ca3af' : '#6b7280';

    // Get sentiment label and color
    const getSentimentDisplay = (sentiment: number) => {
        if (sentiment >= 40) return { label: 'Very Positive', color: '#22c55e' };
        if (sentiment >= 15) return { label: 'Positive', color: '#84cc16' };
        if (sentiment >= -15) return { label: 'Neutral', color: '#9ca3af' };
        if (sentiment >= -40) return { label: 'Low', color: '#f59e0b' };
        return { label: 'Very Low', color: '#ef4444' };
    };

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-6 rounded-xl animate-fadeIn">
            <h3 className="font-serif text-xl font-bold mb-1">Emotional Arc</h3>
            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-6">Sentiment trends over your last {data.length} dreams</p>

            <div className="h-64 w-full" role="img" aria-label={`Emotional sentiment chart showing trends over ${data.length} dreams`}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={areaColor} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={areaColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                        <XAxis
                            dataKey="xLabel"
                            stroke={textColor}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            hide={true}
                            domain={[-100, 100]}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const item = payload[0]?.payload;
                                const sentiment = item?.sentiment || 0;
                                const { label: moodLabel, color: moodColor } = getSentimentDisplay(sentiment);

                                return (
                                    <div style={{
                                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                                        borderColor: gridColor,
                                        border: '1px solid',
                                        borderRadius: '0.5rem',
                                        padding: '8px 12px',
                                        color: isDark ? '#e5e7eb' : '#374151'
                                    }}>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{item?.fullDate}</div>
                                        <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: moodColor }}></span>
                                            {moodLabel}
                                            {item?.mood && (
                                                <span style={{ fontSize: 12, opacity: 0.7 }}>({item.mood})</span>
                                            )}
                                        </div>
                                        {item?.title && item.title !== 'Untitled Dream' && (
                                            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, maxWidth: 180 }}>{item.title}</div>
                                        )}
                                    </div>
                                );
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="sentiment"
                            stroke={areaColor}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorSentiment)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
