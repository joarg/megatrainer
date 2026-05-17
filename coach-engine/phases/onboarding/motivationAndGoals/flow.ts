import { callOllamaPhase, parseJsonFromModelContent } from '../../../services/ollama.service.js';
import type { PhaseHandler, TurnInput, TurnOutput } from '../../../types/types.js';
import { ONBOARDING_PHASES } from '../../../types/types.js';
import { User } from '../../../types/user.type.js'
import { ASSESSMENT_PROMPT, MOTIVATIONS_AND_GOALS_GREETING, MOTIVATIONS_AND_GOALS_PROMPTS } from './instructions.js';

let currentProfile: User | null = null;

const latestProfile = (): User => {
	if (!currentProfile) {
		throw new Error('Profile not initialized');
	}
	return currentProfile;
};

export const runMotivationsAndGoalsPhase: PhaseHandler = async ({
	currentUserProfile,
	input,
}) => {
	currentProfile = currentUserProfile;
	const assistantMessage = await selectOutput(currentUserProfile, input.phaseAttempts, input);
	const updatedProfile = latestProfile();

	// If the assessor captured pending questions, hand off to the Q&A phase immediately.
	if (updatedProfile.pendingQsAndComments.length > 0) {
		updatedProfile.pendingReturnPhase = ONBOARDING_PHASES.motivationsAndGoals;
		updatedProfile.pendingReturnPhaseAttempts = input.phaseAttempts + 1;
		currentProfile = updatedProfile;
		return {
			assistantMessage: '',
			pendingAnswers: [],
			updatedUserProfile: updatedProfile,
			nextPhase: ONBOARDING_PHASES.handleQsAndComments,
			nextPhaseAttempts: 0,
			phaseComplete: false,
			handoff: true,
		};
	}

	const isDone = areWeDoneHere(input.phaseAttempts, updatedProfile);
	const turnnOutput: TurnOutput = {
		assistantMessage,
		pendingAnswers: [],
		updatedUserProfile: updatedProfile,
		nextPhase: isDone ? ONBOARDING_PHASES.backgroundAndMetrics : ONBOARDING_PHASES.motivationsAndGoals,
		nextPhaseAttempts: input.phaseAttempts + 1,
		phaseComplete: isDone,
	}
	return turnnOutput;
};
const areWeDoneHere = (phaseAttempts: number, userProfile: User) => {
	if (phaseAttempts === 0) return false;
	if (phaseAttempts > 3 || userProfile.followUp === null) {
		return true;
	} else
		return false;
};

const selectOutput = async (userProfile: User, phaseAttempts: number, turnInput: TurnInput): Promise<string> => {
	// on first message of this phase we just start the conversation by asking a question
	if (phaseAttempts === 0) {
		return await createMessage(userProfile, turnInput, MOTIVATIONS_AND_GOALS_GREETING);
	}
	// for every subsequent turn: assess first, then decide what to say
	await assesment(userProfile, turnInput);
	const updatedProfile = latestProfile();

	// Skip message generation when there are pending Q&As — the handoff phase will respond instead.
	if (updatedProfile.pendingQsAndComments.length > 0) {
		return '';
	}

	// Phase is complete — return empty so the orchestrator chains directly to the next phase
	// without emitting a redundant wrap-up message (backgroundAndMetrics opens with its own transition).
	if (updatedProfile.followUp === null || phaseAttempts > 3) {
		return '';
	}
	return await createMessage(updatedProfile, turnInput, MOTIVATIONS_AND_GOALS_PROMPTS.followUp[0]);
}

const assesment = async (user: User, turnInput: TurnInput) => {
	const assessmentPrompt = ASSESSMENT_PROMPT;
	const assesmentResult = await callOllamaPhase({
		personality: turnInput.personality,
		prompt: assessmentPrompt,
		userMessage: turnInput.userMessage,
		currentUserInfo: JSON.stringify(user),
		selectedSport: turnInput.selectedSport,
		trainerName: turnInput.trainerName,
		lastAssistantMessage: turnInput.lastAssistantMessage,
		phaseCalled: turnInput.phase,
		phaseAttemptNumber: turnInput.phaseAttempts,
	});

	// Parse the assessor's response and update the profile
	try {
		const updatedProfile = parseJsonFromModelContent(assesmentResult.content);
		currentProfile = updatedProfile;
	} catch (error) {
		console.error('Failed to parse assessor response:', error);
	}

	return assesmentResult.content;
};
const createMessage = async (user: User, turnInput: TurnInput, prompt: string) => {
	const assesmentResult = await callOllamaPhase({
		personality: turnInput.personality,
		prompt: prompt,
		userMessage: turnInput.userMessage,
		currentUserInfo: JSON.stringify(user),
		selectedSport: turnInput.selectedSport,
		trainerName: turnInput.trainerName,
		lastAssistantMessage: turnInput.lastAssistantMessage,
		phaseCalled: turnInput.phase,
		phaseAttemptNumber: turnInput.phaseAttempts,
	});

	return assesmentResult.content;
};