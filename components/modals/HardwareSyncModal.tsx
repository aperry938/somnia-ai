import React, { useEffect } from 'react';
import { useBackButton } from '../../hooks/useBackButton';

interface HardwareSyncModalProps {
    onClose: () => void;
}

export const HardwareSyncModal: React.FC<HardwareSyncModalProps> = ({ onClose }) => {
    // Hardware back button support
    useBackButton(true, onClose);

    // Handle Escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const compatibleDevices = [
        { name: 'Apple Watch', color: 'bg-gray-400', description: 'Sleep stages, heart rate' },
        { name: 'Oura Ring', color: 'bg-amber-400', description: 'Sleep quality, HRV' },
        { name: 'Fitbit', color: 'bg-pink-400', description: 'Sleep tracking, SpO2' },
        { name: 'Garmin', color: 'bg-blue-400', description: 'Body Battery, stress' },
        { name: 'Samsung Galaxy', color: 'bg-indigo-400', description: 'Sleep score, phases' },
        { name: '+ more', color: 'bg-gray-500', description: 'Expanding support' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="hardware-sync-title">
            <div className="relative w-full max-w-md bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl shadow-2xl overflow-hidden p-6" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-white rounded-full transition-colors" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                <h2 id="hardware-sync-title" className="font-serif text-2xl font-bold text-center mb-2">Sync Wearable</h2>

                {/* Coming Soon Badge */}
                <div className="flex justify-center mb-4">
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-sm font-medium rounded-full">
                        Coming Soon
                    </span>
                </div>

                {/* Description */}
                <p className="text-center text-day-text-secondary dark:text-night-text-secondary text-sm mb-6">
                    Connect your smartwatch or fitness tracker to automatically import sleep data into Somnia. Get deeper insights by combining your biometric data with your dream journal.
                </p>

                {/* Benefits */}
                <div className="bg-white/5 dark:bg-black/20 rounded-xl p-4 mb-6">
                    <h3 className="font-medium text-sm mb-3 text-center">What you'll get:</h3>
                    <ul className="space-y-2 text-sm text-day-text-secondary dark:text-night-text-secondary">
                        <li className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span>See which sleep stages produce your most vivid dreams</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span>Discover how HRV and stress affect dream themes</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span>Optimize sleep for better dream recall</span>
                        </li>
                    </ul>
                </div>

                {/* Compatible Devices */}
                <div className="mb-6">
                    <h3 className="text-xs text-gray-500 mb-3 text-center uppercase tracking-wider">Compatible Devices</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {compatibleDevices.map(device => (
                            <div key={device.name} className="flex items-center gap-2 bg-white/5 dark:bg-black/20 px-3 py-2 rounded-lg">
                                <span className={`w-2 h-2 ${device.color} rounded-full`}></span>
                                <span>{device.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center"
                >
                    Got It
                </button>
            </div>
        </div>
    );
};
