export type Nullable<T> = T | null;

export type MaybeArray<T> = T | T[];

export type User = {
	name: Nullable<string>;
	age: Nullable<number>;
	gender: Nullable<string>;
	genderNotes: Nullable<string>;
	location: Nullable<string>;
	country: Nullable<string>;
	trainingBackground: string[];
	performanceMetrics: string[];
	injuries: string[];
	motivations: string[];
	goals: string[];
	// Owned by the toolsAndTime phase. Split out from trainingBackground so each
	// phase owns exactly one set of fields — needed for the deterministic
	// "is this phase already satisfied" skip-check in message/index.ts.
	equipmentAndSchedule: string[];
	// Genuine questions/comments the user directed at the trainer (not internal notes).
	pendingQsAndComments: string[];
	// Scratch space: raw snippets a phase's assessment noticed but couldn't confidently
	// place into one of its own fields. A dedicated classifier step (see
	// phases/onboarding/message/instructions/classifier.ts) routes these into the
	// correct field on the next turn, then clears this back out.
	unclassifiedNotes: string[];
	followUp: Nullable<string>;
};

export type UserUpdate = Partial<{
	name: Nullable<string>;
	age: Nullable<number>;
	gender: Nullable<string>;
	genderNotes: Nullable<string>;
	location: Nullable<string>;
	country: Nullable<string>;
	trainingBackground: Nullable<MaybeArray<string>>;
	performanceMetrics: Nullable<MaybeArray<string>>;
	injuries: Nullable<MaybeArray<string>>;
	motivations: Nullable<MaybeArray<string>>;
	goals: Nullable<MaybeArray<string>>;
	equipmentAndSchedule: Nullable<MaybeArray<string>>;
	pendingQsAndComments: Nullable<MaybeArray<string>>;
	unclassifiedNotes: Nullable<MaybeArray<string>>;
	followUp: Nullable<string>;
}>;