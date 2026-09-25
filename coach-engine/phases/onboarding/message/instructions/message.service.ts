import type { User } from '../../../../types/user.type.js';
import type { ONBOARDING_PHASES } from '../../../../types/types.js';
import { ownedFieldsForPhase } from './promptObject.js';

type OnboardingPhase = keyof typeof ONBOARDING_PHASES;

// Array fields an out-of-phase assessment can write into, and which the classifier
// knows how to route. Deliberately excludes the scalar basicInfo fields: those run
// first, so they never show up as out-of-scope, and a bare "Bergen" would be
// useless as a routed note.
const ROUTABLE_FIELDS = [
    'trainingBackground',
    'performanceMetrics',
    'injuries',
    'motivations',
    'goals',
    'equipmentAndSchedule',
] as const satisfies readonly (keyof User)[];

function appendUnique(existing: string[], assessed: string[]): string[] {
    const merged = [...existing];
    const seen = new Set(existing.map((item) => item.trim().toLowerCase()));

    for (const item of assessed) {
        const trimmed = item.trim();
        const key = trimmed.toLowerCase();
        if (trimmed && !seen.has(key)) {
            seen.add(key);
            merged.push(trimmed);
        }
    }

    return merged;
}

export function mergeProfiles(
    assessmentProfile: User,
    currentUserProfile: User,
    phase: OnboardingPhase,
): User {
    // Anything the assessment wrote into a field this phase does not own is DEMOTED to
    // unclassifiedNotes rather than dropped on the floor.
    //
    // This used to be a blanket discard, which silently threw away real user speech:
    // someone volunteering "I used to run at school but stopped for years" during the
    // motivations phase had that sentence deleted, and since they never repeat
    // themselves, trainingBackground stayed permanently empty — the trainer then
    // re-asked about it for the rest of the session and onboarding could not finish.
    // The discard existed to stop the model *fabricating* a background out of the
    // selected sport ("running"). Demoting instead of discarding keeps that guard:
    // invented noise becomes a note, and the classifier — which only ever sees real
    // user text — decides whether it deserves a field. Genuine statements get routed;
    // sport-name echoes get dropped.
    const owned = new Set<string>(ownedFieldsForPhase[phase]);
    const existingNotes = currentUserProfile.unclassifiedNotes;
    // appendUnique, not a plain concat: the assessment agent returns the FULL profile,
    // so assessmentProfile.unclassifiedNotes already contains the notes we are holding.
    // Concatenating would double every note on every turn.
    const salvagedNotes = appendUnique(existingNotes, assessmentProfile.unclassifiedNotes);
    for (const field of ROUTABLE_FIELDS) {
        if (owned.has(field)) continue;
        for (const item of assessmentProfile[field] ?? []) {
            const trimmed = (item ?? '').trim();
            if (!trimmed) continue;
            // Skip anything already held. Two cases: the value has already been routed
            // into its real field, or it is already a note that the classifier has not
            // ruled on yet. Without the second check the same sentence is re-appended
            // on every subsequent turn and the note list grows without bound.
            if (currentUserProfile[field].includes(trimmed)) continue;
            if (existingNotes.includes(trimmed)) continue;
            salvagedNotes.push(trimmed);
        }
    }

    const merged: User = {
        ...currentUserProfile,
        pendingQsAndComments: appendUnique(
            currentUserProfile.pendingQsAndComments,
            assessmentProfile.pendingQsAndComments,
        ),
        unclassifiedNotes: salvagedNotes,
        followUp: assessmentProfile.followUp,
    };

    switch (phase) {
        case 'basicInfo':
            return {
                ...merged,
                name: assessmentProfile.name ?? currentUserProfile.name,
                age: assessmentProfile.age ?? currentUserProfile.age,
                gender: assessmentProfile.gender ?? currentUserProfile.gender,
                genderNotes: assessmentProfile.genderNotes ?? currentUserProfile.genderNotes,
                location: assessmentProfile.location ?? currentUserProfile.location,
                country: assessmentProfile.country ?? currentUserProfile.country,
            };
        case 'motivationsAndGoals':
            return {
                ...merged,
                motivations: appendUnique(currentUserProfile.motivations, assessmentProfile.motivations),
                goals: appendUnique(currentUserProfile.goals, assessmentProfile.goals),
            };
        case 'backgroundAndMetrics':
            return {
                ...merged,
                trainingBackground: appendUnique(
                    currentUserProfile.trainingBackground,
                    assessmentProfile.trainingBackground,
                ),
                performanceMetrics: appendUnique(
                    currentUserProfile.performanceMetrics,
                    assessmentProfile.performanceMetrics,
                ),
                injuries: appendUnique(currentUserProfile.injuries, assessmentProfile.injuries),
            };
        case 'toolsAndTime':
            return {
                ...merged,
                equipmentAndSchedule: appendUnique(
                    currentUserProfile.equipmentAndSchedule,
                    assessmentProfile.equipmentAndSchedule,
                ),
            };
    }
}
