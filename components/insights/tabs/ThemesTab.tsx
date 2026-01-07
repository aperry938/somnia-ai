import React from 'react';
import { Dream } from '../../../types';
import { AdventureDreams } from '../AdventureDreams';
import { MysteryDreams } from '../MysteryDreams';
import { NatureDreams } from '../NatureDreams';
import { TechnologyDreams } from '../TechnologyDreams';
import { WorkDreams } from '../WorkDreams';
import { SchoolDreams } from '../SchoolDreams';
import { PowerDreams } from '../PowerDreams';
import { TransformationDreams } from '../TransformationDreams';
import { SpiritualDreams } from '../SpiritualDreams';
import { CreativityDreams } from '../CreativityDreams';
import { MoneyDreams } from '../MoneyDreams';
import { HealthDreams } from '../HealthDreams';
import { ChildhoodDreams } from '../ChildhoodDreams';
import { DeathDreams } from '../DeathDreams';
import { TimeTravelDreams } from '../TimeTravelDreams';

interface ThemesTabProps {
    dreams: Dream[];
}

const ThemesTab: React.FC<ThemesTabProps> = ({ dreams }) => (
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
);

export default ThemesTab;
