import type { User } from './user.type.js';

export const ONBOARDING_PHASES = {
	basicInfo: 'basicInfo',
	motivationsAndGoals: 'motivationsAndGoals',
	backgroundAndMetrics: 'backgroundAndMetrics',
	toolsAndTime: 'toolsAndTime',
} as const;

export type OllamaInput = {
	personality: string;
	trainerName?: string;
	// Language the trainer speaks to the user in, as a plain human-readable name
	// ("Norwegian", "Spanish"). Undefined (or English) keeps the default English
	// behaviour and adds nothing to the system prompt. Pinning this explicitly
	// matters because the models otherwise just mirror whatever language the last
	// user message happened to be in, which can drift mid-conversation.
	language?: string;
	selectedSport?: string[];
	currentUserProfile?: User;
	prompt: string;
	userMessage: string;
	lastAssistantMessage?: string;
};

// Input for the one-shot generators that run at trainer-creation time (greeting,
// first question, panel copy). They each supply their own `prompt` internally, so
// callers must not be required to pass one — see generateGreeting/generatePanelCopy.
export type GenerationInput = Omit<OllamaInput, 'prompt'>;

export type TurnInput = {
    userMessage: string;
    personality: string;
    trainerName?: string;
    language?: string;
    selectedSport?: string[];
    currentUserProfile?: User;
    lastAssistantMessage?: string;
    phase: keyof typeof ONBOARDING_PHASES;
    phaseAttempts: number;
};

export type ProcessMessageResult = {
    response: string;
	updatedUserProfile?: User;
    nextPhase: keyof typeof ONBOARDING_PHASES | null;
};
