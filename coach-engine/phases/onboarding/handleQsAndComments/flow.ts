import { callOllamaPhase } from '../../../services/ollama.service.js';
import { ONBOARDING_PHASES, type OnboardingPhaseId, type PhaseHandler, type TurnOutput } from '../../../types/types.js';
import { MANAGER_ANSWER_PROMPT, MANAGER_PERSONALITY, TRAINER_HANDOVER_PROMPT, TRAINER_RESUME_PROMPT } from './instructions.js';

export const runHandleQsAndComments: PhaseHandler = async ({ currentUserProfile, input }) => {
	const questions = currentUserProfile.pendingQsAndComments;
	const returnPhase = (currentUserProfile.pendingReturnPhase ?? ONBOARDING_PHASES.basicInfo) as OnboardingPhaseId;
	const returnPhaseAttempts = currentUserProfile.pendingReturnPhaseAttempts ?? 0;

	const questionsText = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

	// Step 1: Trainer acknowledges the question and hands over to manager
	const handoverResult = await callOllamaPhase({
		personality: input.personality,
		prompt: TRAINER_HANDOVER_PROMPT,
		userMessage: questionsText,
		trainerName: input.trainerName,
		selectedSport: input.selectedSport,
		lastAssistantMessage: input.lastAssistantMessage,
		phaseCalled: 'handleQsAndComments-handover',
		phaseAttemptNumber: input.phaseAttempts,
	});
	input.emit?.({ role: 'assistant', text: handoverResult.content });

	// Step 2: Manager answers the question(s)
	const managerResult = await callOllamaPhase({
		personality: MANAGER_PERSONALITY,
		prompt: MANAGER_ANSWER_PROMPT,
		userMessage: questionsText,
		selectedSport: input.selectedSport,
		phaseCalled: 'handleQsAndComments-manager',
		phaseAttemptNumber: input.phaseAttempts,
	});
	input.emit?.({ role: 'manager', text: managerResult.content });

	// Step 3: Trainer comes back — pass the manager's answer as context so it doesn't re-answer
	const resumeResult = await callOllamaPhase({
		personality: input.personality,
		prompt: TRAINER_RESUME_PROMPT,
		userMessage: `The manager just said: "${managerResult.content}"`,
		trainerName: input.trainerName,
		selectedSport: input.selectedSport,
		phaseCalled: 'handleQsAndComments-resume',
		phaseAttemptNumber: input.phaseAttempts,
	});
	// Resume message is NOT emitted here — the orchestrator emits it as the final message after chaining back.

	const updatedProfile = {
		...currentUserProfile,
		pendingQsAndComments: [],
		pendingReturnPhase: null,
		pendingReturnPhaseAttempts: null,
	};

	const turnOutput: TurnOutput = {
		assistantMessage: resumeResult.content,
		pendingAnswers: [],
		// Only resume is here — handover and manager were already emitted directly above.
		// The orchestrator will emit resume now, then emit the return-phase question as the final message.
		messages: [
			{ role: 'assistant', text: resumeResult.content },
		],
		updatedUserProfile: updatedProfile,
		nextPhase: returnPhase,
		nextPhaseAttempts: returnPhaseAttempts,
		phaseComplete: false,
		handoff: true,
	};

	return turnOutput;
};
