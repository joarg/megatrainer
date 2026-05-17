import { callOllamaPhase } from '../../../services/ollama.service.js';
import type { PhaseHandler, TurnOutput } from '../../../types/types.js';
import { ONBOARDING_PHASES } from '../../../types/types.js';
import { GREETING_PROMPT } from './instructions.js';

export const runGreetingPhase: PhaseHandler = async ({ input, currentUserProfile }) => {
	const response = await callOllamaPhase({
		personality: input.personality,
		trainerName: input.trainerName,
		selectedSport: input.selectedSport,
		prompt: GREETING_PROMPT,
		userMessage: input.userMessage,
		lastAssistantMessage: input.lastAssistantMessage,
		phaseCalled: 'greeting',
	});

	const turnOutput: TurnOutput = {
		assistantMessage: response.content,
		messages: [{ role: 'assistant', text: response.content }],
		pendingAnswers: [],
		updatedUserProfile: currentUserProfile,
		nextPhase: ONBOARDING_PHASES.basicInfo,
		nextPhaseAttempts: 0,
		phaseComplete: true,
	};
	return turnOutput;
};
