// Import types and utilities
import type { User } from './types/user.type.js';
import { createEmptyUser } from './profile.js';

// Import individual phase handlers
import {
	runBackgroundMetricsPhase,
	runBasicInfoPhase,
	runMotivationsAndGoalsPhase,
	runToolsAndTimePhase,
} from './phases/onboarding/phases.js';

// Import core types and constants
import {
	ONBOARDING_PHASES,
	type OnboardingPhaseId,
	type PhaseHandler,
	type TurnInput,
	type TurnOutput,
} from './types/types.js';

/**
 * Phase handlers registry
 * Maps each onboarding phase ID to its corresponding handler function
 */
const phaseHandlers: Record<OnboardingPhaseId, PhaseHandler> = {
	[ONBOARDING_PHASES.basicInfo]: runBasicInfoPhase,
	[ONBOARDING_PHASES.motivationsAndGoals]: runMotivationsAndGoalsPhase,
	[ONBOARDING_PHASES.backgroundAndMetrics]: runBackgroundMetricsPhase,
	[ONBOARDING_PHASES.toolsAndTime]: runToolsAndTimePhase,
};

/**
 * Utility: Normalize user profile data
 * Ensures the provided user profile is valid, falling back to empty profile if needed
 */
function asUserProfile(value: unknown): User {
	if (!value || typeof value !== 'object') {
		return createEmptyUser();
	}

	return { ...createEmptyUser(), ...(value as Partial<User>) };
}

/**
 * Utility: Normalize and validate phase ID
 * Returns a valid phase ID, defaulting to basicInfo if the provided phase is invalid
 */
function normalizePhase(phase: string): OnboardingPhaseId {
	if (phase in phaseHandlers) {
		return phase as OnboardingPhaseId;
	}

	return ONBOARDING_PHASES.basicInfo;
}

/**
 * Main orchestrator function - processes a single conversation turn
 *
 * Flow:
 * 1. Normalize and validate the current phase ID
 * 2. Look up the appropriate phase handler
 * 3. Execute the phase handler (which handles Q&A inline if needed)
 * 4. If phaseComplete, chain to the next phase with a synthetic transition message
 * 5. Return the final output with all accumulated messages
 */
export async function processTurn(input: TurnInput): Promise<TurnOutput> {
	console.log(`Processing turn for phase "${input.phase}", attempt ${input.phaseAttempts}`);
	const currentPhase = normalizePhase(input.phase);
	const handler = phaseHandlers[currentPhase];

	const result = await handler({
		input: { ...input, phase: currentPhase },
		currentUserProfile: asUserProfile(input.currentUserProfile),
	});

	// Chain through phase completions without accumulating messages.
	let current = result;
	let currentPhaseName = currentPhase;

	while (current.phaseComplete && current.nextPhase !== currentPhaseName) {
		const nextPhase = normalizePhase(current.nextPhase);
		const nextHandler = phaseHandlers[nextPhase];

		// Emit the completing phase's message before advancing to the next phase.
		if (current.assistantMessage) {
			input.emit?.({ role: 'assistant', text: current.assistantMessage });
		}

		const nextResult = await nextHandler({
			input: {
				...input,
				phase: nextPhase,
				userMessage: '',
				phaseAttempts: 0,
			},
			currentUserProfile: current.updatedUserProfile,
		});

		currentPhaseName = nextPhase;
		current = nextResult;
	}

	return current;
}
