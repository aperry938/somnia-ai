import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { Dream } from '../../types';

interface SentimentChartProps {
    dreams: Dream[];
}

export const SentimentChart: React.FC<SentimentChartProps> = ({ dreams }) => {
    const { theme } = useTheme();

    const data = useMemo(() => {
        return dreams
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .map(dream => {
                // Mock sentiment calculation since we don't store it explicitly yet
                // Use sleep quality or pseudo-random hash of title for visual variety if quality is null
                const pseudoSentiment = dream.sleepQuality
                    ? (dream.sleepQuality - 3) * 25 // 1->-50, 3->0, 5->50
                    : (dream.title.length % 10 - 5) * 10;

                return {
                    date: new Date(dream.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                    sentiment: pseudoSentiment,
                    title: dream.title
                };
            })
            .slice(-14); // Last 14 entries
    }, [dreams]);

    if (data.length < 2) return null;

    const isDark = theme === 'night';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const areaColor = isDark ? '#818cf8' : '#6366f1';
    const textColor = isDark ? '#9ca3af' : '#6b7280';

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg backdrop-blur-lg border border-day-border dark:border-night-border p-6 rounded-xl animate-fadeIn">
            <h3 className="font-serif text-xl font-bold mb-1">Emotional Arc</h3>
            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-6">Sentiment trends over your last 14 dreams</p>

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
                            dataKey="date"
                            stroke={textColor}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            hide={true}
                            domain={[-100, 100]}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                                borderColor: gridColor,
                                borderRadius: '0.5rem',
                                color: textColor
                            }}
                            itemStyle={{ color: areaColor }}
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
