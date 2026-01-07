// components/shared/SleepQualityRating.tsx
import React, { useState } from 'react';

interface SleepQualityRatingProps {
    rating: number | null;
    onRate: (rating: number) => void;
}

export const SleepQualityRating: React.FC<SleepQualityRatingProps> = ({ rating, onRate }) => {
    const [hoverRating, setHoverRating] = useState(0);

    const stars = Array(5).fill(0).map((_, index) => {
        const starValue = index + 1;
        const isSelected = starValue <= (rating || 0);
        const isHovered = starValue <= hoverRating;

        return (
            <svg
                key={starValue}
                onClick={() => onRate(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                className={`w-8 h-8 cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-110 ${isSelected || isHovered ? 'text-day-accent dark:text-night-accent' : 'text-day-border dark:text-night-border'}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
        );
    });

    return (
        <div className="flex justify-center gap-2">
            {stars}
        </div>
    );
};
