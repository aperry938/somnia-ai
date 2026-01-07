import React from 'react';
import { Dream } from '../../../types';
import { MoonPhaseInsight } from '../MoonPhaseInsight';
import { SeasonalPattern } from '../SeasonalPattern';
import { DayOfWeekAnalysis } from '../DayOfWeekAnalysis';
import { WeekdayVsWeekend } from '../WeekdayVsWeekend';
import { JournalingGaps } from '../JournalingGaps';
import { DreamLengthTrend } from '../DreamLengthTrend';

interface TemporalTabProps {
    dreams: Dream[];
}

const TemporalTab: React.FC<TemporalTabProps> = ({ dreams }) => (
    <>
        <MoonPhaseInsight dreams={dreams} />
        <SeasonalPattern dreams={dreams} />
        <DayOfWeekAnalysis dreams={dreams} />
        <WeekdayVsWeekend dreams={dreams} />
        <JournalingGaps dreams={dreams} />
        <DreamLengthTrend dreams={dreams} />
    </>
);

export default TemporalTab;
