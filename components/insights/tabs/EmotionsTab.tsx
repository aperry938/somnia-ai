import React from 'react';
import { Dream } from '../../../types';
import { MoodTracker } from '../MoodTracker';
import { JoyDreams } from '../JoyDreams';
import { FearDreams } from '../FearDreams';
import { AngerDreams } from '../AngerDreams';
import { SadnessDreams } from '../SadnessDreams';
import { AnxietyDreams } from '../AnxietyDreams';
import { HopeDreams } from '../HopeDreams';
import { PeacefulDreams } from '../PeacefulDreams';
import { ConfusionDreams } from '../ConfusionDreams';
import { SuccessDreams } from '../SuccessDreams';
import { ConflictDreams } from '../ConflictDreams';
import { RomanticDreams } from '../RomanticDreams';

interface EmotionsTabProps {
    dreams: Dream[];
}

const EmotionsTab: React.FC<EmotionsTabProps> = ({ dreams }) => (
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
);

export default EmotionsTab;
