import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface VehicleDreamsProps {
    dreams: Dream[];
}

const VEHICLES = ['car', 'plane', 'train', 'bus', 'boat', 'ship', 'bicycle', 'motorcycle', 'helicopter', 'spaceship'];

export const VehicleDreams: React.FC<VehicleDreamsProps> = ({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        const vehicleCounts: Record<string, number> = {};

        dreams.forEach(d => {
            const text = d.dreamText.toLowerCase();
            VEHICLES.forEach(v => {
                if (text.includes(v)) {
                    vehicleCounts[v] = (vehicleCounts[v] || 0) + 1;
                }
            });
        });

        const sorted = Object.entries(vehicleCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const total = sorted.reduce((s, [, c]) => s + c, 0);

        return { vehicles: sorted, total };
    }, [dreams]);

    if (!stats || stats.total === 0) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Vehicle Dreams</h3>
            <div className="flex flex-wrap gap-2">
                {stats.vehicles.map(([vehicle, count]) => (
                    <span key={vehicle} className="px-3 py-1 bg-blue-500/10 dark:bg-blue-500/20 rounded-full text-sm capitalize">
                        {vehicle} ({count})
                    </span>
                ))}
            </div>
        </div>
    );
};
