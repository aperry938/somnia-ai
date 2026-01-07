import React from 'react';
import { Dream } from '../../../types';
import { IndoorVsOutdoor } from '../IndoorVsOutdoor';
import { PeopleVsPlaces } from '../PeopleVsPlaces';
import { ControlVsChaos } from '../ControlVsChaos';
import { DayVsNightDreams } from '../DayVsNightDreams';

interface SettingsTabProps {
    dreams: Dream[];
}

const SettingsTab: React.FC<SettingsTabProps> = ({ dreams }) => (
    <>
        <IndoorVsOutdoor dreams={dreams} />
        <PeopleVsPlaces dreams={dreams} />
        <ControlVsChaos dreams={dreams} />
        <DayVsNightDreams dreams={dreams} />
    </>
);

export default SettingsTab;
