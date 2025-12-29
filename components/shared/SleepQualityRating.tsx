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
                fill="currentColor"
            >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
        );
    });

    return (
        <div className="flex justify-center gap-2">
            {stars}
        </div>
    );
};
