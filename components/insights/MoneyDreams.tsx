import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface MoneyDreamsProps {
    dreams: Dream[];
}

const MONEY = ['money', 'rich', 'wealth', 'cash', 'bank', 'dollar', 'gold', 'treasure', 'lottery', 'pay', 'buy', 'spend'];

export const MoneyDreams: React.FC<MoneyDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const moneyDreams = dreams.filter(d =>
            MONEY.some(m => (d.dreamText?.toLowerCase() ?? '').includes(m))
        );

        return {
            count: moneyDreams.length,
            percentage: Math.round((moneyDreams.length / dreams.length) * 100)
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 dark:border-emerald-500/30 rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Money Dreams</h3>
            <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-emerald-400">{stats.percentage}%</div>
                <div className="text-xs text-day-text-secondary dark:text-night-text-secondary">Dreams about money</div>
                <div className="text-sm mt-1">{stats.count} dreams</div>
            </div>
        </div>
    );
};
