import { callOllama, parseJsonFromModelContent } from '../../../../services/ollama.service.js';
import type { OllamaInput } from '../../../../types/types.js';
import type { User } from '../../../../types/user.type.js';

const MAX_CLASSIFIER_ATTEMPTS = 2;

// Fields the classifier is allowed to write to. Kept in sync with ownedFieldsForPhase
// in promptObject.ts (every real phase-owned array field except the scalar basicInfo
// fields, which never show up as "out of scope" notes since basicInfo runs first).
export type ClassifierUpdate = Pick<
	User,
	'trainingBackground' | 'performanceMetrics' | 'injuries' | 'motivations' | 'goals' | 'equipmentAndSchedule'
>;

const CLASSIFIER_PROMPT = `You are a silent routing step in an onboarding pipeline. You never talk to the user and are never shown to them.

You receive:
1) a numbered list of "unclassified notes" — raw snippets of things the user said that an earlier step could not confidently place into one of its own fields
2) the accumulated user profile JSON, for context only (e.g. so you don't repeat something already captured)

Your ONLY job: for each note, decide which of these fields it genuinely belongs to, and return the NEW items that should be added there:
- trainingBackground: history/experience with the sport (e.g. "running for 3 years", "started training in 2022")
- performanceMetrics: concrete measurable numbers about current ability (pace, distance, time, PRs)
- injuries: physical injuries or limitations. "No"/"none"/"nothing" style statements about injuries count as real information — store them as ["none reported"], but only when the note itself actually says so.
- motivations: emotional/underlying reasons for training
- goals: concrete outcomes the user wants to achieve
- equipmentAndSchedule: equipment/facilities they have access to, or training time/days per week

CRITICAL RULES:
- Only use information that is ACTUALLY present in the notes you were given. Never invent, assume, or guess a value for a field the notes don't mention.
- If a note is too vague or ambiguous to confidently place anywhere, leave it out of every field entirely — do not force it into the closest-sounding one.
- A single note can contain multiple facts and belong to multiple fields. Extract every supported fact; do not choose only one destination for a compound note.
- Example: "My motivation is to work against injuries; I have a lot of injuries" must add a motivation about working against injuries AND an injury entry reporting multiple injuries. Do not invent the injury types.
- Every field in your response is a list of NEW items only (the caller merges these into the existing profile) — do not repeat items already present in the accumulated profile you were shown.
- Do not return name, age, gender, genderNotes, location, country, followUp, or pendingQsAndComments — leave those out of your response entirely.

Return ONLY a JSON object with exactly these keys (all string arrays, possibly empty):
{
  "trainingBackground": string[],
  "performanceMetrics": string[],
  "injuries": string[],
  "motivations": string[],
  "goals": string[],
  "equipmentAndSchedule": string[]
}`;

function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

// Routes accumulated unclassifiedNotes into their real profile fields. Returns undefined
// (instead of throwing) if every attempt fails, so the caller can leave the notes in
// place and simply retry on a later turn rather than losing them.
export async function classifyUnclassifiedNotes(
	notes: string[],
	currentProfile: User
): Promise<ClassifierUpdate | undefined> {
	if (notes.length === 0) return undefined;

	const input: OllamaInput = {
		personality: 'neutral and concise, output is JSON only',
		prompt: CLASSIFIER_PROMPT,
		userMessage: `Unclassified notes to route:\n${notes.map((note, i) => `${i + 1}. ${note}`).join('\n')}`,
		currentUserProfile: currentProfile,
	};

	for (let attempt = 1; attempt <= MAX_CLASSIFIER_ATTEMPTS; attempt++) {
		try {
			const message = await callOllama(input);
			const parsed = parseJsonFromModelContent(message.content);
			console.log('Response from unclassified-notes classifier:', message);
			return {
				trainingBackground: toStringArray(parsed.trainingBackground),
				performanceMetrics: toStringArray(parsed.performanceMetrics),
				injuries: toStringArray(parsed.injuries),
				motivations: toStringArray(parsed.motivations),
				goals: toStringArray(parsed.goals),
				equipmentAndSchedule: toStringArray(parsed.equipmentAndSchedule),
			};
		} catch (err) {
			console.log(`Unclassified-notes classifier attempt ${attempt}/${MAX_CLASSIFIER_ATTEMPTS} failed:`, err);
		}
	}

	return undefined;
}

function appendUnique(existing: string[], incoming: string[]): string[] {
	const merged = [...existing];
	for (const item of incoming) {
		if (item.trim().length > 0 && !merged.includes(item)) merged.push(item);
	}
	return merged;
}

// Applies a classifier result to a profile: unions each routed field, and clears
// unclassifiedNotes since they've now been consumed. If the classifier failed
// (update is undefined), the profile — and its unclassifiedNotes — are returned
// unchanged so the notes remain queued for another attempt on a later turn.
export function applyClassifierUpdate(profile: User, update: ClassifierUpdate | undefined): User {
	if (!update) return profile;

	return {
		...profile,
		trainingBackground: appendUnique(profile.trainingBackground, update.trainingBackground),
		performanceMetrics: appendUnique(profile.performanceMetrics, update.performanceMetrics),
		injuries: appendUnique(profile.injuries, update.injuries),
		motivations: appendUnique(profile.motivations, update.motivations),
		goals: appendUnique(profile.goals, update.goals),
		equipmentAndSchedule: appendUnique(profile.equipmentAndSchedule, update.equipmentAndSchedule),
		unclassifiedNotes: [],
	};
}
