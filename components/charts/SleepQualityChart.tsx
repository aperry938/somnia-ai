import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useClock } from '../../hooks/useClock';

interface ChartData {
    date: string;
    quality: number | null;
}

interface SleepQualityChartProps {
    data: ChartData[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-day-card-bg/80 dark:bg-night-card-bg/80 backdrop-blur-sm p-2 border border-day-border dark:border-night-border rounded-md shadow-lg">
                <p className="label font-bold">{`${label}`}</p>
                <p className="intro text-day-accent dark:text-night-accent">{`Quality : ${payload[0].value} / 5`}</p>
            </div>
        );
    }
    return null;
};

export const SleepQualityChart: React.FC<SleepQualityChartProps> = ({ data }) => {
    const { theme } = useClock();
    const isDark = theme === 'night';
    
    const colors = {
        grid: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        text: isDark ? '#94A3B8' : '#475569',
        line: isDark ? '#818CF8' : '#6366F1',
        areaStart: isDark ? '#818CF8' : '#6366F1',
        areaEnd: isDark ? '#1E293B' : '#D9E2EC'
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, left: -25, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorQuality" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.areaStart} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={colors.areaEnd} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={colors.text} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 5]} stroke={colors.text} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="quality" stroke={colors.line} strokeWidth={2} fillOpacity={1} fill="url(#colorQuality)" />
            </AreaChart>
        </ResponsiveContainer>
    );
};