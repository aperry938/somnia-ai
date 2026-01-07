import React, { useState, useEffect } from 'react';
import { requestHealthAuthorization, syncBiometrics } from '../../services/healthService';
import { useAppContext } from '../../contexts/AppContext';
import { useHardwareService } from '../../services/hardwareService';

interface HardwareSyncModalProps {
    onClose: () => void;
}

export const HardwareSyncModal: React.FC<HardwareSyncModalProps> = ({ onClose }) => {
    const { setBiometrics, biometrics } = useAppContext();
    const { status, device, progress, scanForDevices, syncData, disconnect } = useHardwareService();

    // Handle Escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Auto-scan on open
    useEffect(() => {
        scanForDevices();
        return disconnect;
    }, [scanForDevices, disconnect]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="hardware-sync-title">
            <div className="relative w-full max-w-md bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-2xl shadow-2xl overflow-hidden p-6" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white" aria-label="Close hardware sync modal">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <h2 id="hardware-sync-title" className="font-serif text-2xl font-bold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    Device Sync
                </h2>

                <div className="space-y-6 text-center">
                    {status === 'scanning' && (
                        <div className="py-6">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p className="text-gray-400 animate-pulse mb-6">Scanning for devices...</p>
                            <div className="text-left">
                                <p className="text-xs text-gray-500 mb-3 text-center">Compatible with popular wearables:</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2 bg-white/5 dark:bg-black/20 px-3 py-2 rounded-lg">
                                        <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                                        <span>Oura Ring</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 dark:bg-black/20 px-3 py-2 rounded-lg">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                        <span>Apple Watch</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 dark:bg-black/20 px-3 py-2 rounded-lg">
                                        <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                                        <span>Whoop</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 dark:bg-black/20 px-3 py-2 rounded-lg">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                        <span>Garmin</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 dark:bg-black/20 px-3 py-2 rounded-lg">
                                        <span className="w-2 h-2 bg-pink-400 rounded-full"></span>
                                        <span>Fitbit</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 dark:bg-black/20 px-3 py-2 rounded-lg">
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                                        <span>Samsung Galaxy</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'connecting' && (
                        <div className="py-8">
                            <div className="animate-bounce h-4 w-4 bg-blue-500 rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-400">Connecting to device...</p>
                        </div>
                    )}

                    {(status === 'connected' || status === 'syncing' || status === 'synced') && device && (
                        <div className="bg-white/5 dark:bg-black/20 p-4 rounded-xl border border-white/10 text-left">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-lg">{device.name}</span>
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Connected</span>
                            </div>
                            <div className="text-sm text-gray-400 flex justify-between">
                                <span>Battery</span>
                                <span>{device.batteryLevel}%</span>
                            </div>
                            <div className="text-sm text-gray-400 flex justify-between mt-1">
                                <span>Last Sync</span>
                                <span>{new Date(device.lastSync || '').toLocaleTimeString()}</span>
                            </div>
                        </div>
                    )}

                    {status === 'connected' && (
                        <button onClick={syncData} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">
                            Sync Data
                        </button>
                    )}

                    {status === 'syncing' && (
                        <div className="py-2">
                            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-sm text-gray-400">Transferring sleep stages...</p>
                        </div>
                    )}

                    {status === 'synced' && (
                        <div className="py-4">
                            <p className="text-green-400 mb-4 flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Sync Complete
                            </p>
                            <button onClick={onClose} className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-xl">Close</button>
                        </div>
                    )}

                    {status === 'disconnected' && (
                        <div className="py-8">
                            <p className="text-red-400">Device disconnected.</p>
                            <button onClick={scanForDevices} className="mt-4 px-4 py-2 bg-blue-600 rounded-lg">Retry</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
