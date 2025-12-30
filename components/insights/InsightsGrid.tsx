import React, { useState } from 'react';
import { Dream } from '../../types';

// Emotion insights
import { FearDreams } from './FearDreams';
import { SuccessDreams } from './SuccessDreams';
import { RomanticDreams } from './RomanticDreams';
import { PeacefulDreams } from './PeacefulDreams';
import { ConflictDreams } from './ConflictDreams';
import { AnxietyDreams } from './AnxietyDreams';
import { HopeDreams } from './HopeDreams';
import { SadnessDreams } from './SadnessDreams';
import { JoyDreams } from './JoyDreams';
import { AngerDreams } from './AngerDreams';
import { ConfusionDreams } from './ConfusionDreams';
import { MoodTracker } from './MoodTracker';

// Theme insights
import { AdventureDreams } from './AdventureDreams';
import { MysteryDreams } from './MysteryDreams';
import { NatureDreams } from './NatureDreams';
import { TechnologyDreams } from './TechnologyDreams';
import { WorkDreams } from './WorkDreams';
import { SchoolDreams } from './SchoolDreams';
import { PowerDreams } from './PowerDreams';
import { TransformationDreams } from './TransformationDreams';
import { SpiritualDreams } from './SpiritualDreams';
import { CreativityDreams } from './CreativityDreams';
import { MoneyDreams } from './MoneyDreams';
import { HealthDreams } from './HealthDreams';
import { ChildhoodDreams } from './ChildhoodDreams';
import { DeathDreams } from './DeathDreams';
import { TimeTravelDreams } from './TimeTravelDreams';

// People insights
import { FamilyDreams } from './FamilyDreams';
import { FriendDreams } from './FriendDreams';
import { StrangerDreams } from './StrangerDreams';
import { CelebrityDreams } from './CelebrityDreams';
import { SocialDreams } from './SocialDreams';

// Content insights
import { AnimalDreams } from './AnimalDreams';
import { VehicleDreams } from './VehicleDreams';
import { FoodDreams } from './FoodDreams';
import { MusicDreams } from './MusicDreams';
import { DreamColorAnalysis } from './DreamColorAnalysis';

// Linguistic insights
import { SentenceComplexity } from './SentenceComplexity';
import { QuestionCount } from './QuestionCount';
import { DialogueCount } from './DialogueCount';
import { FirstPersonCount } from './FirstPersonCount';
import { PastVsPresentTense } from './PastVsPresentTense';
import { NegationCount } from './NegationCount';
import { ExclamationIntensity } from './ExclamationIntensity';
import { UniqueWords } from './UniqueWords';
import { TitleAnalysis } from './TitleAnalysis';

// Setting insights
import { IndoorVsOutdoor } from './IndoorVsOutdoor';
import { PeopleVsPlaces } from './PeopleVsPlaces';
import { ControlVsChaos } from './ControlVsChaos';
import { DayVsNightDreams } from './DayVsNightDreams';

// Temporal insights
import { MoonPhaseInsight } from './MoonPhaseInsight';
import { SeasonalPattern } from './SeasonalPattern';
import { DayOfWeekAnalysis } from './DayOfWeekAnalysis';
import { WeekdayVsWeekend } from './WeekdayVsWeekend';
import { JournalingGaps } from './JournalingGaps';
import { DreamLengthTrend } from './DreamLengthTrend';

// Stats insights
import { AvgSleepQuality } from './AvgSleepQuality';
import { AchievementsUnlocked } from './AchievementsUnlocked';
import { AIDependency } from './AIDependency';
import { DreamGrowth } from './DreamGrowth';
import { RecentDreamSummary } from './RecentDreamSummary';
import { TopTags } from './TopTags';
import { SleepQualityVsDreams } from './SleepQualityVsDreams';
import { LongestShortestDream } from './LongestShortestDream';
import { FirstDreamLastDream } from './FirstDreamLastDream';
import { PositiveNegativeRatio } from './PositiveNegativeRatio';
import { DreamConsistency } from './DreamConsistency';
import { AverageRecallTime } from './AverageRecallTime';

interface InsightsGridProps {
    dreams: Dream[];
}

const TABS = ['Quick Stats', 'Emotions', 'Themes', 'People', 'Content', 'Linguistics', 'Settings', 'Temporal'] as const;

