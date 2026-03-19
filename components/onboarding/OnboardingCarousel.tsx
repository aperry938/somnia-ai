import React, { useState, useEffect, useCallback } from 'react';
import { initAudioContext, playSleepSound, stopSleepSound } from '../../services/audioService';
import { SOUNDSCAPES } from '../../constants';
import { AnalysisPersonality } from '../../types';

interface OnboardingCarouselProps {
    onComplete: () => void;
}

// Sleep profile state
interface SleepProfile {
    sleepGoal: number;
    usualBedtime: string;
    sleepChallenges: string[];
}

const SLEEP_GOALS = [6, 7, 8, 9] as const;
const BEDTIME_OPTIONS = ['Before 10pm', '10pm-12am', 'After midnight'] as const;
const CHALLENGE_OPTIONS = [
    'Trouble falling asleep',
    'Wake during night',
    'Light sleeper',
    'Irregular schedule',
    'None',
] as const;

interface PersonalityOption {
    id: AnalysisPersonality;
    name: string;
    label: string;
    description: string;
}

const PERSONALITY_OPTIONS: PersonalityOption[] = [
    {
        id: 'oneironaut',
        name: 'The Oneironaut',
        label: 'Supportive',
        description: 'Warm, psychologically-grounded dream exploration',
    },
    {
        id: 'scientific',
        name: 'The Analyst',
        label: 'Clinical',
        description: 'Evidence-based, structured dream analysis',
    },
    {
        id: 'jungian',
        name: 'The Mystic',
        label: 'Mystical',
        description: 'Mythological, archetypal dream interpretation',
    },
];

interface SlideDefinition {
    title: string;
    description?: string;
    icon: React.ReactNode;
    soundscapeId?: string;
    isFinal?: boolean;
    isInteractive?: boolean;
    interactiveType?: 'sleep-profile' | 'personality';
}

const slideDefinitions: SlideDefinition[] = [
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
        soundscapeId: 'brown_noise',
    },
    {
        title: "What's Your Sleep Like?",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        soundscapeId: 'brown_noise',
        isInteractive: true,
        interactiveType: 'sleep-profile',
    },
    {
        title: 'Your AI Companion',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        ),
        soundscapeId: 'brown_noise',
        isInteractive: true,
        interactiveType: 'personality',
    },
    {
        title: 'Ready to Begin?',
        description: 'Set your alarm, optimize your rest, and track your progress. Better sleep habits begin tonight.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-day-accent dark:text-night-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        soundscapeId: 'brown_noise',
        isFinal: true,
    },
];

// ============================================================================
// Sleep Profile Slide
// ============================================================================

