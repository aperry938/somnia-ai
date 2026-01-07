import React, { useState, Suspense, lazy } from 'react';
import { Dream } from '../../types';
import { DEMO_DREAMS } from '../../constants/demoDreams';

interface InsightsGridProps {
    dreams: Dream[];
}

interface TabPanelProps {
    dreams: Dream[];
}

// Loading fallback for lazy-loaded tab content
const TabLoading: React.FC = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
            <div
                key={i}
                className="bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border rounded-xl p-4 animate-pulse"
            >
                <div className="h-4 bg-day-border dark:bg-night-border rounded w-3/4 mb-3" />
                <div className="h-20 bg-day-border dark:bg-night-border rounded" />
            </div>
        ))}
    </div>
);

// Lazy-loaded tab content components
const QuickStatsTab = lazy(() => import('./tabs/QuickStatsTab'));
const EmotionsTab = lazy(() => import('./tabs/EmotionsTab'));
const ThemesTab = lazy(() => import('./tabs/ThemesTab'));
const PeopleTab = lazy(() => import('./tabs/PeopleTab'));
const ContentTab = lazy(() => import('./tabs/ContentTab'));
const SettingsTab = lazy(() => import('./tabs/SettingsTab'));
const TemporalTab = lazy(() => import('./tabs/TemporalTab'));

const TABS = ['Quick Stats', 'Emotions', 'Themes', 'People', 'Content', 'Settings', 'Temporal'] as const;

export const InsightsGrid: React.FC<InsightsGridProps> = ({ dreams }) => {
    const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Quick Stats');

    // Use demo data when user has < 3 dreams
    const isUsingDemo = dreams.length < 3;
    const displayDreams = isUsingDemo ? DEMO_DREAMS : dreams;

    const renderTabContent = () => {
        const props: TabPanelProps = { dreams: displayDreams };

        switch (activeTab) {
            case 'Quick Stats':
                return <QuickStatsTab {...props} />;
            case 'Emotions':
                return <EmotionsTab {...props} />;
            case 'Themes':
                return <ThemesTab {...props} />;
            case 'People':
                return <PeopleTab {...props} />;
            case 'Content':
                return <ContentTab {...props} />;
            case 'Settings':
                return <SettingsTab {...props} />;
            case 'Temporal':
                return <TemporalTab {...props} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-4">
            {/* Sample Data Banner */}
            {isUsingDemo && (
                <div className="flex items-center gap-3 px-4 py-3 bg-day-accent/10 dark:bg-night-accent/10 border border-day-accent/20 dark:border-night-accent/20 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-day-accent dark:text-night-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-day-accent dark:text-night-accent">
                        <span className="font-medium">Sample data</span>
                        <span className="opacity-80"> — Log your dreams to see your personal insights</span>
                    </p>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide" role="tablist" aria-label="Insights categories">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        role="tab"
                        aria-selected={activeTab === tab}
                        aria-controls={`panel-${tab.replace(/\s+/g, '-').toLowerCase()}`}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 min-h-[44px] rounded-full text-sm whitespace-nowrap transition-all flex items-center justify-center ${activeTab === tab
                            ? 'bg-day-accent dark:bg-night-accent text-white'
                            : 'bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div
                role="tabpanel"
                id={`panel-${activeTab.replace(/\s+/g, '-').toLowerCase()}`}
                aria-label={`${activeTab} insights`}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
                <Suspense fallback={<TabLoading />}>
                    {renderTabContent()}
                </Suspense>
            </div>
        </div>
    );
};
