import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ToastProvider } from './components/shared/Toast';
import { I18nProvider } from './contexts/I18nContext';
import { initGlobalErrorHandlers } from './services/errorService';

// Initialize global error handlers early
initGlobalErrorHandlers();

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <ErrorBoundary>
            <I18nProvider>
                <AuthProvider>
                    <AppProvider>
                        <ToastProvider>
                            <App />
                        </ToastProvider>
                    </AppProvider>
                </AuthProvider>
            </I18nProvider>
        </ErrorBoundary>
    </React.StrictMode>
);
