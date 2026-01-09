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
                    <strong>Last updated:</strong> January 9, 2026
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

                <section className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
                    <h2 className="font-serif text-2xl text-rose-800 dark:text-rose-200 mb-3">Wellness Disclaimer</h2>
                    <p className="font-semibold text-rose-900 dark:text-rose-100 mb-3">
                        SOMNIA IS A WELLNESS APPLICATION, NOT A MEDICAL DEVICE.
                    </p>
                    <p>
                        Somnia is designed for entertainment, self-reflection, and general wellness purposes only.
                        It does not diagnose, treat, cure, or prevent any disease, disorder, or medical condition.
                    </p>
                    <ul className="list-disc pl-6 mt-3 space-y-2">
                        <li><strong>Not medical advice:</strong> Dream analyses and sleep insights are not medical or psychological diagnoses</li>
                        <li><strong>Not therapy:</strong> AI conversations are for reflection only and do not constitute therapy or counseling</li>
                        <li><strong>Consult professionals:</strong> For sleep disorders, mental health concerns, or medical issues, consult a qualified healthcare provider</li>
                        <li><strong>No clinical claims:</strong> Somnia makes no claims about improving clinical outcomes or treating conditions</li>
                    </ul>
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
                        <li>Back up your dream journal regularly using the export feature</li>
                        <li>Use the application in compliance with all applicable laws</li>
                        <li>Not attempt to abuse or circumvent premium feature restrictions</li>
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
                        <li>Temporary service interruptions</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Intellectual Property</h2>
                    <p>
                        The Somnia application, including its code, design, and branding, is the intellectual
                        property of its creator. Dreams and personal content you create remain your property.
                    </p>
                </section>

                <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h2 className="font-serif text-2xl text-amber-800 dark:text-amber-200 mb-3">⚠️ Refund Policy</h2>
                    <p className="font-semibold text-amber-900 dark:text-amber-100 mb-3">
                        ALL SALES ARE FINAL. NO REFUNDS WILL BE ISSUED.
                    </p>
                    <p>
                        By purchasing a Somnia subscription, you acknowledge and agree that:
                    </p>
                    <ul className="list-disc pl-6 mt-3 space-y-2">
                        <li><strong>No refunds</strong> will be provided under any circumstances, including but not limited to dissatisfaction with the service, failure to use the service, or change of mind</li>
                        <li>You have access to free features before purchase to evaluate the service</li>
                        <li>Subscriptions auto-renew unless cancelled before the renewal date</li>
                        <li>Cancellation stops future billing but does not entitle you to a refund for the current period</li>
                        <li>This policy complies with digital goods exemptions under consumer protection laws</li>
                    </ul>
                    <p className="mt-3 text-sm">
                        By completing your purchase, you expressly consent to immediate access to digital content and waive any right to a cooling-off period refund.
                    </p>
                </section>

                <section className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                    <h2 className="font-serif text-2xl text-indigo-800 dark:text-indigo-200 mb-3">📊 Usage Rate Limits</h2>
                    <p className="mb-3">
                        To ensure fair usage and maintain service quality, Somnia enforces the following rate limits:
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-indigo-200 dark:border-indigo-700">
                                    <th className="text-left py-2 font-semibold">Feature</th>
                                    <th className="text-left py-2 font-semibold">Limit</th>
                                    <th className="text-left py-2 font-semibold">Reset</th>
                                </tr>
                            </thead>
                            <tbody className="text-indigo-700 dark:text-indigo-300">
                                <tr className="border-b border-indigo-100 dark:border-indigo-800">
                                    <td className="py-2">Dream Analysis</td>
                                    <td className="py-2">5 per day</td>
                                    <td className="py-2">Midnight local time</td>
                                </tr>
                                <tr className="border-b border-indigo-100 dark:border-indigo-800">
                                    <td className="py-2">Dream Chat Messages</td>
                                    <td className="py-2">50 per day</td>
                                    <td className="py-2">Midnight local time</td>
                                </tr>
                                <tr className="border-b border-indigo-100 dark:border-indigo-800">
                                    <td className="py-2">Image Prompt Generation</td>
                                    <td className="py-2">5 per day</td>
                                    <td className="py-2">Midnight local time</td>
                                </tr>
                                <tr className="border-b border-indigo-100 dark:border-indigo-800">
                                    <td className="py-2">Dream Weaving (Theme Synthesis)</td>
                                    <td className="py-2">1 per week</td>
                                    <td className="py-2">7 days from last use</td>
                                </tr>
                                <tr>
                                    <td className="py-2">Sleep Analytics</td>
                                    <td className="py-2">1 per week</td>
                                    <td className="py-2">7 days from last use</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-sm">
                        These limits are subject to change. Exceeding limits will result in temporary feature restrictions until the reset period. Attempting to circumvent limits may result in account suspension.
                    </p>
                </section>

                <section>
                    <h2 className="font-serif text-2xl text-day-text-primary dark:text-night-text-primary mb-3">Changes to Terms</h2>
                    <p>
                        We may update these terms from time to time. Continued use of the application after
                        changes constitutes acceptance of the new terms.
                    </p>
                </section>


            </div>
        </div>
    );
};
