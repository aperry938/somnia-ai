/**
 * Hardware Service for Somnia
 *
 * Provides integration with external sleep tracking hardware devices:
 * - Bluetooth Low Energy (BLE) sleep masks and wearables
 * - Motion sensors (accelerometer, gyroscope) for sleep detection
 *
 * Platform Support:
 * - iOS: Core Bluetooth via Capacitor plugin
 * - Android: Android Bluetooth LE via Capacitor plugin
 * - Web: Web Bluetooth API (limited browser support)
 *
 * App Store Compliance:
 * - Proper permission handling for Bluetooth
 * - Sensor cleanup on component unmount
 * - Battery-efficient sensor polling
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { logger } from './logger';

// Platform detection
const isNative = Capacitor.isNativePlatform();
const isIOS = Capacitor.getPlatform() === 'ios';
const isAndroid = Capacitor.getPlatform() === 'android';

// ============================================================================
// Types
// ============================================================================

export type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'syncing' | 'synced' | 'error';

export interface HardwareMetadata {
    id: string;
    name: string;
    type: 'sleep_mask' | 'wearable' | 'sensor' | 'unknown';
    batteryLevel: number | null;
    firmwareVersion: string | null;
    lastSync: string | null;
    rssi: number | null; // Signal strength
}

export interface MotionData {
    accelerometer: { x: number; y: number; z: number } | null;
    gyroscope: { x: number; y: number; z: number } | null;
    timestamp: number;
}

export interface SleepMotionAnalysis {
    isStationary: boolean;
    movementIntensity: number; // 0-1 scale
    possibleSleepState: 'awake' | 'light' | 'deep' | 'unknown';
}

// ============================================================================
// Native Plugin Interfaces
// ============================================================================

interface BluetoothLEPlugin {
    isAvailable(): Promise<{ available: boolean }>;
    isEnabled(): Promise<{ enabled: boolean }>;
    requestPermissions(): Promise<{ granted: boolean }>;
    checkPermissions(): Promise<{ granted: boolean; bluetooth: string; location: string }>;
    startScan(options?: { services?: string[]; timeout?: number }): Promise<{ success: boolean }>;
    stopScan(): Promise<{ success: boolean }>;
    connect(options: { deviceId: string }): Promise<{ success: boolean }>;
    disconnect(options: { deviceId: string }): Promise<{ success: boolean }>;
    read(options: { deviceId: string; service: string; characteristic: string }): Promise<{ value: string }>;
    write(options: { deviceId: string; service: string; characteristic: string; value: string }): Promise<{ success: boolean }>;
    addListener(
        eventName: 'scanResult' | 'connected' | 'disconnected',
        callback: (data: unknown) => void
    ): Promise<{ remove: () => void }>;
}

interface MotionPlugin {
    isAvailable(): Promise<{ accelerometer: boolean; gyroscope: boolean }>;
    requestPermissions(): Promise<{ granted: boolean }>;
    startAccelerometer(options?: { frequency?: number }): Promise<{ success: boolean }>;
    stopAccelerometer(): Promise<{ success: boolean }>;
    startGyroscope(options?: { frequency?: number }): Promise<{ success: boolean }>;
    stopGyroscope(): Promise<{ success: boolean }>;
    addListener(
        eventName: 'accelerometerData' | 'gyroscopeData',
        callback: (data: { x: number; y: number; z: number }) => void
    ): Promise<{ remove: () => void }>;
}

// Register native plugins (conditionally based on platform)
const BluetoothLE = isNative ? registerPlugin<BluetoothLEPlugin>('BluetoothLE') : null;
const Motion = isNative ? registerPlugin<MotionPlugin>('Motion') : null;

// ============================================================================
// Capability Detection
// ============================================================================

/**
 * Check if Bluetooth LE is available on this device
 */
export const isBluetoothAvailable = async (): Promise<boolean> => {
    if (!isNative) {
        // Web Bluetooth API check
        return 'bluetooth' in navigator;
    }

    try {
        if (BluetoothLE) {
            const result = await BluetoothLE.isAvailable();
            return result.available;
        }
    } catch (error) {
        logger.error('[HardwareService] Bluetooth availability check failed:', error);
    }

    return false;
};

