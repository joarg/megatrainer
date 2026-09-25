export type ProfileValue = unknown;
export type Profile = Record<string, ProfileValue> | null;

export type OnboardingField = {
	key: string;
	label: string;
	icon: string;
};

export type OnboardingPhase = {
	key: string;
	label: string;
	blurb: string;
	fields: OnboardingField[];
};

export type PanelCopy = {
	key: string;
	label: string;
	blurb: string;
	fields: { key: string; label: string }[];
}[];

export const PROFILE_PHASES: OnboardingPhase[] = [
	{
		key: 'basicInfo',
		label: 'Identification basics',
		blurb: 'Who you are and where you train',
		fields: [
			{ key: 'name', label: 'Name', icon: '🧍' },
			{ key: 'age', label: 'Age', icon: '📅' },
			{ key: 'location', label: 'Location', icon: '📍' },
		],
	},
	{
		key: 'motivationsAndGoals',
		label: 'Objectives',
		blurb: 'Why you train and what you are chasing',
		fields: [
			{ key: 'motivations', label: 'Motivations', icon: '🔥' },
			{ key: 'goals', label: 'Goals', icon: '🎯' },
		],
	},
	{
		key: 'backgroundAndMetrics',
		label: 'Background & metrics',
		blurb: 'Your history, numbers and injuries',
		fields: [
			{ key: 'trainingBackground', label: 'Training background', icon: '📓' },
			{ key: 'performanceMetrics', label: 'Performance metrics', icon: '📈' },
			{ key: 'injuries', label: 'Injuries', icon: '🩹' },
		],
	},
	{
		key: 'toolsAndTime',
		label: 'Tools & time',
		blurb: 'Equipment and the hours you can commit',
		fields: [{ key: 'equipmentAndSchedule', label: 'Equipment & schedule', icon: '🛠️' }],
	},
];

export function phasesWithCopy(copy: PanelCopy | null): OnboardingPhase[] {
	if (!copy || copy.length === 0) return PROFILE_PHASES;
	const byKey = new Map(copy.map((phase) => [phase.key, phase]));

	return PROFILE_PHASES.map((phase) => {
		const copyPhase = byKey.get(phase.key);
		if (!copyPhase) return phase;
		const fieldLabels = new Map((copyPhase.fields ?? []).map((field) => [field.key, field.label]));

		return {
			...phase,
			label: copyPhase.label?.trim() || phase.label,
			blurb: copyPhase.blurb?.trim() || phase.blurb,
			fields: phase.fields.map((field) => ({
				...field,
				label: fieldLabels.get(field.key)?.trim() || field.label,
			})),
		};
	});
}

export function isProfileValueFilled(value: ProfileValue): boolean {
	if (value === null || value === undefined) return false;
	if (Array.isArray(value)) return value.some((entry) => typeof entry !== 'string' || entry.trim().length > 0);
	if (typeof value === 'string') return value.trim().length > 0;
	return true;
}

export function requestedFields({
	profile,
	phase,
	complete,
	copy,
}: {
	profile: Profile;
	phase: string;
	complete: boolean;
	copy: PanelCopy | null;
}): OnboardingField[] {
	if (complete) return [];
	const currentPhase = phasesWithCopy(copy).find((candidate) => candidate.key === phase);
	if (!currentPhase) return [];
	return currentPhase.fields.filter((field) => !isProfileValueFilled(profile?.[field.key]));
}
