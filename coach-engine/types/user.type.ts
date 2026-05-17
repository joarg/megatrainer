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
	pendingQsAndComments: string[];
	pendingReturnPhase: Nullable<string>;
	pendingReturnPhaseAttempts: Nullable<number>;
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
	pendingQsAndComments: Nullable<MaybeArray<string>>;
	pendingReturnPhase: Nullable<string>;
	pendingReturnPhaseAttempts: Nullable<number>;
	followUp: Nullable<string>;
}>;