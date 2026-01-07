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
                    <strong>Last updated:</strong> January 7, 2026
                </p>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Our Commitment to Privacy</h2>
                    <p>
                        Somnia is designed with privacy as a core principle. Your dreams are deeply personal,
                        and we believe they should remain that way. This policy explains how we handle your data.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Data Storage</h2>
                    <p>
                        <strong>All your data stays on your device.</strong> Somnia uses your browser's LocalStorage
                        to save your dreams, alarms, preferences, and biometric data. We do not operate servers that
                        store your personal information. This means:
                    </p>
                    <ul className="list-disc pl-6 mt-3 space-y-2">
                        <li>Your dream journal is never uploaded to our servers</li>
                        <li>We cannot read, access, or sell your dreams</li>
                        <li>Clearing your browser data will delete your dreams</li>
                        <li>Your data does not sync across devices</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">AI Processing</h2>
                    <p>
                        When you use AI features (dream analysis, image generation, sleep coaching), your dream text
                        is sent to Google's Gemini API for processing. This requires you to provide your own API key.
                        We do not see or store these API calls.
                    </p>
                    <p className="mt-3">
                        Google's data handling is governed by their
                        <a href="https://ai.google.dev/terms" className="text-day-accent dark:text-night-accent hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                            Gemini API Terms of Service
                        </a>.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Analytics & Tracking</h2>
                    <p>
                        <strong>We do not use analytics.</strong> There are no cookies, no tracking pixels, no behavioral
                        monitoring. Your usage of Somnia is completely private.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Data Export</h2>
                    <p>
                        You can export your entire dream journal at any time using the Export feature in the Chronicle.
                        This creates a JSON file that you fully control. We also offer encrypted exports for additional security.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Contact</h2>
                    <p>
                        If you have questions about this privacy policy, please contact us at:
                        <a href="mailto:privacy@somnia.ai" className="text-day-accent dark:text-night-accent hover:underline ml-1">
                            privacy@somnia.ai
                        </a>
                    </p>
                </section>
            </div>
        </div>
    );
};
