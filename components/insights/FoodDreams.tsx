import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface FoodDreamsProps {
    dreams: Dream[];
}

const FOODS = ['food', 'eat', 'eating', 'drink', 'water', 'coffee', 'cake', 'bread', 'fruit', 'meat', 'restaurant', 'kitchen', 'cook', 'meal'];

export const FoodDreams: React.FC<FoodDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const foodDreams = dreams.filter(d =>
            FOODS.some(f => (d.dreamText || '').toLowerCase().includes(f))
        );

        return {
            count: foodDreams.length,
            percentage: Math.round((foodDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Food Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams with food/eating</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
