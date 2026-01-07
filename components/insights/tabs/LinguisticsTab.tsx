import React from 'react';
import { Dream } from '../../../types';
import { UniqueWords } from '../UniqueWords';
import { SentenceComplexity } from '../SentenceComplexity';
import { QuestionCount } from '../QuestionCount';
import { DialogueCount } from '../DialogueCount';
import { FirstPersonCount } from '../FirstPersonCount';
import { PastVsPresentTense } from '../PastVsPresentTense';
import { NegationCount } from '../NegationCount';
import { ExclamationIntensity } from '../ExclamationIntensity';
import { TitleAnalysis } from '../TitleAnalysis';

interface LinguisticsTabProps {
    dreams: Dream[];
}

const LinguisticsTab: React.FC<LinguisticsTabProps> = ({ dreams }) => (
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
);

export default LinguisticsTab;
