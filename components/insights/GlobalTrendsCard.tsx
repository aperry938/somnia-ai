import React from 'react';
import { getGlobalDreamTrends, getGlobalSleepStats, GlobalTrend } from '../../services/dreamTrendsService';

export const GlobalTrendsCard: React.FC = () => {
    const trends = getGlobalDreamTrends();
    const stats = getGlobalSleepStats();

    return (
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-lg border border-indigo-500/30 p-6 rounded-xl text-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
                    <span className="text-2xl">🌍</span> Global Dream Stream
                </h2>
                <div className="text-xs bg-indigo-500/20 px-2 py-1 rounded-full border border-indigo-500/30">
                    {stats.activeDreamers.toLocaleString()} Dreamers Active
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-indigo-200 uppercase tracking-wider">Trending Themes (This Week)</h3>
                <div className="space-y-3">
                    {trends.map((trend) => (
                        <div key={trend.topic} className="relative">
                            <div className="flex justify-between text-sm mb-1">
                                <span>{trend.topic}</span>
                                <span className={trend.change === 'up' ? 'text-green-400' : trend.change === 'down' ? 'text-red-400' : 'text-gray-400'}>
                                    {trend.percentage}% {trend.change === 'up' ? '↑' : trend.change === 'down' ? '↓' : '-'}
                                </span>
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-1000 ${trend.sentiment === 'positive' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                                            trend.sentiment === 'negative' ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                                                'bg-gradient-to-r from-blue-400 to-indigo-500'
                                        }`}
                                    style={{ width: `${trend.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-indigo-500/30 grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-xs text-indigo-300">Global Avg Sleep</p>
                    <p className="font-mono text-lg font-bold">{stats.avgSleepTime}</p>
                </div>
                <div>
                    <p className="text-xs text-indigo-300">Global Avg Quality</p>
                    <p className="font-mono text-lg font-bold">{stats.avgQuality} / 5.0</p>
                </div>
            </div>
        </div>
    );
};
