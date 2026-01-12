import React from 'react';

interface PrivacyPageProps {
    onBack: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
    return (
        <div className="max-w-2xl mx-auto">
            <button
                onClick={onBack}
                aria-label="Go back"
                className="text-day-accent dark:text-night-accent mb-6 min-h-[44px] flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
            </button>

            <h1 className="font-serif text-4xl mb-8">Privacy Policy</h1>

            <div className="prose dark:prose-invert max-w-none space-y-6 text-day-text-secondary dark:text-night-text-secondary">
                <p className="text-lg">
                    <strong>Last updated:</strong> January 9, 2026
                </p>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Your Data</h2>
                    <p>
                        Your dreams, alarms, and preferences are stored on your device.
                        If you create an account, you can optionally sync this data to access it on other devices.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">AI Features</h2>
                    <p>
                        When you use AI features (dream analysis, chat, image prompts), your dream text is
                        sent to Google's Gemini API for processing. Your email and personal identifiers are
                        never included. Per Google's API terms, this data is not used to train their models.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">What We Don't Do</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>We don't use analytics or tracking</li>
                        <li>We don't sell your data</li>
                        <li>We don't read your dreams</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Your Control</h2>
                    <p>
                        You can export your dream journal anytime from Settings. To delete all data,
                        use the Delete Account option or clear your app data.
                    </p>
                </section>

            </div>
        </div>
    );
};
