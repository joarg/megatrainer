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
        expect(merged.trainingBackground).toEqual([]);
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