export const InsightsGrid: React.FC<InsightsGridProps> = ({ dreams }) => {
    const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Quick Stats');

    if (dreams.length < 3) {
        return (
            <div className="text-center py-8 text-day-text-secondary dark:text-night-text-secondary">
                Log at least 3 dreams to unlock insights
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${activeTab === tab
                            ? 'bg-day-accent dark:bg-night-accent text-white'
                            : 'bg-day-card-bg dark:bg-night-card-bg border border-day-border dark:border-night-border'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTab === 'Quick Stats' && (
                    <>
                        <RecentDreamSummary dreams={dreams} />
                        <AvgSleepQuality dreams={dreams} />
                        <DreamGrowth dreams={dreams} />
                        <AchievementsUnlocked dreams={dreams} />
                        <TopTags dreams={dreams} />
                        <DreamConsistency dreams={dreams} />
                        <AIDependency dreams={dreams} />
                        <LongestShortestDream dreams={dreams} />
                        <FirstDreamLastDream dreams={dreams} />
                        <SleepQualityVsDreams dreams={dreams} />
                        <PositiveNegativeRatio dreams={dreams} />
                        <AverageRecallTime dreams={dreams} />
                    </>
                )}

                {activeTab === 'Emotions' && (
                    <>
                        <MoodTracker dreams={dreams} />
                        <JoyDreams dreams={dreams} />
                        <FearDreams dreams={dreams} />
                        <AngerDreams dreams={dreams} />
                        <SadnessDreams dreams={dreams} />
                        <AnxietyDreams dreams={dreams} />
                        <HopeDreams dreams={dreams} />
                        <PeacefulDreams dreams={dreams} />
                        <ConfusionDreams dreams={dreams} />
                        <SuccessDreams dreams={dreams} />
                        <ConflictDreams dreams={dreams} />
                        <RomanticDreams dreams={dreams} />
                    </>
                )}

                {activeTab === 'Themes' && (
                    <>
                        <AdventureDreams dreams={dreams} />
                        <MysteryDreams dreams={dreams} />
                        <NatureDreams dreams={dreams} />
                        <TechnologyDreams dreams={dreams} />
                        <WorkDreams dreams={dreams} />
                        <SchoolDreams dreams={dreams} />
                        <PowerDreams dreams={dreams} />
                        <TransformationDreams dreams={dreams} />
                        <SpiritualDreams dreams={dreams} />
                        <CreativityDreams dreams={dreams} />
                        <MoneyDreams dreams={dreams} />
                        <HealthDreams dreams={dreams} />
                        <ChildhoodDreams dreams={dreams} />
                        <DeathDreams dreams={dreams} />
                        <TimeTravelDreams dreams={dreams} />
                    </>
                )}

                {activeTab === 'People' && (
                    <>
                        <FamilyDreams dreams={dreams} />
                        <FriendDreams dreams={dreams} />
                        <StrangerDreams dreams={dreams} />
                        <CelebrityDreams dreams={dreams} />
                        <SocialDreams dreams={dreams} />
                    </>
                )}

                {activeTab === 'Content' && (
                    <>
                        <AnimalDreams dreams={dreams} />
                        <VehicleDreams dreams={dreams} />
                        <FoodDreams dreams={dreams} />
                        <MusicDreams dreams={dreams} />
                        <DreamColorAnalysis dreams={dreams} />
                    </>
                )}

                {activeTab === 'Linguistics' && (
                    <>
                        <UniqueWords dreams={dreams} />
                        <SentenceComplexity dreams={dreams} />
                        <QuestionCount dreams={dreams} />
                        <DialogueCount dreams={dreams} />
                        <FirstPersonCount dreams={dreams} />
                        <PastVsPresentTense dreams={dreams} />
                        <NegationCount dreams={dreams} />
                        <ExclamationIntensity dreams={dreams} />
                        <TitleAnalysis dreams={dreams} />
                    </>
                )}

                {activeTab === 'Settings' && (
                    <>
                        <IndoorVsOutdoor dreams={dreams} />
                        <PeopleVsPlaces dreams={dreams} />
                        <ControlVsChaos dreams={dreams} />
                        <DayVsNightDreams dreams={dreams} />
                    </>
                )}

                {activeTab === 'Temporal' && (
                    <>
                        <MoonPhaseInsight dreams={dreams} />
                        <SeasonalPattern dreams={dreams} />
                        <DayOfWeekAnalysis dreams={dreams} />
                        <WeekdayVsWeekend dreams={dreams} />
                        <JournalingGaps dreams={dreams} />
                        <DreamLengthTrend dreams={dreams} />
                    </>
                )}
            </div>
        </div>
    );
};