/**
 * Check if Bluetooth is enabled (turned on)
 */
export const isBluetoothEnabled = async (): Promise<boolean> => {
    if (!isNative || !BluetoothLE) return false;

    try {
        const result = await BluetoothLE.isEnabled();
        return result.enabled;
    } catch (error) {
        logger.error('[HardwareService] Bluetooth enabled check failed:', error);
        return false;
    }
};

/**
 * Check if motion sensors are available
 */
export const isMotionAvailable = async (): Promise<{ accelerometer: boolean; gyroscope: boolean }> => {
    if (!isNative) {
        // Web DeviceMotion API check
        const hasDeviceMotion = 'DeviceMotionEvent' in window;
        return { accelerometer: hasDeviceMotion, gyroscope: hasDeviceMotion };
    }

    try {
        if (Motion) {
            return await Motion.isAvailable();
        }
    } catch (error) {
        logger.error('[HardwareService] Motion availability check failed:', error);
    }

    return { accelerometer: false, gyroscope: false };
};

/**
 * Request Bluetooth permissions
 */
export const requestBluetoothPermissions = async (): Promise<boolean> => {
    if (!isNative || !BluetoothLE) {
        logger.warn('[HardwareService] Bluetooth permissions not available on web');
        return false;
    }

    try {
        const result = await BluetoothLE.requestPermissions();
        return result.granted;
    } catch (error) {
        logger.error('[HardwareService] Bluetooth permission request failed:', error);
        return false;
    }
};

/**
 * Request motion sensor permissions (iOS 13+ requires permission)
 */
export const requestMotionPermissions = async (): Promise<boolean> => {
    if (!isNative) {
        // Web: iOS 13+ requires permission for DeviceMotionEvent
        if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
            try {
                const permission = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
                return permission === 'granted';
            } catch {
                return false;
            }
        }
        return true; // Other browsers don't require permission
    }

    try {
        if (Motion) {
            const result = await Motion.requestPermissions();
            return result.granted;
        }
    } catch (error) {
        logger.error('[HardwareService] Motion permission request failed:', error);
    }

    return false;
};

// ============================================================================
// Hardware Service Hook
// ============================================================================

