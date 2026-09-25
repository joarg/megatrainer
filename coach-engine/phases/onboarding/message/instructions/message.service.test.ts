import { describe, expect, test } from 'bun:test';
import { createEmptyUser } from '../../../../profile.js';
import { mergeProfiles } from './message.service.js';

describe('mergeProfiles', () => {
    test('rejects background inferred from selected sport during motivations and goals', () => {
        const current = {
            ...createEmptyUser(),
            name: 'Alex',
            age: 32,
            location: 'Bergen',
        };
        const assessment = {
            ...current,
            motivations: ['improve my health'],
            goals: ['run a 10K'],
            trainingBackground: ['running'],
            followUp: null,
        };

        const merged = mergeProfiles(assessment, current, 'motivationsAndGoals');

        expect(merged.motivations).toEqual(['improve my health']);
        expect(merged.goals).toEqual(['run a 10K']);
        // Still not written straight into trainingBackground — the guard holds.
        expect(merged.trainingBackground).toEqual([]);
        // But it is preserved as a note for the classifier to judge, rather than
        // being silently deleted. A bare echo of the selected sport gets dropped by
        // the classifier; a real sentence the user actually said gets routed.
        expect(merged.unclassifiedNotes).toEqual(['running']);
    });

    test('keeps genuine out-of-phase history volunteered during motivations and goals', () => {
        // Regression: a real user said "I used to run at school but stopped for years"
        // while the motivations phase was running. That is genuine evidence, and it
        // used to be discarded outright — leaving trainingBackground permanently empty
        // so onboarding could never finish. It must survive as a routable note.
        const current = {
            ...createEmptyUser(),
            name: 'Daniel',
            age: 29,
            location: 'Manchester',
        };
        const assessment = {
            ...current,
            motivations: ['stop feeling winded'],
            goals: ['run a half marathon'],
            trainingBackground: ['used to run at school but stopped completely for years'],
            followUp: null,
        };

        const merged = mergeProfiles(assessment, current, 'motivationsAndGoals');

        expect(merged.trainingBackground).toEqual([]);
        expect(merged.unclassifiedNotes).toEqual([
            'used to run at school but stopped completely for years',
        ]);
    });

    test('does not re-salvage an out-of-phase note already held in the profile', () => {
        // Every turn re-reads the full profile, so without this guard the same note
        // would be appended again on each subsequent turn and the note list would grow
        // without bound.
        const current = {
            ...createEmptyUser(),
            name: 'Daniel',
            unclassifiedNotes: ['used to run at school'],
            trainingBackground: ['used to run at school'],
        };
        const assessment = {
            ...current,
            trainingBackground: ['used to run at school'],
            followUp: null,
        };

        const merged = mergeProfiles(assessment, current, 'motivationsAndGoals');

        expect(merged.unclassifiedNotes).toEqual(['used to run at school']);
    });

    test('preserves out-of-phase user evidence for classifier routing', () => {
        const current = createEmptyUser();
        const assessment = {
            ...current,
            name: 'Joar',
            age: 38,
            unclassifiedNotes: [
                'my motivation is to work against injuries',
                'which I have a lot of',
            ],
            followUp: 'location',
        };

        const merged = mergeProfiles(assessment, current, 'basicInfo');

        expect(merged.name).toBe('Joar');
        expect(merged.age).toBe(38);
        expect(merged.motivations).toEqual([]);
        expect(merged.injuries).toEqual([]);
        expect(merged.unclassifiedNotes).toEqual([
            'my motivation is to work against injuries',
            'which I have a lot of',
        ]);
    });

});
