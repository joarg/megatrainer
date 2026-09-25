import { describe, expect, test } from 'bun:test';
import { applyGeneratedPanelCopy, DEFAULT_PANEL_COPY } from './panel_copy.js';

const keysOf = (copy: ReturnType<typeof applyGeneratedPanelCopy>) => copy.map((p) => p.key);

describe('applyGeneratedPanelCopy', () => {
	test('falls back to English defaults when generation produced nothing usable', () => {
		expect(applyGeneratedPanelCopy(null)).toEqual(DEFAULT_PANEL_COPY);
		expect(applyGeneratedPanelCopy({})).toEqual(DEFAULT_PANEL_COPY);
		expect(applyGeneratedPanelCopy('not json')).toEqual(DEFAULT_PANEL_COPY);
	});

	test('accepts a well-formed translation of both phase chrome and field labels', () => {
		const result = applyGeneratedPanelCopy({
			phases: [
				{
					key: 'basicInfo',
					label: 'Hvem er du',
					blurb: 'Litt om deg selv',
					fields: [
						{ key: 'name', label: 'Navn' },
						{ key: 'age', label: 'Alder' },
						{ key: 'location', label: 'Sted' },
					],
				},
			],
		});

		const basic = result[0];
		expect(basic.label).toBe('Hvem er du');
		expect(basic.blurb).toBe('Litt om deg selv');
		expect(basic.fields.map((f) => f.label)).toEqual(['Navn', 'Alder', 'Sted']);
	});

	test('structure is driven by the defaults, so the model cannot add, drop or reorder anything', () => {
		const result = applyGeneratedPanelCopy({
			phases: [
				{ key: 'toolsAndTime', label: 'Utstyr', blurb: 'Hva du har', fields: [] },
				{ key: 'somethingInvented', label: 'Extra phase', blurb: 'nope', fields: [] },
			],
		});

		expect(keysOf(result)).toEqual(keysOf(DEFAULT_PANEL_COPY));
		// The one phase it did return is still applied...
		expect(result[3].label).toBe('Utstyr');
		// ...and the phases it omitted keep their defaults rather than going blank.
		expect(result[0].label).toBe(DEFAULT_PANEL_COPY[0].label);
		// Field keys are structural even when the model returns no fields at all.
		expect(result[3].fields.map((f) => f.key)).toEqual(['equipmentAndSchedule']);
	});

	test('rejects creative field labels while keeping the phase chrome around them', () => {
		const result = applyGeneratedPanelCopy({
			phases: [
				{
					key: 'basicInfo',
					label: 'Mission intel',
					blurb: 'Baseline data, soldier',
					fields: [
						{ key: 'name', label: 'Operator designation' },
						{ key: 'age', label: 'Years in service' },
						{ key: 'location', label: 'Theatre of operations, current' },
					],
				},
			],
		});

		// Phase chrome is allowed to have personality.
		expect(result[0].label).toBe('Mission intel');
		expect(result[0].blurb).toBe('Baseline data, soldier');
		// Field labels that got embellished are dropped back to the neutral defaults:
		// "Operator designation" and "Theatre of operations, current" are too long /
		// multi-clause to be a plain translation of Name and Location.
		expect(result[0].fields[0].label).toBe('Name');
		expect(result[0].fields[2].label).toBe('Location');
	});

	test('keeps legitimate multi-word translations that are genuinely that long', () => {
		const result = applyGeneratedPanelCopy({
			phases: [
				{
					key: 'backgroundAndMetrics',
					label: 'Bakgrunn',
					blurb: 'Historikk og tall',
					fields: [
						{ key: 'trainingBackground', label: 'Treningsbakgrunn' },
						{ key: 'performanceMetrics', label: 'Prestasjonstall' },
						{ key: 'injuries', label: 'Skader' },
					],
				},
				{
					key: 'toolsAndTime',
					label: 'Verktøy og tid',
					blurb: 'Utstyr og tid',
					// Translating "Equipment & schedule" needs a joining word, so this must
					// survive even though it has more words than the two-word ideal.
					fields: [{ key: 'equipmentAndSchedule', label: 'Utstyr og timeplan' }],
				},
			],
		});

		expect(result[2].fields.map((f) => f.label)).toEqual([
			'Treningsbakgrunn',
			'Prestasjonstall',
			'Skader',
		]);
		expect(result[3].fields[0].label).toBe('Utstyr og timeplan');
	});

	test('rejects blank, non-string and over-long wording', () => {
		const result = applyGeneratedPanelCopy({
			phases: [
				{
					key: 'basicInfo',
					label: '   ',
					blurb: 'x'.repeat(200),
					fields: [
						{ key: 'name', label: 42 },
						{ key: 'age', label: '' },
					],
				},
			],
		});

		expect(result[0].label).toBe(DEFAULT_PANEL_COPY[0].label);
		expect(result[0].blurb).toBe(DEFAULT_PANEL_COPY[0].blurb);
		expect(result[0].fields[0].label).toBe('Name');
		expect(result[0].fields[1].label).toBe('Age');
	});

	test('accepts a bare array as well as a phases-wrapped object', () => {
		const result = applyGeneratedPanelCopy([
			{ key: 'basicInfo', label: 'Grunnlaget', blurb: 'Kort om deg', fields: [] },
		]);
		expect(result[0].label).toBe('Grunnlaget');
	});
});