const SleepProfileSlide: React.FC<{
    profile: SleepProfile;
    onUpdate: (profile: SleepProfile) => void;
}> = ({ profile, onUpdate }) => {
    const toggleChallenge = useCallback((challenge: string) => {
        let next: string[];
        if (challenge === 'None') {
            // Selecting "None" clears all others
            next = profile.sleepChallenges.includes('None') ? [] : ['None'];
        } else {
            // Selecting any other option removes "None"
            const without = profile.sleepChallenges.filter(c => c !== 'None');
            next = without.includes(challenge)
                ? without.filter(c => c !== challenge)
                : [...without, challenge];
        }
        onUpdate({ ...profile, sleepChallenges: next });
    }, [profile, onUpdate]);

    return (
        <div className="w-full max-w-md space-y-6 text-left" data-no-swipe>
            {/* Sleep Goal */}
            <div>
                <label className="block text-sm font-medium text-day-text-secondary dark:text-night-text-secondary mb-2">
                    Sleep goal (hours per night)
                </label>
                <div className="flex gap-2">
                    {SLEEP_GOALS.map(goal => (
                        <button
                            key={goal}
                            onClick={() => onUpdate({ ...profile, sleepGoal: goal })}
                            className={`flex-1 py-3 min-h-[48px] rounded-xl font-medium text-base transition-all flex items-center justify-center ${
                                profile.sleepGoal === goal
                                    ? 'bg-day-accent dark:bg-night-accent text-white shadow-lg'
                                    : 'bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border text-day-text-secondary dark:text-night-text-secondary'
                            }`}
                            aria-pressed={profile.sleepGoal === goal}
                            aria-label={`${goal} hours${goal === 9 ? ' or more' : ''}`}
                        >
                            {goal === 9 ? '9h+' : `${goal}h`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Usual Bedtime */}
            <div>
                <label className="block text-sm font-medium text-day-text-secondary dark:text-night-text-secondary mb-2">
                    Usual bedtime
                </label>
                <div className="flex gap-2">
                    {BEDTIME_OPTIONS.map(option => (
                        <button
                            key={option}
                            onClick={() => onUpdate({ ...profile, usualBedtime: option })}
                            className={`flex-1 py-3 min-h-[48px] rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center justify-center px-2 ${
                                profile.usualBedtime === option
                                    ? 'bg-day-accent dark:bg-night-accent text-white shadow-lg'
                                    : 'bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border text-day-text-secondary dark:text-night-text-secondary'
                            }`}
                            aria-pressed={profile.usualBedtime === option}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sleep Challenges */}
            <div>
                <label className="block text-sm font-medium text-day-text-secondary dark:text-night-text-secondary mb-2">
                    Sleep challenges
                </label>
                <div className="flex flex-wrap gap-2">
                    {CHALLENGE_OPTIONS.map(challenge => {
                        const isSelected = profile.sleepChallenges.includes(challenge);
                        return (
                            <button
                                key={challenge}
                                onClick={() => toggleChallenge(challenge)}
                                className={`px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-all flex items-center justify-center ${
                                    isSelected
                                        ? 'bg-day-accent dark:bg-night-accent text-white shadow-lg'
                                        : 'bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border text-day-text-secondary dark:text-night-text-secondary'
                                }`}
                                aria-pressed={isSelected}
                            >
                                {challenge}
                            </button>
                        );
                    })}
                </div>
            </div>

            <p className="text-xs text-center text-day-text-secondary/60 dark:text-night-text-secondary/60">
                All fields are optional. You can change these later in settings.
            </p>
        </div>
    );
};

// ============================================================================
// Personality Slide
// ============================================================================

const PersonalitySlide: React.FC<{
    selected: AnalysisPersonality;
    onSelect: (personality: AnalysisPersonality) => void;
}> = ({ selected, onSelect }) => (
    <div className="w-full max-w-md space-y-3" data-no-swipe>
        {PERSONALITY_OPTIONS.map(option => {
            const isSelected = selected === option.id;
            return (
                <button
                    key={option.id}
                    onClick={() => onSelect(option.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all border ${
                        isSelected
                            ? 'bg-day-accent/15 dark:bg-night-accent/15 border-day-accent dark:border-night-accent shadow-lg'
                            : 'bg-day-card-bg dark:bg-night-card-bg border-day-border dark:border-night-border'
                    }`}
                    aria-pressed={isSelected}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isSelected
                                ? 'bg-day-accent dark:bg-night-accent'
                                : 'bg-day-border dark:bg-night-border'
                        }`}>
                            <div className={`w-3 h-3 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-transparent'
                            }`} />
                        </div>
                        <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`font-medium ${
                                    isSelected
                                        ? 'text-day-accent dark:text-night-accent'
                                        : 'text-day-text-primary dark:text-night-text-primary'
                                }`}>
                                    {option.name}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-day-border/50 dark:bg-night-border/50 text-day-text-secondary dark:text-night-text-secondary">
                                    {option.label}
                                </span>
                            </div>
                            <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mt-0.5">
                                {option.description}
                            </p>
                        </div>
                    </div>
                </button>
            );
        })}

        <p className="text-xs text-center text-day-text-secondary/60 dark:text-night-text-secondary/60 pt-2">
            You can change this anytime in settings.
        </p>
    </div>
);

// ============================================================================
// Main Carousel
// ============================================================================

export const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({ onComplete }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    // Sleep profile state
    const [sleepProfile, setSleepProfile] = useState<SleepProfile>({
        sleepGoal: 8,
        usualBedtime: '',
        sleepChallenges: [],
    });

    // Personality state
    const [selectedPersonality, setSelectedPersonality] = useState<AnalysisPersonality>('oneironaut');

    // Play premium soundscape preview for each slide - gives free users a taste of PRO features
    useEffect(() => {
        const currentSoundscapeId = slideDefinitions[currentSlide]?.soundscapeId;
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

    // Persist selections to localStorage before completing
    const saveSelections = useCallback(() => {
        // Sleep profile
        localStorage.setItem('somnia_sleep_goal', String(sleepProfile.sleepGoal));
        if (sleepProfile.usualBedtime) {
            localStorage.setItem('somnia_usual_bedtime', sleepProfile.usualBedtime);
        }
        if (sleepProfile.sleepChallenges.length > 0) {
            localStorage.setItem('somnia_sleep_challenges', JSON.stringify(sleepProfile.sleepChallenges));
        }

        // Also write sleepGoal into the biometrics localStorage (matches Biometrics.sleepGoal)
        try {
            const stored = localStorage.getItem('somnia_biometrics');
            const biometrics = stored ? JSON.parse(stored) : { age: null, gender: '', avgSleep: null };
            biometrics.sleepGoal = sleepProfile.sleepGoal;
            localStorage.setItem('somnia_biometrics', JSON.stringify(biometrics));
        } catch {
            // Non-critical - biometrics context will pick up the standalone key
        }

        // Personality
        localStorage.setItem('somnia_analysis_personality', selectedPersonality);
    }, [sleepProfile, selectedPersonality]);

    // Stop audio when completing onboarding
    const handleComplete = useCallback(() => {
        saveSelections();
        stopSleepSound(0.5);
        onComplete();
    }, [saveSelections, onComplete]);

    const handleNext = useCallback(() => {
        if (currentSlide < slideDefinitions.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            handleComplete();
        }
    }, [currentSlide, handleComplete]);

    const handleSkip = useCallback(() => {
        handleComplete();
    }, [handleComplete]);

    const slide = slideDefinitions[currentSlide];

    if (!slide) return null;

    const renderInteractiveContent = () => {
        if (!slide.isInteractive) return null;

        if (slide.interactiveType === 'sleep-profile') {
            return <SleepProfileSlide profile={sleepProfile} onUpdate={setSleepProfile} />;
        }

        if (slide.interactiveType === 'personality') {
            return <PersonalitySlide selected={selectedPersonality} onSelect={setSelectedPersonality} />;
        }

        return null;
    };

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
            <div
                className={`flex-1 flex flex-col items-center text-center max-w-lg animate-fadeIn px-4 ${
                    slide.isInteractive ? 'justify-start pt-8 overflow-y-auto' : 'justify-center'
                }`}
                role="region"
                aria-live="polite"
                aria-label={`Onboarding slide ${currentSlide + 1} of ${slideDefinitions.length}`}
            >
                <div className={slide.isInteractive ? 'mb-4' : 'mb-10'} aria-hidden="true">
                    {slide.icon}
                </div>
                <h1 className="font-serif text-3xl mb-4 text-gray-500 dark:text-night-text-secondary">{slide.title}</h1>
                {slide.description && (
                    <p className="text-day-text-secondary dark:text-night-text-primary/90 text-lg leading-loose mb-4">
                        {slide.description}
                    </p>
                )}
                {renderInteractiveContent()}
            </div>

            {/* Navigation */}
            <div className="w-full max-w-md flex-shrink-0">
                {/* Dots */}
                <div className="flex justify-center gap-2 mb-8">
                    {slideDefinitions.map((_, index) => (
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
