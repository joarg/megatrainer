import type { User } from './user.type.js';

export const ONBOARDING_PHASES = {
	greeting: 'greeting',
	basicInfo: 'basicInfo',
	motivationsAndGoals: 'motivationsAndGoals',
	backgroundAndMetrics: 'backgroundAndMetrics',
	toolsAndTime: 'toolsAndTime',
	handleQsAndComments: 'handleQsAndComments',
} as const;

export type OnboardingPhaseId =
	(typeof ONBOARDING_PHASES)[keyof typeof ONBOARDING_PHASES];

export type InterviewField =
	| 'name'
	| 'age'
	| 'location'
	| 'trainingBackground'
	| 'performanceMetrics'
	| 'injuries'
	| 'motivations'
	| 'goals';

export type PhaseInput = {
	userMessage: string;
	personality: string;
	trainerName?: string;
	selectedSport?: string;
	currentUserProfile?: User;
	lastAssistantMessage?: string;
};

export type ConversationMessage = {
	role: 'assistant' | 'manager';
	text: string;
};

export type EmitFn = (message: ConversationMessage) => void;

export type TurnInput = PhaseInput & {
	phase: string;
	phaseAttempts: number;
	emit?: EmitFn;
};

export type OllamaPhaseInput = PhaseInput & {
	prompt: string;
	currentUserInfo?: string;
	phaseCalled?: string;
	phaseAttemptNumber?: number;
};

export type TurnOutput = {
	assistantMessage: string;
	pendingAnswers: string[];
	messages?: ConversationMessage[];
	updatedUserProfile: User;
	nextPhase: OnboardingPhaseId;
	nextPhaseAttempts: number;
	phaseComplete: boolean;
	/** When true, the orchestrator immediately chains to nextPhase without requiring phaseComplete. */
	handoff?: boolean;
};

export type PhaseContext = {
	input: TurnInput;
	currentUserProfile: User;
};

export type PhaseHandler = (context: PhaseContext) => Promise<TurnOutput>;

export type OllamaLogEntry = {
	phaseCalled: string;
	phaseAttemptNumber: number;
	timestamp: string;
	request: { prompt: string; userMessage: string };
	response: string;
	thinking?: string;
};
