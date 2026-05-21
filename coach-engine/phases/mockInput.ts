import { createEmptyUser } from '../profile.js';
import { ONBOARDING_PHASES, type TurnInput } from '../types/types.js';
import type { User } from '../types/user.type.js';

export const mockUserProfile: User = {
	...createEmptyUser()
	// name: nell,
	// age: null,
	// gender: null,
	// genderNotes: "Name Joar is a typically male name",
	// location: "Oslo",
	// country: "Norway",
	// trainingBackground: [],
	// performanceMetrics: [],
	// injuries: [],
	// motivations: [],
	// goals: [],
	// followUp: null,
};

export const mockUserMessage = "";

export const mockTurnInput: TurnInput = {
	phase: ONBOARDING_PHASES.basicInfo,
	phaseAttempts: 0,
	userMessage: mockUserMessage,
	personality: 'you are a military drill sergeant, you are very strict and demanding, you always push your users to their limits and expect nothing but the best from them. You are not very good at being friendly or engaging, but you are very effective at motivating your users to achieve their goals.',
	trainerName: 'sgt Joe',
	selectedSport: 'running',
	currentUserProfile: mockUserProfile,
	lastAssistantMessage: "Listen up! Welcome to the interview. I'm Military Mike 3...",
};

export function createMockTurnInput(overrides: Partial<TurnInput> = {}): TurnInput {
	return {
		...mockTurnInput,
		...overrides,
		currentUserProfile: overrides.currentUserProfile
			? {
				...mockUserProfile,
				...overrides.currentUserProfile,
			}
			: mockUserProfile,
	};
}
