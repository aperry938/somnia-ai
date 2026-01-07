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
import { PositiveNegativeRatio } from '../PositiveNegativeRatio';

interface QuickStatsTabProps {
    dreams: Dream[];
}

const QuickStatsTab: React.FC<QuickStatsTabProps> = ({ dreams }) => (
    <>
        <RecentDreamSummary dreams={dreams} />
        <AvgSleepQuality dreams={dreams} />
        <DreamGrowth dreams={dreams} />
        <AchievementsUnlocked dreams={dreams} />
        <TopTags dreams={dreams} />
        <DreamConsistency dreams={dreams} />
        <LongestShortestDream dreams={dreams} />
        <FirstDreamLastDream dreams={dreams} />
        <SleepQualityVsDreams dreams={dreams} />
        <PositiveNegativeRatio dreams={dreams} />
    </>
);

export default QuickStatsTab;
