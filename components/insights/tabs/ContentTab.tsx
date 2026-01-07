import React from 'react';
import { Dream } from '../../../types';
import { AnimalDreams } from '../AnimalDreams';
import { VehicleDreams } from '../VehicleDreams';
import { FoodDreams } from '../FoodDreams';
import { MusicDreams } from '../MusicDreams';
import { DreamColorAnalysis } from '../DreamColorAnalysis';

interface ContentTabProps {
    dreams: Dream[];
}

const ContentTab: React.FC<ContentTabProps> = ({ dreams }) => (
    <>
        <AnimalDreams dreams={dreams} />
        <VehicleDreams dreams={dreams} />
        <FoodDreams dreams={dreams} />
        <MusicDreams dreams={dreams} />
        <DreamColorAnalysis dreams={dreams} />
    </>
);

export default ContentTab;
