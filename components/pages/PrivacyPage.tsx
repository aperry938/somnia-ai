import React from 'react';

interface PrivacyPageProps {
    onBack: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
    return (
        <div className="max-w-2xl mx-auto pb-8">
            <button
                onClick={onBack}
                aria-label="Go back"
                className="text-day-accent dark:text-night-accent mb-4 min-h-[44px] flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
            </button>

            <h1 className="font-serif text-4xl mb-6">Privacy Policy</h1>

            <div className="prose dark:prose-invert max-w-none space-y-6 text-day-text-secondary dark:text-night-text-secondary">
                <p className="text-lg">
                    <strong>Last updated:</strong> March 19, 2026
                </p>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Your Data</h2>
                    <p>
                        Your dreams, alarms, and preferences are stored locally on your device by default.
                        If you create an account, your dream journal is synced to our cloud database
                        (hosted on Supabase) so you can access it across devices. Cloud-synced data
                        is protected by row-level security policies that ensure only you can access your own data.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">AI Features</h2>
                    <p>
                        When you use AI features (dream analysis, chat, image prompts, dream synthesis),
                        your dream text is sent to Google's Gemini API for processing. Your email and
                        personal identifiers are never included in these requests. Per Google's API terms,
                        this data is not used to train their models.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Third-Party Services</h2>
                    <p>Somnia uses the following third-party services:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li><strong>Google Gemini API</strong> — processes dream text for AI analysis and chat features</li>
                        <li><strong>Supabase</strong> — cloud database for account sync (only if you create an account)</li>
                        <li><strong>RevenueCat</strong> — manages subscription purchases and receipt validation</li>
                        <li><strong>Apple HealthKit / Google Health Connect</strong> — reads sleep data if you grant permission (optional)</li>
                    </ul>
                    <p className="mt-2">
                        No personal identifiers are shared with these services beyond what is required
                        for their specific function.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">What We Don't Do</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>We don't use third-party analytics, advertising, or cross-app tracking</li>
                        <li>We don't sell your data</li>
                        <li>We don't read your dreams</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Data Retention</h2>
                    <p>
                        Local data is stored on your device for as long as the app is installed.
                        Cloud-synced data is retained for as long as your account is active.
                        When you delete your account, all associated cloud data is permanently removed.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Your Control</h2>
                    <p>
                        You can export your dream journal anytime from Settings. To delete all data,
                        use the Delete Account option or clear your app data. You have the right to
                        request a copy of your data or request its deletion at any time.
                    </p>
                </section>

            </div>
        </div>
    );
};
