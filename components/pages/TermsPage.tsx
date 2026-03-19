import React from 'react';

interface TermsPageProps {
    onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
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

            <h1 className="font-serif text-4xl mb-6">Terms of Service</h1>

            <div className="prose dark:prose-invert max-w-none space-y-6 text-day-text-secondary dark:text-night-text-secondary">
                <p className="text-lg">
                    <strong>Last updated:</strong> March 19, 2026
                </p>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Agreement</h2>
                    <p>
                        By using Somnia, you agree to these terms. If you don't agree, please don't use the app.
                        You must be at least 13 years old to use Somnia.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">What Somnia Is</h2>
                    <p>
                        Somnia is a dream journaling and sleep wellness app. It uses AI to help you explore
                        your dreams and improve your sleep habits. The service is provided "as is."
                    </p>
                </section>

                <section className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
                    <h2 className="font-serif text-2xl text-rose-800 dark:text-rose-200 mb-3">Important Disclaimer</h2>
                    <p className="mb-3">
                        <strong>Somnia is for entertainment and self-reflection only.</strong> It is not a medical
                        device and does not provide medical, psychological, or therapeutic advice.
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Dream analyses are AI-generated interpretations, not diagnoses</li>
                        <li>For sleep disorders or mental health concerns, consult a healthcare provider</li>
                        <li>AI content may not be accurate and should not be taken as professional advice</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Your Content</h2>
                    <p>
                        Your dreams and personal content belong to you. By using AI features, you grant us
                        permission to process your dream text through our AI provider (Google Gemini) to
                        generate analyses. We recommend backing up your journal regularly using the export feature.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Acceptable Use</h2>
                    <p>You agree to:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Use Somnia in compliance with applicable laws</li>
                        <li>Not attempt to circumvent premium features or rate limits</li>
                        <li>Not use the service to harm others or for illegal purposes</li>
                    </ul>
                </section>

                <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h2 className="font-serif text-2xl text-amber-800 dark:text-amber-200 mb-3">Audio & Health Safety</h2>
                    <p className="mb-3">
                        Somnia includes soundscapes and binaural beat audio features designed for relaxation.
                        These are <strong>not medical devices</strong> and are not intended to diagnose, treat,
                        cure, or prevent any condition.
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Binaural beats require stereo headphones to produce their intended effect</li>
                        <li>Binaural beats are <strong>not recommended</strong> for individuals with epilepsy, seizure disorders, or those who use a pacemaker</li>
                        <li>Do not listen at high volumes for extended periods; keep volume at a comfortable level</li>
                        <li>Do not use sleep sounds or binaural beats while driving or operating machinery</li>
                        <li>Audio quality and experience may vary across devices; headphones are recommended</li>
                        <li>If you experience discomfort, dizziness, or any adverse reaction, stop listening immediately and consult a healthcare provider</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Subscriptions & Payments</h2>
                    <p>Premium subscriptions are billed through the Apple App Store or Google Play Store. Key points:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Payment is charged to your App Store or Google Play account at confirmation of purchase</li>
                        <li>Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current billing period</li>
                        <li>You can manage or cancel your subscription anytime in your device's subscription settings</li>
                        <li>Cancellation stops future billing but does not refund the current period</li>
                        <li>Refunds are handled by Apple or Google according to their respective refund policies</li>
                        <li>Free features are available to evaluate the service before purchase</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by law, Somnia and its creators are not liable for:
                    </p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Data loss (always back up your journal)</li>
                        <li>Decisions made based on AI-generated content</li>
                        <li>Service interruptions or errors</li>
                        <li>Any indirect, incidental, or consequential damages</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Termination</h2>
                    <p>
                        You can stop using Somnia anytime. We may suspend or terminate accounts that violate
                        these terms. Upon termination, your right to use the service ends, but you can export
                        your data first.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Changes</h2>
                    <p>
                        We may update these terms occasionally. We'll notify you of significant changes.
                        Continued use after changes means you accept the new terms.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Governing Law</h2>
                    <p>
                        These terms are governed by the laws of the State of California, USA.
                        Any disputes will be resolved in the courts of California.
                    </p>
                </section>

            </div>
        </div>
    );
};