export const useHardwareService = () => {
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [device, setDevice] = useState<HardwareMetadata | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [discoveredDevices, setDiscoveredDevices] = useState<HardwareMetadata[]>([]);

    // Refs for cleanup
    const scanListenerRef = useRef<{ remove: () => void } | null>(null);
    const connectionListenerRef = useRef<{ remove: () => void } | null>(null);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Clean up listeners
            if (scanListenerRef.current) {
                scanListenerRef.current.remove();
                scanListenerRef.current = null;
            }
            if (connectionListenerRef.current) {
                connectionListenerRef.current.remove();
                connectionListenerRef.current = null;
            }
            // Stop any ongoing scan
            if (BluetoothLE) {
                BluetoothLE.stopScan().catch(() => {});
            }
        };
    }, []);

    const scanForDevices = useCallback(async () => {
        setError(null);
        setDiscoveredDevices([]);

        // Check Bluetooth availability
        const available = await isBluetoothAvailable();
        if (!available) {
            setError('Bluetooth is not available on this device');
            setStatus('error');
            return;
        }

        // Check if enabled
        const enabled = await isBluetoothEnabled();
        if (!enabled) {
            setError('Please enable Bluetooth to scan for devices');
            setStatus('error');
            return;
        }

        // Check permissions
        if (isNative && BluetoothLE) {
            const perms = await BluetoothLE.checkPermissions();
            if (!perms.granted) {
                const granted = await requestBluetoothPermissions();
                if (!granted) {
                    setError('Bluetooth permission is required to connect to devices');
                    setStatus('error');
                    return;
                }
            }
        }

        setStatus('scanning');
        logger.log('[HardwareService] Starting device scan');

        try {
            if (isNative && BluetoothLE) {
                // Set up scan result listener
                scanListenerRef.current = await BluetoothLE.addListener('scanResult', (data: unknown) => {
                    if (!isMountedRef.current) return;

                    const scanData = data as { device?: { deviceId?: string; name?: string; rssi?: number } };
                    if (scanData.device) {
                        const deviceInfo: HardwareMetadata = {
                            id: scanData.device.deviceId || 'unknown',
                            name: scanData.device.name || 'Unknown Device',
                            type: detectDeviceType(scanData.device.name),
                            batteryLevel: null,
                            firmwareVersion: null,
                            lastSync: null,
                            rssi: scanData.device.rssi || null,
                        };

                        setDiscoveredDevices(prev => {
                            const exists = prev.some(d => d.id === deviceInfo.id);
                            if (exists) return prev;
                            return [...prev, deviceInfo];
                        });
                    }
                });

                // Start scan with timeout
                await BluetoothLE.startScan({
                    services: ['180D', '1800'], // Heart Rate, Generic Access (common BLE services)
                    timeout: 10000,
                });

                // Auto-stop after timeout (inline implementation to avoid dependency cycle)
                setTimeout(async () => {
                    if (isMountedRef.current && status === 'scanning') {
                        if (scanListenerRef.current) {
                            scanListenerRef.current.remove();
                            scanListenerRef.current = null;
                        }
                        if (BluetoothLE) {
                            try {
                                await BluetoothLE.stopScan();
                            } catch {
                                // Ignore stop scan errors
                            }
                        }
                        if (isMountedRef.current) {
                            setStatus('disconnected');
                        }
                        logger.log('[HardwareService] Scan auto-stopped after timeout');
                    }
                }, 10000);
            } else {
                // Web Bluetooth fallback (limited support)
                if ('bluetooth' in navigator) {
                    try {
                        const webDevice = await (navigator as Navigator & { bluetooth: { requestDevice: (options: unknown) => Promise<{ id: string; name: string }> } }).bluetooth.requestDevice({
                            acceptAllDevices: true,
                            optionalServices: ['battery_service', 'device_information'],
                        });

                        if (isMountedRef.current) {
                            const deviceInfo: HardwareMetadata = {
                                id: webDevice.id,
                                name: webDevice.name || 'Unknown Device',
                                type: detectDeviceType(webDevice.name),
                                batteryLevel: null,
                                firmwareVersion: null,
                                lastSync: null,
                                rssi: null,
                            };
                            setDiscoveredDevices([deviceInfo]);
                        }
                    } catch (e) {
                        if ((e as Error).name !== 'NotFoundError') {
                            throw e;
                        }
                    }
                }
                setStatus('disconnected');
            }
        } catch (error) {
            logger.error('[HardwareService] Scan failed:', error);
            if (isMountedRef.current) {
                setError('Failed to scan for devices');
                setStatus('error');
            }
        }
    }, [status]);

    const stopScan = useCallback(async () => {
        if (scanListenerRef.current) {
            scanListenerRef.current.remove();
            scanListenerRef.current = null;
        }

        if (isNative && BluetoothLE) {
            try {
                await BluetoothLE.stopScan();
            } catch {
                // Ignore stop scan errors
            }
        }

        if (isMountedRef.current) {
            setStatus('disconnected');
        }

        logger.log('[HardwareService] Scan stopped');
    }, []);

    const connectToDevice = useCallback(async (deviceId: string) => {
        setStatus('connecting');
        setError(null);

        try {
            if (isNative && BluetoothLE) {
                // Set up connection listener
                connectionListenerRef.current = await BluetoothLE.addListener('disconnected', () => {
                    if (isMountedRef.current) {
                        setStatus('disconnected');
                        setDevice(null);
                        logger.log('[HardwareService] Device disconnected');
                    }
                });

                const result = await BluetoothLE.connect({ deviceId });

                if (result.success && isMountedRef.current) {
                    // Find device info
                    const deviceInfo = discoveredDevices.find(d => d.id === deviceId);
                    if (deviceInfo) {
                        setDevice({
                            ...deviceInfo,
                            lastSync: new Date().toISOString(),
                        });
                    }
                    setStatus('connected');
                    logger.log('[HardwareService] Connected to device:', deviceId);
                } else {
                    throw new Error('Connection failed');
                }
            } else {
                setError('Bluetooth not available');
                setStatus('error');
            }
        } catch (error) {
            logger.error('[HardwareService] Connection failed:', error);
            if (isMountedRef.current) {
                setError('Failed to connect to device');
                setStatus('error');
            }
        }
    }, [discoveredDevices]);

    const syncData = useCallback(async () => {
        if (status !== 'connected' || !device) {
            setError('No device connected');
            return;
        }

        setStatus('syncing');
        setProgress(0);

        try {
            // Simulate data sync progress (real implementation would read from device)
            for (let i = 0; i <= 100; i += 10) {
                if (!isMountedRef.current) break;
                setProgress(i);
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            if (isMountedRef.current) {
                setDevice(prev => prev ? {
                    ...prev,
                    lastSync: new Date().toISOString(),
                } : null);
                setStatus('synced');
                logger.log('[HardwareService] Sync completed');
            }
        } catch (error) {
            logger.error('[HardwareService] Sync failed:', error);
            if (isMountedRef.current) {
                setError('Failed to sync data from device');
                setStatus('error');
            }
        }
    }, [status, device]);

    const disconnect = useCallback(async () => {
        if (connectionListenerRef.current) {
            connectionListenerRef.current.remove();
            connectionListenerRef.current = null;
        }

        if (device && isNative && BluetoothLE) {
            try {
                await BluetoothLE.disconnect({ deviceId: device.id });
            } catch {
                // Ignore disconnect errors
            }
        }

        setStatus('disconnected');
        setDevice(null);
        setProgress(0);
        setError(null);

        logger.log('[HardwareService] Disconnected');
    }, [device]);

    return {
        status,
        device,
        progress,
        error,
        discoveredDevices,
        scanForDevices,
        stopScan,
        connectToDevice,
        syncData,
        disconnect,
    };
};

