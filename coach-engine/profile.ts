import type {
	MaybeArray,
	Nullable,
	User,
	UserUpdate,
} from './types/user.type.js';

export function createEmptyUser(): User {
	return {
		name: null,
		age: null,
		gender: null,
		genderNotes: null,
		location: null,
		country: null,
		trainingBackground: [],
		performanceMetrics: [],
		injuries: [],
		motivations: [],
		goals: [],
		equipmentAndSchedule: [],
		pendingQsAndComments: [],
		unclassifiedNotes: [],
		followUp: 'name,age,location',
	};
}

function appendUnique(existing: string[], incoming?: Nullable<MaybeArray<string>>): string[] {
	if (incoming == null) {
		return existing;
	}

	const nextValues = Array.isArray(incoming) ? incoming : [incoming];
	const seen = new Set(existing.map((value) => value.trim().toLowerCase()));
	const merged = [...existing];

	for (const value of nextValues) {
		const trimmed = value.trim();
		if (trimmed.length === 0) {
			continue;
		}

		const key = trimmed.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			merged.push(trimmed);
		}
	}

	return merged;
}

export function mergeUser(current: User, update: UserUpdate): User {
	return {
		name: update.name ?? current.name,
		age: update.age ?? current.age,
		gender: update.gender ?? current.gender,
		genderNotes: update.genderNotes ?? current.genderNotes,
		location: update.location ?? current.location,
		country: update.country ?? current.country,
		trainingBackground: appendUnique(current.trainingBackground, update.trainingBackground),
		performanceMetrics: appendUnique(current.performanceMetrics, update.performanceMetrics),
		injuries: appendUnique(current.injuries, update.injuries),
		motivations: appendUnique(current.motivations, update.motivations),
		goals: appendUnique(current.goals, update.goals),
		equipmentAndSchedule: appendUnique(current.equipmentAndSchedule, update.equipmentAndSchedule),
		pendingQsAndComments: appendUnique(current.pendingQsAndComments, update.pendingQsAndComments),
		unclassifiedNotes: appendUnique(current.unclassifiedNotes, update.unclassifiedNotes),
		followUp: update.followUp === undefined ? current.followUp : update.followUp,
	};
}
