import { callOllama, parseJsonFromModelContent } from '../../../services/ollama.service.js';
import type { GenerationInput } from '../../../types/types.js';
import { PANEL_COPY_PROMPT } from './instructions_panel_copy.js';

const MAX_PANEL_COPY_ATTEMPTS = 2;

// Wording limits. The panel is a narrow sidebar column, so anything longer than this
// wraps badly and pushes the fields the user is supposed to be reading off-screen.
// These are also the main defence against a model that ignores the "don't be creative"
// rule for field labels: a literal translation of "Age" is one short word, so an
// over-long field label is a reliable signal that it invented something thematic
// ("Years in service") and should be dropped back to the neutral English default.
const MAX_PHASE_LABEL = 28;
const MAX_PHASE_BLURB = 70;

// Field labels get a cap relative to the English default rather than a fixed one. A
// translation stays roughly as long as the term it translates ("Age" -> "Alder"), while
// an invented label balloons ("Age" -> "Years in service"). A fixed cap can't tell those
// apart, because a legitimate long label like "Training background" is itself 19
// characters. The floor keeps short words like "Age" from being unreasonably strict,
// and the multiplier leaves room for languages that compound.
function maxFieldLabelLength(defaultLabel: string): number {
	return Math.max(14, Math.round(defaultLabel.length * 1.6));
}

export type PanelPhaseCopy = {
	key: string;
	label: string;
	blurb: string;
	fields: { key: string; label: string }[];
};

// The canonical structure and the English wording used when a trainer has no generated
// copy (or when a generated piece fails validation). Keys mirror ownedFieldsForPhase in
// message/instructions/promptObject.ts — they are structural and never model-generated.
export const DEFAULT_PANEL_COPY: PanelPhaseCopy[] = [
	{
		key: 'basicInfo',
		label: 'Identification basics',
		blurb: 'Who you are and where you train',
		fields: [
			{ key: 'name', label: 'Name' },
			{ key: 'age', label: 'Age' },
			{ key: 'location', label: 'Location' },
		],
	},
	{
		key: 'motivationsAndGoals',
		label: 'Objectives',
		blurb: 'Why you train and what you are chasing',
		fields: [
			{ key: 'motivations', label: 'Motivations' },
			{ key: 'goals', label: 'Goals' },
		],
	},
	{
		key: 'backgroundAndMetrics',
		label: 'Background & metrics',
		blurb: 'Your history, numbers and injuries',
		fields: [
			{ key: 'trainingBackground', label: 'Training background' },
			{ key: 'performanceMetrics', label: 'Performance metrics' },
			{ key: 'injuries', label: 'Injuries' },
		],
	},
	{
		key: 'toolsAndTime',
		label: 'Tools & time',
		blurb: 'Equipment and the hours you can commit',
		fields: [{ key: 'equipmentAndSchedule', label: 'Equipment & schedule' }],
	},
];

// A generated string is only accepted if it is a non-empty single-line string within the
// length budget. Multi-clause text (commas, dashes, brackets) is rejected for field
// labels specifically, since a plain translation never needs them and their presence
// means the model started explaining or embellishing instead of naming the field.
function cleanString(value: unknown, maxLength: number): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.replace(/\s+/g, ' ').trim();
	if (trimmed.length === 0 || trimmed.length > maxLength) return undefined;
	return trimmed;
}

function cleanFieldLabel(value: unknown, defaultLabel: string): string | undefined {
	const cleaned = cleanString(value, maxFieldLabelLength(defaultLabel));
	if (!cleaned) return undefined;
	if (/[,;:—–(){}[\]]|\.\.\./.test(cleaned)) return undefined;
	// A plain field name doesn't gain words in translation. Allowing one extra word
	// over the English default leaves room for languages that need a joining word
	// ("Equipment & schedule" -> "Utstyr og timeplan") while still rejecting phrases
	// the model wrote instead of naming the field ("Operator designation code").
	const maxWords = Math.max(2, defaultLabel.split(/[\s&]+/).filter(Boolean).length + 1);
	if (cleaned.split(' ').length > maxWords) return undefined;
	return cleaned;
}

// Overlays whatever the model returned onto DEFAULT_PANEL_COPY. The default structure —
// not the model's output — drives the result, so the model can never add, drop or
// reorder a phase/field, and any individual piece that fails validation silently falls
// back to its English default rather than failing the whole panel.
export function applyGeneratedPanelCopy(parsed: unknown): PanelPhaseCopy[] {
	const phases = Array.isArray(parsed)
		? parsed
		: Array.isArray((parsed as { phases?: unknown })?.phases)
			? (parsed as { phases: unknown[] }).phases
			: [];

	const byKey = new Map<string, Record<string, unknown>>();
	for (const entry of phases) {
		if (entry && typeof entry === 'object' && typeof (entry as { key?: unknown }).key === 'string') {
			byKey.set((entry as { key: string }).key, entry as Record<string, unknown>);
		}
	}

	return DEFAULT_PANEL_COPY.map((defaultPhase) => {
		const generated = byKey.get(defaultPhase.key);
		const generatedFields = Array.isArray(generated?.fields) ? (generated!.fields as unknown[]) : [];
		const fieldByKey = new Map<string, Record<string, unknown>>();
		for (const field of generatedFields) {
			if (field && typeof field === 'object' && typeof (field as { key?: unknown }).key === 'string') {
				fieldByKey.set((field as { key: string }).key, field as Record<string, unknown>);
			}
		}

		return {
			key: defaultPhase.key,
			label: cleanString(generated?.label, MAX_PHASE_LABEL) ?? defaultPhase.label,
			blurb: cleanString(generated?.blurb, MAX_PHASE_BLURB) ?? defaultPhase.blurb,
			fields: defaultPhase.fields.map((defaultField) => ({
				key: defaultField.key,
				label: cleanFieldLabel(fieldByKey.get(defaultField.key)?.label, defaultField.label) ?? defaultField.label,
			})),
		};
	});
}

/**
 * Generates the trainer-voiced wording for the onboarding profile panel, once at
 * trainer-creation time. Like generateGreeting, the result is persisted and is NOT part
 * of the runtime phase loop.
 *
 * Returns undefined if generation fails, so the caller can store nothing and let the
 * UI use its built-in English defaults.
 */
export async function generatePanelCopy(input: GenerationInput): Promise<PanelPhaseCopy[] | undefined> {
	for (let attempt = 1; attempt <= MAX_PANEL_COPY_ATTEMPTS; attempt++) {
		try {
			const response = await callOllama({
				personality: input.personality,
				trainerName: input.trainerName,
				language: input.language,
				selectedSport: input.selectedSport,
				prompt: PANEL_COPY_PROMPT,
				userMessage: `Target language: ${input.language?.trim() || 'English'}\n\nStructure to reword:\n${JSON.stringify(
					{ phases: DEFAULT_PANEL_COPY },
					null,
					2
				)}`,
			});

			const parsed = parseJsonFromModelContent(response.content);
			return applyGeneratedPanelCopy(parsed);
		} catch (err) {
			console.log(`Panel copy generation attempt ${attempt}/${MAX_PANEL_COPY_ATTEMPTS} failed:`, err);
		}
	}

	return undefined;
}
