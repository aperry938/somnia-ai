import React, { useMemo } from 'react';
import { Dream } from '../../types';

interface SocialDreamsProps {
    dreams: Dream[];
}

const SOCIAL = ['friend', 'family', 'party', 'together', 'group', 'crowd', 'people', 'talk', 'conversation', 'meet', 'gathering'];
const ALONE = ['alone', 'lonely', 'solo', 'myself', 'by myself', 'solitary', 'isolated'];

export const SocialDreams: React.FC<SocialDreamsProps> = React.memo(({ dreams }) => {
    const stats = useMemo(() => {
        if (dreams.length < 5) return null;

        let social = 0, alone = 0;

        dreams.forEach(d => {
            const text = d.dreamText.toLowerCase();
            if (SOCIAL.some(s => text.includes(s))) social++;
            if (ALONE.some(a => text.includes(a))) alone++;
        });

        const total = social + alone || 1;

        return {
            social,
            alone,
            socialPct: Math.round((social / total) * 100),
            style: social > alone * 2 ? 'Social' : alone > social * 2 ? 'Introspective' : 'Balanced'
        };
    }, [dreams]);

    if (!stats) return null;

    return (
        <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4">
            <h3 className="font-serif text-lg mb-3">Social vs Alone</h3>
            <div className="flex h-4 rounded-full overflow-hidden mb-3">
                <div className="bg-orange-500" style={{ width: `${stats.socialPct}%` }} />
                <div className="bg-slate-500" style={{ width: `${100 - stats.socialPct}%` }} />
            </div>
            <div className="flex justify-between text-sm">
                <span><span className="font-bold text-orange-500">{stats.social}</span> Social</span>
                <span><span className="font-bold text-slate-500">{stats.alone}</span> Alone</span>
            </div>
            <p className="text-xs text-center text-day-text-secondary dark:text-night-text-secondary mt-2">{stats.style}</p>
        </div>
    );
});
