import {PROMPTS as prompt1, ASSESSMENT_PROMPT as assesment1,  } from './instructions_basic_info';
import {PROMPTS as prompt2, ASSESSMENT_PROMPT as assesment2, INTRODUCTION_PROMPT as intro1 } from './instructions_motivation_and_goals';
import {PROMPTS as prompt3, ASSESSMENT_PROMPT as assesment3, INTRODUCTION_PROMPT as intro2} from './instructions_background_metrics';
import {TOOLS_AND_TIME_PROMPTS as prompt4, ASSESSMENT_PROMPT as assesment4, INTRODUCTION_PROMPT as intro3 } from './instructions_tools_and_time';
import type { ONBOARDING_PHASES } from '../../../../types/types.js';

export const promptsForPhases: Record<keyof typeof ONBOARDING_PHASES, {
    prompts: string[];
    assessmentPrompt: string;
    introductionPrompt?: string;
    nextPhase: keyof typeof ONBOARDING_PHASES | null;
}> = {
    basicInfo:            { prompts: prompt1, assessmentPrompt: assesment1, nextPhase: 'motivationsAndGoals' },
    motivationsAndGoals:  { prompts: prompt2, assessmentPrompt: assesment2, introductionPrompt: intro1, nextPhase: 'backgroundAndMetrics' },
    backgroundAndMetrics: { prompts: prompt3, assessmentPrompt: assesment3, introductionPrompt: intro2, nextPhase: 'toolsAndTime' },
    toolsAndTime:         { prompts: prompt4, assessmentPrompt: assesment4, introductionPrompt: intro3, nextPhase: null },  // onboarding done
}
