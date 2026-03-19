import React from 'react';
import { Dream } from '../../../types';
import { RecentDreamSummary } from '../RecentDreamSummary';
import { AvgSleepQuality } from '../AvgSleepQuality';
import { DreamGrowth } from '../DreamGrowth';
import { AchievementsUnlocked } from '../AchievementsUnlocked';
import { TopTags } from '../TopTags';
import { DreamConsistency } from '../DreamConsistency';
import { LongestShortestDream } from '../LongestShortestDream';
import { FirstDreamLastDream } from '../FirstDreamLastDream';
import { SleepQualityVsDreams } from '../SleepQualityVsDreams';
import { TelemetryScatterPlot } from '../TelemetryScatterPlot';
import { PredictiveInsightCard } from '../PredictiveInsightCard';

interface QuickStatsTabProps {
    dreams: Dream[];
    onDreamSelect?: (id: number) => void;
}

const QuickStatsTab: React.FC<QuickStatsTabProps> = ({ dreams, onDreamSelect }) => (
    <>
        <RecentDreamSummary dreams={dreams} />
        <AvgSleepQuality dreams={dreams} />
        <PredictiveInsightCard dreams={dreams} />
        <TelemetryScatterPlot dreams={dreams} onDreamSelect={onDreamSelect} />
        <DreamGrowth dreams={dreams} />
        <AchievementsUnlocked dreams={dreams} />
        <TopTags dreams={dreams} />
        <DreamConsistency dreams={dreams} />
        <LongestShortestDream dreams={dreams} />
        <FirstDreamLastDream dreams={dreams} />
        <SleepQualityVsDreams dreams={dreams} />
    </>
);

export default QuickStatsTab;
