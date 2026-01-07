// components/shared/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-8 w-8 text-red-500 dark:text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h3 className="font-serif text-xl text-day-text-primary dark:text-night-text-primary mb-2">
                        Something went wrong
                    </h3>
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary mb-4 max-w-sm">
                        {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="px-6 py-3 min-h-[48px] bg-day-accent dark:bg-night-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Specific error boundary for AI features with contextual messaging
export const AIErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <ErrorBoundary
            fallback={
                <div className="flex flex-col items-center justify-center p-6 text-center bg-day-card-bg/50 dark:bg-night-card-bg/50 rounded-xl border border-day-border dark:border-night-border">
                    <div className="w-12 h-12 mb-3 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-amber-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                        </svg>
                    </div>
                    <p className="text-sm text-day-text-secondary dark:text-night-text-secondary">
                        The Oneironaut is temporarily unavailable.
                    </p>
                    <p className="text-xs text-day-text-secondary/70 dark:text-night-text-secondary/70 mt-1">
                        Check your API key or try again later.
                    </p>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
};

// Test Component for verifying Error Boundary
export const BuggyButton: React.FC = () => {
    const [shouldError, setShouldError] = React.useState(false);

    if (shouldError) {
        throw new Error("Simulated Crash for Stress Test!");
    }

    return (
        <button
            onClick={() => setShouldError(true)}
            className="fixed bottom-4 left-4 text-[10px] text-red-500/20 hover:text-red-500 bg-transparent hover:bg-red-500/10 p-1 rounded z-50 transition-all font-mono"
            title="Stress Test: Trigger Crash"
        >
            CRASH
        </button>
    );
};
