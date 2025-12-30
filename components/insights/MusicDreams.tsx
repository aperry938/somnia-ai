import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface MusicDreamsProps {
    dreams: Dream[];
}

const MUSIC = ['music', 'song', 'singing', 'dance', 'dancing', 'guitar', 'piano', 'drum', 'concert', 'melody', 'playing music'];

export const MusicDreams: React.FC<MusicDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const musicDreams = dreams.filter(d =>
            MUSIC.some(m => d.dreamText.toLowerCase().includes(m))
        );

        return {
            count: musicDreams.length,
            percentage: Math.round((musicDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Musical Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-purple-500">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with music</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
