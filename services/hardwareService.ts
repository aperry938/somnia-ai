
import { useState, useCallback } from 'react';

export type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'syncing' | 'synced';

export interface HardwareMetadata {
    name: string;
    batteryLevel: number;
    lastSync: string | null;
}

export const useHardwareService = () => {
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [device, setDevice] = useState<HardwareMetadata | null>(null);
    const [progress, setProgress] = useState(0);

    const scanForDevices = useCallback(async () => {
        setStatus('scanning');
        // Simulate scan delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simulate device found
        setStatus('connecting');
        await new Promise(resolve => setTimeout(resolve, 1500));

        setDevice({
            name: "Somnia LucidMask v2",
            batteryLevel: 85,
            lastSync: new Date().toISOString()
        });
        setStatus('connected');
    }, []);

    const syncData = useCallback(async () => {
        if (status !== 'connected') return;

        setStatus('syncing');
        setProgress(0);

        // Simulate sync progress
        for (let i = 0; i <= 100; i += 20) {
            setProgress(i);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        setStatus('synced');
        // Auto-disconnect or stay connected? Stay connected for now.
    }, [status]);

    const disconnect = useCallback(() => {
        setStatus('disconnected');
        setDevice(null);
    }, []);

    return {
        status,
        device,
        progress,
        scanForDevices,
        syncData,
        disconnect
    };
};
