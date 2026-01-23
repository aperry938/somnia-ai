
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        css: false,
        server: {
            deps: {
                // Mock native-only Capacitor plugins that aren't available in test environment
                inline: [
                    'capacitor-native-biometric',
                    'capacitor-secure-storage-plugin',
                ],
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
            // Mock native-only plugins for test environment
            'capacitor-native-biometric': path.resolve(__dirname, 'src/test/__mocks__/capacitor-native-biometric.ts'),
            'capacitor-secure-storage-plugin': path.resolve(__dirname, 'src/test/__mocks__/capacitor-secure-storage-plugin.ts'),
        },
    },
});
