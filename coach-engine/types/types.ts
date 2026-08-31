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
	selectedSport?: string[];
	currentUserProfile?: User;
	prompt: string;
	userMessage: string;
	lastAssistantMessage?: string;
};

export type TurnInput = {
    userMessage: string;
    personality: string;
    trainerName?: string;
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
