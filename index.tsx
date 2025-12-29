import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ToastProvider } from './components/shared/Toast';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <ErrorBoundary>
            <AppProvider>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </AppProvider>
        </ErrorBoundary>
    </React.StrictMode>
);
