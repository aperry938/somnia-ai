import React, { useState, useEffect, useMemo } from 'react';
import { GuidedRelaxation } from '../../types';
import { playBreathSound } from '../../services/audioService';
import { useAppContext } from '../../contexts/AppContext';

const CircleVisualizer: React.FC<{ animationClass: string; animKey: number }> = ({ animationClass, animKey }) => (
    <div className="w-40 h-40 flex justify-center items-center">
        <div
            key={animKey}
            className={`w-20 h-20 rounded-full bg-day-accent dark:bg-night-accent transform ${animationClass}`}
        ></div>
    </div>
);


const BoxVisualizer: React.FC<{ animKey: number }> = ({ animKey }) => (
     <div key={animKey} className="w-40 h-40 flex justify-center items-center">
        <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
            <path
                d="M0 0 H120 V120 H0 Z"
                fill="none"
                stroke="rgba(129, 140, 248, 0.3)"
                strokeWidth="4"
            />
            <path
                d="M0 0 H120 V120 H0 Z"
                fill="none"
                stroke="currentColor"
                className="text-day-accent dark:text-night-accent animate-box-breathing-16s"
                strokeWidth="4"
                strokeDasharray="480"
                strokeDashoffset="480"
            />
        </svg>
    </div>
);

type CycleStep = {
    text: string;
    duration: number;
    anim: string;
    sound?: 'in' | 'out';
};

export const GuidedRelaxationModal: React.FC<{ relaxation: GuidedRelaxation, onClose: () => void }> = ({ relaxation, onClose }) => {
    const [sessionState, setSessionState] = useState<'ready' | 'starting' | 'running'>('ready');
    const [stepIndex, setStepIndex] = useState(0);
    const [instruction, setInstruction] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [animationClass, setAnimationClass] = useState('scale-[0.8] opacity-70');
    const [animationKey, setAnimationKey] = useState(0);
    const { setActiveSleepAid } = useAppContext();

    const cycle: CycleStep[] = useMemo(() => {
        if (relaxation.id === 'box_breathing') {
            return [
                { text: 'Inhale (nose)', duration: 4000, sound: 'in', anim: 'animate-box-breathing-16s' },
                { text: 'Hold', duration: 4000, anim: 'animate-box-breathing-16s' },
                { text: 'Exhale (mouth)', duration: 4000, sound: 'out', anim: 'animate-box-breathing-16s' },
                { text: 'Hold', duration: 4000, anim: 'animate-box-breathing-16s' },
            ];
        } else if (relaxation.id === '478_breathing') {
            return [
                { text: 'Inhale (nose)', duration: 4000, anim: 'animate-inhale-4s', sound: 'in' },
                { text: 'Hold', duration: 7000, anim: 'scale-[1.6] opacity-100' },
                { text: 'Exhale (mouth)', duration: 8000, anim: 'animate-exhale-8s', sound: 'out' },
            ];
        }
        return [];
    }, [relaxation.id]);
    
    // Effect for the main cycle
    useEffect(() => {
        if (sessionState !== 'running') return;

        const currentStep = cycle[stepIndex];
        if (!currentStep) return;
        
        // 1. Update UI
        setInstruction(currentStep.text);
        setCountdown(currentStep.duration / 1000);
        
        if (relaxation.id === '478_breathing') {
            setAnimationClass(currentStep.anim);
            // Only increment key (to restart animation) if it's an actual animation class
            if (currentStep.anim.startsWith('animate-')) {
                setAnimationKey(k => k + 1);
            }
        } else if (relaxation.id === 'box_breathing') {
            setAnimationClass('animate-box-breathing-16s');
             // Restart the box animation at the beginning of each cycle
            if (stepIndex === 0) {
                setAnimationKey(k => k + 1);
            }
        }

        // 2. Play Sound
        if (currentStep.sound) {
            playBreathSound(currentStep.sound, currentStep.duration / 1000);
        }

        // 3. Countdown timer for UI
        const countdownInterval = setInterval(() => {
            setCountdown(prev => (prev > 1 ? prev - 1 : 0));
        }, 1000);

        // 4. Timer to advance to next step
        const stepTimer = setTimeout(() => {
            setStepIndex(prev => (prev + 1) % cycle.length);
        }, currentStep.duration);

        return () => {
            clearInterval(countdownInterval);
            clearTimeout(stepTimer);
        };
    }, [sessionState, stepIndex, cycle, relaxation.id]);

    // Effect for the "Get Ready" state
    useEffect(() => {
        if (sessionState === 'starting') {
            setInstruction('Get ready...');
            setAnimationClass(relaxation.id === 'box_breathing' ? '' : 'scale-[0.8] opacity-70');
            const readyTimer = setTimeout(() => {
                setSessionState('running');
                setStepIndex(0); // Ensure cycle starts from the beginning
            }, 2000);
            return () => clearTimeout(readyTimer);
        }
    }, [sessionState, relaxation.id]);

    const startSession = () => {
        setSessionState('starting');
    };
    
    const endSession = () => {
        setSessionState('ready');
        setStepIndex(0);
        setCountdown(0);
        setInstruction('');
        setAnimationClass(relaxation.id === 'box_breathing' ? '' : 'scale-[0.8] opacity-70');
        onClose();
    };

    useEffect(() => {
        setActiveSleepAid('relaxation', relaxation.name);
        return () => setActiveSleepAid('relaxation', null);
    }, [relaxation.name, setActiveSleepAid]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') endSession();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    return (
        <div className="fixed inset-0 bg-day-bg-start/50 dark:bg-night-bg-start/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={endSession}>
            <div className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl p-6 w-full max-w-sm animate-fadeIn text-center" onClick={(e) => e.stopPropagation()}>
                <h2 className="font-serif text-2xl mb-4">{relaxation.name}</h2>
                
                {sessionState === 'ready' ? (
                    <div className="animate-fadeIn">
                         <p className="text-day-text-secondary dark:text-night-text-secondary my-8">{relaxation.description}</p>
                         <button onClick={startSession} className="w-full py-3 bg-day-accent dark:bg-night-accent text-white font-bold rounded-full text-lg shadow-lg">Start Session</button>
                         <button onClick={onClose} className="w-full mt-3 py-2 text-day-text-secondary dark:text-night-text-secondary">Close</button>
                    </div>
                ) : (
                    <div className="animate-fadeIn">
                        <div className="flex justify-center items-center my-8 h-40">
                            {relaxation.id === 'box_breathing' 
                                ? <BoxVisualizer animKey={animationKey} />
                                : <CircleVisualizer animationClass={animationClass} animKey={animationKey} />
                            }
                        </div>
                        <p className="text-xl font-medium h-8">
                            {instruction}
                            {sessionState === 'running' && ` (${countdown}s)`}
                        </p>
                        <button onClick={endSession} className="w-full mt-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-full">End Session</button>
                    </div>
                )}
            </div>
        </div>
    );
};