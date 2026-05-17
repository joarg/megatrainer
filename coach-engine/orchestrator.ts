// Import types and utilities
import type { User } from './types/user.type.js';
import { createEmptyUser } from './profile.js';

// Import individual phase handlers
import { runGreetingPhase } from './phases/onboarding/greeting/flow.js';
import { runBackgroundMetricsPhase } from './phases/onboarding/backgroundMetrics/flow';
import { runBasicInfoPhase } from './phases/onboarding/basicInfo/flow.js';
import { runHandleQsAndComments } from './phases/onboarding/handleQsAndComments/flow.js';
import { runMotivationsAndGoalsPhase } from './phases/onboarding/motivationAndGoals/flow';
import { runToolsAndTimePhase } from './phases/onboarding/toolsAndTime/flow';

// Import core types and constants
import {
	ONBOARDING_PHASES,
	type ConversationMessage,
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
	[ONBOARDING_PHASES.greeting]: runGreetingPhase,
	[ONBOARDING_PHASES.basicInfo]: runBasicInfoPhase,
	[ONBOARDING_PHASES.motivationsAndGoals]: runMotivationsAndGoalsPhase,
	[ONBOARDING_PHASES.backgroundAndMetrics]: runBackgroundMetricsPhase,
	[ONBOARDING_PHASES.toolsAndTime]: runToolsAndTimePhase,
	[ONBOARDING_PHASES.handleQsAndComments]: runHandleQsAndComments,
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
 * 3. Execute the phase handler with user profile and input
 * 4. If phase is complete and handoff is triggered, immediately call next phase with synthetic message
 * 5. Return the final output (assistant message, updated profile, next phase, debug info)
 */
export async function processTurnCore2(input: TurnInput): Promise<TurnOutput> {
	// Step 1: Validate the phase ID
	const currentPhase = normalizePhase(input.phase);
	
	// Step 2: Get the handler for this phase
	const handler = phaseHandlers[currentPhase];

	// Step 3: Execute the handler
	const result = await handler({
		input: {
			...input,
			phase: currentPhase,
		},
		currentUserProfile: asUserProfile(input.currentUserProfile),
	});

	// Step 4: Chain through handoffs and phase completions, collecting messages along the way.
	let current = result;
	let currentPhaseName = currentPhase;
	const accumulatedMessages: ConversationMessage[] = [];

	while (
		(current.phaseComplete || current.handoff === true) &&
		current.nextPhase !== currentPhaseName
	) {
		const nextPhase = normalizePhase(current.nextPhase);
		const nextHandler = phaseHandlers[nextPhase];
		const isHandoff = current.handoff === true;

		// Emit or collect messages produced by this step (e.g. Q&A detour messages).
		if (current.messages && current.messages.length > 0) {
			for (const msg of current.messages) {
				input.emit?.(msg);
				accumulatedMessages.push(msg);
			}
		}

		// Collect the current phase's assistant message before transitioning to the next phase.
		// Only do this when the phase didn't already populate `messages` — otherwise we'd
		// duplicate messages that set both fields (e.g. the greeting phase).
		if (current.assistantMessage && (!current.messages || current.messages.length === 0)) {
			const msg: ConversationMessage = { role: 'assistant', text: current.assistantMessage };
			input.emit?.(msg);
			accumulatedMessages.push(msg);
		}

		const syntheticMessage = isHandoff
			? `Returning to ${nextPhase} phase after Q&A detour. Continue from where we left off.`
			: `Previous phase (${currentPhaseName}) complete. Starting ${nextPhase} phase.`;

		const nextResult = await nextHandler({
			input: {
				...input,
				phase: nextPhase,
				userMessage: syntheticMessage,
				phaseAttempts: isHandoff ? current.nextPhaseAttempts : 0,
			},
			currentUserProfile: current.updatedUserProfile,
		});

		currentPhaseName = nextPhase;
		current = nextResult;
	}

	// Emit or collect the final message from the last phase in the chain.
	if (accumulatedMessages.length > 0) {
		const finalMessage: ConversationMessage = { role: 'assistant', text: current.assistantMessage };
		input.emit?.(finalMessage);
		return {
			...current,
			messages: [...accumulatedMessages, finalMessage],
		};
	}

	return current;
}
