import { callOllamaPhase, parseJsonFromModelContent } from '../../../services/ollama.service.js';
import type { PhaseHandler, TurnInput, TurnOutput } from '../../../types/types.js';
import { ONBOARDING_PHASES } from '../../../types/types.js';
import { User } from '../../../types/user.type.js';
import { ASSESSMENT_PROMPT, BACKGROUND_METRICS_GREETING, BACKGROUND_METRICS_PROMPTS } from './instructions.js';

let currentProfile: User | null = null;

const latestProfile = (): User => {
	if (!currentProfile) {
		throw new Error('Profile not initialized');
	}
	return currentProfile;
};

export const runBackgroundMetricsPhase: PhaseHandler = async ({
	currentUserProfile,
	input,
}) => {
	currentProfile = currentUserProfile;
	const assistantMessage = await selectOutput(currentUserProfile, input.phaseAttempts, input);
	const updatedProfile = latestProfile();

	// If the assessor captured pending questions, hand off to the Q&A phase immediately.
	if (updatedProfile.pendingQsAndComments.length > 0) {
		updatedProfile.pendingReturnPhase = ONBOARDING_PHASES.backgroundAndMetrics;
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
	const turnOutput: TurnOutput = {
		assistantMessage,
		pendingAnswers: [],
		updatedUserProfile: updatedProfile,
		nextPhase: isDone ? ONBOARDING_PHASES.toolsAndTime : ONBOARDING_PHASES.backgroundAndMetrics,
		nextPhaseAttempts: input.phaseAttempts + 1,
		phaseComplete: isDone,
	};
	return turnOutput;
};

const areWeDoneHere = (phaseAttempts: number, userProfile: User) => {
	if (phaseAttempts === 0) return false;
	if (phaseAttempts > 3 || userProfile.followUp === null) {
		return true;
	} else
		return false;
};

const selectOutput = async (userProfile: User, phaseAttempts: number, turnInput: TurnInput): Promise<string> => {
	if (phaseAttempts === 0) {
		return await createMessage(userProfile, turnInput, BACKGROUND_METRICS_GREETING);
	}
	await assessment(userProfile, turnInput);
	const updatedProfile = latestProfile();

	// Skip message generation when there are pending Q&As — the handoff phase will respond instead.
	if (updatedProfile.pendingQsAndComments.length > 0) {
		return '';
	}

	if (updatedProfile.followUp === null) {
		return BACKGROUND_METRICS_PROMPTS.done;
	}
	if (phaseAttempts > 3) {
		return BACKGROUND_METRICS_PROMPTS.done;
	}
	return await createMessage(updatedProfile, turnInput, BACKGROUND_METRICS_PROMPTS.followUp[0]);
};

const assessment = async (user: User, turnInput: TurnInput) => {
	const assessmentResult = await callOllamaPhase({
		personality: turnInput.personality,
		prompt: ASSESSMENT_PROMPT,
		userMessage: turnInput.userMessage,
		currentUserInfo: JSON.stringify(user),
		selectedSport: turnInput.selectedSport,
		trainerName: turnInput.trainerName,
		lastAssistantMessage: turnInput.lastAssistantMessage,
		phaseCalled: turnInput.phase,
		phaseAttemptNumber: turnInput.phaseAttempts,
	});

	try {
		const updatedProfile = parseJsonFromModelContent(assessmentResult.content);
		currentProfile = updatedProfile;
	} catch (error) {
		console.error('Failed to parse assessor response:', error);
	}

	return assessmentResult.content;
};

const createMessage = async (user: User, turnInput: TurnInput, prompt: string) => {
	const result = await callOllamaPhase({
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

	return result.content;
};
