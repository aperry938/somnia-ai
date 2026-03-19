import React, { useState, useEffect } from 'react';
import { initAudioContext, playSleepSound, stopSleepSound } from '../../services/audioService';
import { SOUNDSCAPES } from '../../constants';

interface OnboardingCarouselProps {
    onComplete: () => void;
}

const slides = [
    {
        title: 'Rest Better. Live Better.',
        description: 'Your complete sleep wellness ecosystem. Designed for deeper rest and clearer mornings. Where science meets the art of restful sleep.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
        ),
        // No sound on first slide - browser requires user interaction before audio plays
    },
    {
        title: 'AI-Powered Dream Analysis',
        description: 'Get personalized insights into your dreams using AI. Explore patterns, symbols, and themes—grounded in psychology, helping you make sense of your dreams.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        ),
        // Brown noise - works best on mobile speakers
        soundscapeId: 'brown_noise',
    },
    {
        title: 'Science-Backed Sleep Tools',
        description: 'Binaural beats, guided breathwork, and soundscapes all synthesized in real-time to prepare your mind for restful sleep. Binaural beats require headphones and are not recommended for those with epilepsy. Keep volume comfortable.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
        ),
        // Brown noise - works best on mobile speakers
        soundscapeId: 'brown_noise',
    },
    {
        title: 'Ready to Begin?',
        description: 'Set your alarm, optimize your rest, and track your progress. Better sleep habits begin tonight.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        // Brown noise - works best on mobile speakers
        soundscapeId: 'brown_noise',
        isFinal: true,
    },
];

export const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({ onComplete }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    // Play premium soundscape preview for each slide - gives free users a taste of PRO features
    useEffect(() => {
        const currentSoundscapeId = slides[currentSlide]?.soundscapeId;
        let isActive = true;

        if (currentSoundscapeId) {
            // Initialize audio context (requires user gesture - carousel navigation counts)
            initAudioContext();

            // Small delay to let previous sound fade out
            const playTimeout = setTimeout(() => {
                if (!isActive) return;

                // Find the soundscape for this slide
                const soundscape = SOUNDSCAPES.find(s => s.id === currentSoundscapeId);
                if (soundscape) {
                    // Play at maximum volume for carousel preview, 0 = infinite duration (until stopped)
                    playSleepSound(soundscape, 0, 1.0);
                }
            }, 300);

            // Cleanup when leaving the slide or unmounting
            return () => {
                isActive = false;
                clearTimeout(playTimeout);
                stopSleepSound(0.8); // Longer fade out for smoother transitions
            };
        }

        return () => {
            isActive = false;
        };
    }, [currentSlide]);

    // Stop audio when completing onboarding
    const handleComplete = () => {
        stopSleepSound(0.5);
        onComplete();
    };

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            handleComplete();
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    const slide = slides[currentSlide];

    if (!slide) return null;

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-day-bg-start to-day-bg-end dark:from-night-bg-start dark:to-night-bg-end flex flex-col items-center justify-center p-6 pt-[calc(1.5rem+var(--safe-area-inset-top))] pb-[calc(1.5rem+var(--safe-area-inset-bottom))]">
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
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg animate-fadeIn px-4" role="region" aria-live="polite" aria-label={`Onboarding slide ${currentSlide + 1} of ${slides.length}`}>
                <div className="mb-10" aria-hidden="true">
                    {slide.icon}
                </div>
                <h1 className="font-serif text-3xl mb-6 text-gray-500 dark:text-night-text-secondary">{slide.title}</h1>
                <p className="text-day-text-secondary dark:text-night-text-primary/90 text-lg leading-loose">
                    {slide.description}
                </p>
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
