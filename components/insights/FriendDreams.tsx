import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface FriendDreamsProps {
    dreams: Dream[];
}

const FRIENDS = ['friend', 'buddy', 'pal', 'mate', 'companion', 'best friend', 'classmate', 'roommate', 'neighbor'];

export const FriendDreams: React.FC<FriendDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const friendDreams = dreams.filter(d =>
            FRIENDS.some(f => d.dreamText.toLowerCase().includes(f))
        );

        return {
            count: friendDreams.length,
            percentage: Math.round((friendDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Friend Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with friends</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
