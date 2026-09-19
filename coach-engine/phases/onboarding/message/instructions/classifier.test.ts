import { describe, expect, test } from 'bun:test';
import { createEmptyUser } from '../../../../profile.js';
import { applyClassifierUpdate } from './classifier.js';

describe('applyClassifierUpdate', () => {
	test('applies every supported fact extracted from a compound note', () => {
		const profile = {
			...createEmptyUser(),
			unclassifiedNotes: [
				'My motivation is to work against injuries; I have a lot of injuries.',
			],
		};

		const updated = applyClassifierUpdate(profile, {
			trainingBackground: [],
			performanceMetrics: [],
			injuries: ['reports having multiple injuries'],
			motivations: ['work against injuries'],
			goals: [],
			equipmentAndSchedule: [],
		});

		expect(updated.motivations).toEqual(['work against injuries']);
		expect(updated.injuries).toEqual(['reports having multiple injuries']);
		expect(updated.unclassifiedNotes).toEqual([]);
	});

	test('keeps notes queued when classification fails', () => {
		const profile = {
			...createEmptyUser(),
			unclassifiedNotes: ['I have recurring injuries.'],
		};

		expect(applyClassifierUpdate(profile, undefined).unclassifiedNotes).toEqual([
			'I have recurring injuries.',
		]);
	});
});
