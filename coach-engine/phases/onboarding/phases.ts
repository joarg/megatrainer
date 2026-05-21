import { ONBOARDING_PHASES } from '../../types/types.js';
import { createStandardPhaseHandler } from '../shared/standardPhase.js';

import { ASSESSMENT_PROMPT as BASIC_INFO_ASSESSMENT, BASIC_INFO_PROMPTS } from './instructions_basic_info.js';
import { ASSESSMENT_PROMPT as MOTIVATIONS_ASSESSMENT, MOTIVATIONS_AND_GOALS_GREETING, MOTIVATIONS_AND_GOALS_PROMPTS } from './instructions_motivation_and_goals.js';
import { ASSESSMENT_PROMPT as BACKGROUND_ASSESSMENT, BACKGROUND_METRICS_GREETING, BACKGROUND_METRICS_PROMPTS } from './instructions_background_metrics.js';
import { ASSESSMENT_PROMPT as TOOLS_ASSESSMENT, TOOLS_AND_TIME_GREETING, TOOLS_AND_TIME_PROMPTS } from './instructions_tools_and_time.js';

export const runBasicInfoPhase = createStandardPhaseHandler({
	phaseId: ONBOARDING_PHASES.basicInfo,
	nextPhaseId: ONBOARDING_PHASES.motivationsAndGoals,
	// No greetingPrompt: the pre-generated greeting already warmed up the user.
	// Assessment runs from attempt 0 so the user's first message is immediately captured.
	assessmentPrompt: BASIC_INFO_ASSESSMENT,
	followUpPrompts: BASIC_INFO_PROMPTS.followUp,
	donePrompt: BASIC_INFO_PROMPTS.done,
});

export const runMotivationsAndGoalsPhase = createStandardPhaseHandler({
	phaseId: ONBOARDING_PHASES.motivationsAndGoals,
	nextPhaseId: ONBOARDING_PHASES.backgroundAndMetrics,
	greetingPrompt: MOTIVATIONS_AND_GOALS_GREETING,
	assessmentPrompt: MOTIVATIONS_ASSESSMENT,
	followUpPrompts: MOTIVATIONS_AND_GOALS_PROMPTS.followUp,
	donePrompt: MOTIVATIONS_AND_GOALS_PROMPTS.done,
});

export const runBackgroundMetricsPhase = createStandardPhaseHandler({
	phaseId: ONBOARDING_PHASES.backgroundAndMetrics,
	nextPhaseId: ONBOARDING_PHASES.toolsAndTime,
	greetingPrompt: BACKGROUND_METRICS_GREETING,
	assessmentPrompt: BACKGROUND_ASSESSMENT,
	followUpPrompts: BACKGROUND_METRICS_PROMPTS.followUp,
	donePrompt: BACKGROUND_METRICS_PROMPTS.done,
});

export const runToolsAndTimePhase = createStandardPhaseHandler({
	phaseId: ONBOARDING_PHASES.toolsAndTime,
	nextPhaseId: ONBOARDING_PHASES.toolsAndTime, // last phase — stays here when done
	greetingPrompt: TOOLS_AND_TIME_GREETING,
	assessmentPrompt: TOOLS_ASSESSMENT,
	followUpPrompts: TOOLS_AND_TIME_PROMPTS.followUp,
	donePrompt: TOOLS_AND_TIME_PROMPTS.done,
});
