import React from 'react';

interface TermsPageProps {
    onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
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

            <h1 className="font-serif text-4xl mb-8">Terms of Service</h1>

            <div className="prose dark:prose-invert max-w-none space-y-6 text-day-text-secondary dark:text-night-text-secondary">
                <p className="text-lg">
                    <strong>Last updated:</strong> January 7, 2026
                </p>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Acceptance of Terms</h2>
                    <p>
                        By accessing and using Somnia, you agree to be bound by these Terms of Service.
                        If you do not agree to these terms, please do not use the application.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Description of Service</h2>
                    <p>
                        Somnia is a dream journaling and sleep wellness application. It provides tools for
                        recording dreams, AI-powered dream analysis, sleep soundscapes, and personal insights.
                        The service is provided "as is" without warranties of any kind.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">AI-Generated Content Disclaimer</h2>
                    <p>
                        <strong>Important:</strong> Dream analyses, sleep coaching advice, and generated images are
                        produced by artificial intelligence. This content is for entertainment and self-reflection
                        purposes only. It is <strong>not</strong> medical, psychological, or therapeutic advice.
                    </p>
                    <ul className="list-disc pl-6 mt-3 space-y-2">
                        <li>Do not use AI analyses as a substitute for professional mental health care</li>
                        <li>If you experience distressing dreams or sleep issues, consult a healthcare provider</li>
                        <li>AI interpretations may not be accurate and should not be taken literally</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">User Responsibilities</h2>
                    <p>You agree to:</p>
                    <ul className="list-disc pl-6 mt-3 space-y-2">
                        <li>Provide your own Google Gemini API key for AI features</li>
                        <li>Keep your API key secure and not share it publicly</li>
                        <li>Back up your dream journal regularly using the export feature</li>
                        <li>Use the application in compliance with all applicable laws</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Limitation of Liability</h2>
                    <p>
                        Somnia and its creators shall not be liable for any damages arising from:
                    </p>
                    <ul className="list-disc pl-6 mt-3 space-y-2">
                        <li>Loss of data due to browser clearing or device issues</li>
                        <li>Reliance on AI-generated interpretations or advice</li>
                        <li>Service interruptions or errors</li>
                        <li>Third-party API costs or failures</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Intellectual Property</h2>
                    <p>
                        The Somnia application, including its code, design, and branding, is the intellectual
                        property of its creator. Dreams and personal content you create remain your property.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Changes to Terms</h2>
                    <p>
                        We may update these terms from time to time. Continued use of the application after
                        changes constitutes acceptance of the new terms.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Contact</h2>
                    <p>
                        For questions about these terms, contact us at:
                        <a href="mailto:legal@somnia.ai" className="text-day-accent dark:text-night-accent hover:underline ml-1">
                            legal@somnia.ai
                        </a>
                    </p>
                </section>
            </div>
        </div>
    );
};
