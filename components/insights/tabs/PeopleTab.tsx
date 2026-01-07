import React from 'react';
import { Dream } from '../../../types';
import { FamilyDreams } from '../FamilyDreams';
import { FriendDreams } from '../FriendDreams';
import { StrangerDreams } from '../StrangerDreams';
import { CelebrityDreams } from '../CelebrityDreams';
import { SocialDreams } from '../SocialDreams';

interface PeopleTabProps {
    dreams: Dream[];
}

const PeopleTab: React.FC<PeopleTabProps> = ({ dreams }) => (
    <>
        <FamilyDreams dreams={dreams} />
        <FriendDreams dreams={dreams} />
        <StrangerDreams dreams={dreams} />
        <CelebrityDreams dreams={dreams} />
        <SocialDreams dreams={dreams} />
    </>
);

export default PeopleTab;