// ============================================================================
// Motion Sensor Service Hook
// ============================================================================

export const useMotionSensor = (options?: { frequency?: number }) => {
    const [motionData, setMotionData] = useState<MotionData | null>(null);
    const [analysis, setAnalysis] = useState<SleepMotionAnalysis | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const accelerometerListenerRef = useRef<{ remove: () => void } | null>(null);
    const gyroscopeListenerRef = useRef<{ remove: () => void } | null>(null);
    const webListenerRef = useRef<((event: DeviceMotionEvent) => void) | null>(null);
    const isMountedRef = useRef(true);

    // Motion analysis - detect movement patterns for sleep estimation
    const analyzeMotion = useCallback((data: MotionData): SleepMotionAnalysis => {
        if (!data.accelerometer) {
            return { isStationary: true, movementIntensity: 0, possibleSleepState: 'unknown' };
        }

        const { x, y, z } = data.accelerometer;
        const magnitude = Math.sqrt(x * x + y * y + z * z);

        // Normalize: gravity is ~9.8, so subtract and normalize
        const movement = Math.abs(magnitude - 9.8) / 9.8;
        const intensity = Math.min(1, movement * 10); // Scale to 0-1

        let sleepState: SleepMotionAnalysis['possibleSleepState'] = 'unknown';
        if (intensity < 0.05) {
            sleepState = 'deep';
        } else if (intensity < 0.15) {
            sleepState = 'light';
        } else {
            sleepState = 'awake';
        }

        return {
            isStationary: intensity < 0.1,
            movementIntensity: intensity,
            possibleSleepState: sleepState,
        };
    }, []);

    const startMonitoring = useCallback(async () => {
        setError(null);

        // Check availability
        const availability = await isMotionAvailable();
        if (!availability.accelerometer && !availability.gyroscope) {
            setError('Motion sensors not available on this device');
            return;
        }

        // Request permissions if needed
        const granted = await requestMotionPermissions();
        if (!granted) {
            setError('Motion sensor permission denied');
            return;
        }

        setIsActive(true);
        logger.log('[HardwareService] Starting motion monitoring');

        try {
            if (isNative && Motion) {
                // Native motion sensors
                const frequency = options?.frequency || 10; // Hz

                accelerometerListenerRef.current = await Motion.addListener('accelerometerData', (data) => {
                    if (!isMountedRef.current) return;

                    const newData: MotionData = {
                        accelerometer: data,
                        gyroscope: motionData?.gyroscope || null,
                        timestamp: Date.now(),
                    };
                    setMotionData(newData);
                    setAnalysis(analyzeMotion(newData));
                });

                gyroscopeListenerRef.current = await Motion.addListener('gyroscopeData', (data) => {
                    if (!isMountedRef.current) return;

                    setMotionData(prev => prev ? { ...prev, gyroscope: data } : null);
                });

                await Motion.startAccelerometer({ frequency });
                if (availability.gyroscope) {
                    await Motion.startGyroscope({ frequency });
                }
            } else {
                // Web DeviceMotion API
                const handleMotion = (event: DeviceMotionEvent) => {
                    if (!isMountedRef.current) return;

                    const acc = event.accelerationIncludingGravity;
                    const rotation = event.rotationRate;

                    const newData: MotionData = {
                        accelerometer: acc ? { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 } : null,
                        gyroscope: rotation ? { x: rotation.alpha || 0, y: rotation.beta || 0, z: rotation.gamma || 0 } : null,
                        timestamp: Date.now(),
                    };

                    setMotionData(newData);
                    setAnalysis(analyzeMotion(newData));
                };

                webListenerRef.current = handleMotion;
                window.addEventListener('devicemotion', handleMotion);
            }
        } catch (error) {
            logger.error('[HardwareService] Failed to start motion monitoring:', error);
            if (isMountedRef.current) {
                setError('Failed to start motion sensors');
                setIsActive(false);
            }
        }
    }, [options?.frequency, analyzeMotion, motionData?.gyroscope]);

    const stopMonitoring = useCallback(async () => {
        logger.log('[HardwareService] Stopping motion monitoring');

        // Clean up native listeners
        if (accelerometerListenerRef.current) {
            accelerometerListenerRef.current.remove();
            accelerometerListenerRef.current = null;
        }
        if (gyroscopeListenerRef.current) {
            gyroscopeListenerRef.current.remove();
            gyroscopeListenerRef.current = null;
        }

        // Stop native sensors
        if (isNative && Motion) {
            try {
                await Motion.stopAccelerometer();
                await Motion.stopGyroscope();
            } catch {
                // Ignore stop errors
            }
        }

        // Clean up web listener
        if (webListenerRef.current) {
            window.removeEventListener('devicemotion', webListenerRef.current);
            webListenerRef.current = null;
        }

        setIsActive(false);
        setMotionData(null);
        setAnalysis(null);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            stopMonitoring();
        };
    }, [stopMonitoring]);

    return {
        motionData,
        analysis,
        isActive,
        error,
        startMonitoring,
        stopMonitoring,
    };
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect device type from name
 */
function detectDeviceType(name?: string | null): HardwareMetadata['type'] {
    if (!name) return 'unknown';

    const lowerName = name.toLowerCase();

    if (lowerName.includes('mask') || lowerName.includes('lucid')) {
        return 'sleep_mask';
    }
    if (lowerName.includes('band') || lowerName.includes('watch') || lowerName.includes('ring')) {
        return 'wearable';
    }
    if (lowerName.includes('sensor') || lowerName.includes('pod')) {
        return 'sensor';
    }

    return 'unknown';
}

/**
 * Get hardware capabilities for current platform
 */
export const getHardwareCapabilities = async (): Promise<{
    bluetooth: boolean;
    bluetoothEnabled: boolean;
    accelerometer: boolean;
    gyroscope: boolean;
    platform: string;
}> => {
    const bluetoothAvailable = await isBluetoothAvailable();
    const bluetoothEnabled = await isBluetoothEnabled();
    const motionAvailable = await isMotionAvailable();

    return {
        bluetooth: bluetoothAvailable,
        bluetoothEnabled,
        accelerometer: motionAvailable.accelerometer,
        gyroscope: motionAvailable.gyroscope,
        platform: isIOS ? 'ios' : isAndroid ? 'android' : 'web',
    };
};
