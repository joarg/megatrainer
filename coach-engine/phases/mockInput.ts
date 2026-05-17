import { createEmptyUser } from '../profile.js';
import { ONBOARDING_PHASES, type TurnInput } from '../types/types.js';
import type { User } from '../types/user.type.js';

export const mockUserProfile: User = {
	...createEmptyUser(),
	name: "Joar",
	age: 43,
	gender: "male",
	genderNotes: "Name Joar is a typically male name",
	location: "Oslo",
	country: "Norway",
	trainingBackground: [],
	performanceMetrics: [],
	injuries: [],
	motivations: [],
	goals: [],
	pendingQsAndComments: [],
	followUp: "",
};

export const mockUserMessage =
	"I just like to get in better shape, maybe run faster. ";

export const mockTurnInput: TurnInput = {
	phase: ONBOARDING_PHASES.motivationsAndGoals,
	phaseAttempts: 0,
	userMessage: mockUserMessage,
	personality: 'you are a military drill sergeant, you are very strict and demanding, you always push your users to their limits and expect nothing but the best from them. You are not very good at being friendly or engaging, but you are very effective at motivating your users to achieve their goals. We can ask one or more questions here, but the main question of the reply should be to get to know the why of why they want to train the selected sport.  ',
	trainerName: 'sgt Joe',
	selectedSport: 'running',
	currentUserProfile: mockUserProfile,
};

export const mockTurnInput2: TurnInput = {
	phase: ONBOARDING_PHASES.motivationsAndGoals,
	phaseAttempts: 0,
	userMessage: mockUserMessage,
	personality: 'you are a military drill sergeant, you are very strict and demanding, you always push your users to their limits and expect nothing but the best from them. You are not very good at being friendly or engaging, but you are very effective at motivating your users to achieve their goals. We can ask one or more questions here, but the main question of the reply should be to get to know the why of why they want to train the selected sport.  ',
	trainerName: 'sgt Joe',
	selectedSport: 'running',
	currentUserProfile: mockUserProfile,
};
export const mockTurnInput3: TurnInput = {
	phase: ONBOARDING_PHASES.motivationsAndGoals,
	phaseAttempts: 0,
	userMessage: mockUserMessage,
	personality: 'you are a military drill sergeant, you are very strict and demanding, you always push your users to their limits and expect nothing but the best from them. You are not very good at being friendly or engaging, but you are very effective at motivating your users to achieve their goals. We can ask one or more questions here, but the main question of the reply should be to get to know the why of why they want to train the selected sport.  ',
	trainerName: 'sgt Joe',
	selectedSport: 'running',
	currentUserProfile: mockUserProfile,
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
