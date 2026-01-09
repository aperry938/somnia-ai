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
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">How Somnia Works</h2>
                    <p>
                        Somnia uses advanced AI to provide deep psychological analysis of your dreams, powered by
                        768-dimensional vector embeddings and multiple AI personas trained in Jungian psychology,
                        neuroscience, and symbolic interpretation.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Data Storage</h2>
                    <p>
                        Your dream journal, alarms, and preferences are stored in your browser's LocalStorage.
                        This data remains on your device unless you choose to sync with a Somnia account.
                    </p>
                    <ul className="list-disc pl-6 mt-3 space-y-2">
                        <li>Dream text and metadata are stored locally</li>
                        <li>Clearing your browser data will delete local dreams</li>
                        <li>Account sync (optional) enables cross-device access</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">AI Processing</h2>
                    <p>
                        <strong>When you use AI features</strong> (dream analysis, image generation, chat, sleep coaching),
                        your dream text is processed by Google's Gemini AI to generate insights. This is essential
                        to how Somnia works—our AI personas analyze symbolic patterns, archetypal themes, and
                        emotional undertones to provide meaningful interpretation.
                    </p>
                    <p className="mt-3">
                        <strong>What is sent:</strong> Dream text, optional context (sleep quality, mood), and analysis preferences.
                    </p>
                    <p className="mt-3">
                        <strong>What is not sent:</strong> Your email, personal identifiers, or data from other dreams.
                    </p>
                    <p className="mt-3">
                        Google's data handling is governed by their
                        <a href="https://ai.google.dev/gemini-api/terms" className="text-day-accent dark:text-night-accent hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                            Gemini API Terms of Service
                        </a>.
                        Per Google's API terms, prompts sent via the API are not used to train their models.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Vector Embeddings</h2>
                    <p>
                        Somnia creates semantic embeddings of your dreams to detect patterns over time—like when
                        you dream about similar themes months apart ("Dream Déjà Vu"). These embeddings are
                        numerical representations, not readable text, and are stored with your dream data.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Analytics & Tracking</h2>
                    <p>
                        <strong>We do not use behavioral analytics.</strong> There are no tracking pixels or
                        third-party analytics services monitoring your app usage.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Data Export & Deletion</h2>
                    <p>
                        You can export your entire dream journal at any time using the Export feature in the Chronicle.
                        This creates a file you fully control. You can also delete all data by clearing your browser
                        storage or using the account deletion option if signed in.
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
