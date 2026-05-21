import { callOllamaPhase, parseJsonFromModelContent } from '../../services/ollama.service.js';
import { mergeUser } from '../../profile.js';
import type { OnboardingPhaseId, PhaseHandler, TurnInput } from '../../types/types.js';
import type { User, UserUpdate } from '../../types/user.type.js';
import { handleQAndA } from './qanda.js';

export type StandardPhaseConfig = {
	/** The phase ID this handler is registered under. */
	phaseId: OnboardingPhaseId;
	/** The phase to advance to when this one completes. */
	nextPhaseId: OnboardingPhaseId;
	/**
	 * Prompt used at phaseAttempts === 0.
	 * When present, attempt 0 skips assessment and returns this as the opening message.
	 * When absent (basicInfo style), assessment runs from attempt 0 onwards.
	 */
	greetingPrompt?: string;
	/** Prompt sent to the assessment LLM call to extract structured user data. */
	assessmentPrompt: string;
	/** Ordered list of follow-up prompts. Clamped to last entry when exhausted. */
	followUpPrompts: readonly string[];
	/** Prompt used when the phase is complete (always goes through the LLM). */
	donePrompt: string;
	/** Max phaseAttempts before the phase is forced done regardless of followUp. Default 3. */
	maxAttempts?: number;
};

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

const ASSESSMENT_PERSONALITY =
	'You are a neutral data extraction agent. Your only job is to parse the user message and return structured JSON. Never respond conversationally. Never adopt a persona. Output only valid JSON.';

async function runAssessment(
	config: StandardPhaseConfig,
	user: User,
	input: TurnInput,
): Promise<{ updatedUser: User; pendingQuestions: string[] }> {
	const result = await callOllamaPhase({	
		personality: ASSESSMENT_PERSONALITY,
		prompt: config.assessmentPrompt,
		userMessage: input.userMessage,
		currentUserInfo: JSON.stringify(user),
		selectedSport: input.selectedSport,
		lastAssistantMessage: input.lastAssistantMessage,
		phaseCalled: `${config.phaseId}-assessment`,
		phaseAttemptNumber: input.phaseAttempts,
	});

	try {
		const parsed = parseJsonFromModelContent(result.content);
		// pendingQsAndComments is Q&A conversation state, not a user profile field.
		// Extract it separately so it never gets merged into the User object.
		const { pendingQsAndComments, ...userUpdate } = parsed;
		const updatedUser = mergeUser(user, userUpdate as UserUpdate);
		const pendingQuestions: string[] = Array.isArray(pendingQsAndComments) ? pendingQsAndComments : [];
		return { updatedUser, pendingQuestions };
	} catch (error) {
		console.error(`[${config.phaseId}] Failed to parse assessment response:`, error);
		return { updatedUser: user, pendingQuestions: [] };
	}
}

async function generateMessage(user: User, input: TurnInput, prompt: string): Promise<string> {
	const result = await callOllamaPhase({
		personality: input.personality,
		prompt,
		userMessage: input.userMessage,
		currentUserInfo: JSON.stringify(user),
		selectedSport: input.selectedSport,
		trainerName: input.trainerName,
		lastAssistantMessage: input.lastAssistantMessage,
		phaseCalled: `${input.phase}-message`,
		phaseAttemptNumber: input.phaseAttempts,
	});
	return result.content;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createStandardPhaseHandler(config: StandardPhaseConfig): PhaseHandler {
	const maxAttempts = config.maxAttempts ?? 3;

	return async ({ currentUserProfile, input }) => {
		const isFirstTurn = input.phaseAttempts === 0;
		const hasSyntheticStart = !!config.greetingPrompt;

		// First turn for phases with a greeting: return the opening message without assessment.
		// The synthetic orchestrator message has no real user data to extract.
		if (isFirstTurn && hasSyntheticStart) {
			const message = await generateMessage(currentUserProfile, input, config.greetingPrompt!);
			return {
				assistantMessage: message,
				updatedUserProfile: currentUserProfile,
				nextPhase: config.phaseId,
				phaseComplete: false,
			};
		}

		// All other turns: run assessment to extract profile data.
		// Skip assessment if there is no user message — nothing to extract.
		const { updatedUser, pendingQuestions } = input.userMessage?.trim()
			? await runAssessment(config, currentUserProfile, input)
			: { updatedUser: currentUserProfile, pendingQuestions: [] };

		// If the user asked a question mid-interview, handle it inline before continuing.
		if (pendingQuestions.length > 0) {
			await handleQAndA(pendingQuestions, input);
		}

		// Determine whether this phase is done.
		const isDone = input.phaseAttempts > maxAttempts || updatedUser.followUp === null;

		let message: string;
		if (isDone) {
			message = await generateMessage(updatedUser, input, config.donePrompt);
		} else {
			// Map attempt number to the correct follow-up prompt.
			// Phases with a greeting: attempt 1 → index 0, attempt 2 → index 1, etc.
			// basicInfo (no greeting): attempt 0 → index 0, attempt 1 → index 1, etc.
			const rawIndex = hasSyntheticStart ? input.phaseAttempts - 1 : input.phaseAttempts;
			const followUpIndex = Math.min(rawIndex, config.followUpPrompts.length - 1);
			message = await generateMessage(updatedUser, input, config.followUpPrompts[followUpIndex]);
		}

		return {
			assistantMessage: message,
			updatedUserProfile: updatedUser,
			nextPhase: isDone ? config.nextPhaseId : config.phaseId,
			phaseComplete: isDone,
		};
	};
}
