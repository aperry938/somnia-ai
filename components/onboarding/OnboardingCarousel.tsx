import React, { useState } from 'react';

interface OnboardingCarouselProps {
    onComplete: () => void;
}

const slides = [
    {
        title: 'Rest Better. Live Better.',
        description: 'Your complete sleep wellness ecosystem. Designed for deeper rest and clearer mornings.',
        subtitle: 'Where science meets the art of restful sleep.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
        ),
    },
    {
        title: 'AI-Powered Dream Analysis',
        description: 'Get personalized insights into your dreams using AI. Explore patterns, symbols, and themes—grounded in psychology, helping you make sense of your dreams.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        ),
    },
    {
        title: 'Science-Backed Sleep Tools',
        description: 'Binaural beats, guided breathing exercises, and soundscapes all synthesized in real-time to prepare your mind for deep, restorative rest.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
        ),
    },
    {
        title: 'Ready to Begin?',
        description: 'Set an alarm, sleep well, and record your dreams upon waking. Your journey into the subconscious starts now.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        isFinal: true,
    },
];

export const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({ onComplete }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    const slide = slides[currentSlide];

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end flex flex-col items-center justify-center p-6">
            {/* Skip button */}
            {!slide.isFinal && (
                <button
                    onClick={handleSkip}
                    aria-label="Skip onboarding"
                    className="absolute top-6 right-6 px-4 py-2 min-h-[44px] text-day-text-secondary dark:text-night-text-secondary text-sm hover:text-day-accent dark:hover:text-night-accent transition-colors flex items-center justify-center"
                >
                    Skip
                </button>
            )}

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md animate-fadeIn" role="region" aria-live="polite" aria-label={`Onboarding slide ${currentSlide + 1} of ${slides.length}`}>
                <div className="mb-10" aria-hidden="true">
                    {slide.icon}
                </div>
                <h1 className="font-serif text-3xl mb-6 text-gray-500">{slide.title}</h1>
                <p className="text-day-text-secondary dark:text-night-text-primary/90 text-lg leading-loose">
                    {slide.description}
                </p>
                {slide.subtitle && (
                    <p className="text-day-text-secondary dark:text-night-text-primary/90 text-lg leading-loose mt-4 italic">
                        {slide.subtitle}
                    </p>
                )}
            </div>

            {/* Navigation */}
            <div className="w-full max-w-md">
                {/* Dots */}
                <div className="flex justify-center gap-2 mb-8">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label={`Go to slide ${index + 1}`}
                        >
                            <span className={`block w-2 h-2 rounded-full transition-all ${index === currentSlide
                                ? 'w-8 bg-day-accent dark:bg-night-accent'
                                : 'bg-day-border dark:bg-night-border'
                                }`} aria-hidden="true" />
                        </button>
                    ))}
                </div>

                {/* Button */}
                <button
                    onClick={handleNext}
                    className="w-full py-4 min-h-[48px] bg-day-accent dark:bg-night-accent text-white rounded-full font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center"
                >
                    {slide.isFinal ? 'Get Started' : 'Continue'}
                </button>
            </div>
        </div>
    );
};
