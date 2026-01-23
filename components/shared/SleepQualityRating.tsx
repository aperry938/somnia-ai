// components/shared/SleepQualityRating.tsx
import React, { useState, useCallback } from 'react';
import haptics from '../../services/hapticsService';

const QUALITY_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];

interface SleepQualityRatingProps {
    rating: number | null;
    onRate: (rating: number) => void;
}

export const SleepQualityRating: React.FC<SleepQualityRatingProps> = ({ rating, onRate }) => {
    const [hoverRating, setHoverRating] = useState(0);

    const handleKeyDown = useCallback((e: React.KeyboardEvent, starValue: number) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRate(starValue);
        }
    }, [onRate]);

    const stars = Array(5).fill(0).map((_, index) => {
        const starValue = index + 1;
        const isSelected = starValue <= (rating || 0);
        const isHovered = starValue <= hoverRating;

        return (
            <button
                key={starValue}
                type="button"
                onClick={() => { haptics.selection(); onRate(starValue); }}
                onKeyDown={(e) => handleKeyDown(e, starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${starValue} out of 5 stars - ${QUALITY_LABELS[index]}`}
                aria-pressed={rating === starValue}
                className={`p-1 min-w-[44px] min-h-[44px] flex items-center justify-center bg-transparent border-none cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent focus:ring-offset-2 rounded ${isSelected || isHovered ? 'text-day-accent dark:text-night-accent' : 'text-day-border dark:text-night-border'}`}
            >
                <svg
                    className="w-8 h-8"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
            </button>
        );
    });

    return (
        <div className="flex justify-center gap-2" role="group" aria-label="Sleep quality rating">
            {stars}
        </div>
    );
};
